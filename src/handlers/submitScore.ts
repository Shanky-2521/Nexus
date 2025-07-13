/**
 * Submit Score Lambda Handler
 * 
 * This handler processes score submission requests and stores them in DynamoDB.
 * It supports high-throughput score ingestion with proper validation and error handling.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../services/dynamodb';
import { SubmitScoreRequest, SubmitScoreResponse, ValidationError } from '../models/leaderboard';

const dynamoService = new DynamoDBService();

/**
 * Validates the incoming score submission request
 */
function validateRequest(body: any): SubmitScoreRequest {
  if (!body) {
    throw new ValidationError('Request body is required');
  }

  const { GameID, UserID, PlayerName, Score, TimeFrame, Metadata } = body;

  // Required fields validation
  if (!GameID || typeof GameID !== 'string') {
    throw new ValidationError('GameID is required and must be a string');
  }

  if (!UserID || typeof UserID !== 'string') {
    throw new ValidationError('UserID is required and must be a string');
  }

  if (!PlayerName || typeof PlayerName !== 'string') {
    throw new ValidationError('PlayerName is required and must be a string');
  }

  if (Score === undefined || Score === null || typeof Score !== 'number') {
    throw new ValidationError('Score is required and must be a number');
  }

  if (Score < 0) {
    throw new ValidationError('Score must be non-negative');
  }

  // Optional fields validation
  if (TimeFrame && typeof TimeFrame !== 'string') {
    throw new ValidationError('TimeFrame must be a string if provided');
  }

  if (Metadata && typeof Metadata !== 'object') {
    throw new ValidationError('Metadata must be an object if provided');
  }

  // Sanitize inputs
  return {
    GameID: GameID.trim(),
    UserID: UserID.trim(),
    PlayerName: PlayerName.trim(),
    Score: Math.round(Score), // Ensure integer scores
    TimeFrame: TimeFrame?.trim(),
    Metadata
  };
}

/**
 * Creates a standardized API response
 */
function createResponse(
  statusCode: number, 
  body: SubmitScoreResponse | { error: string }
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

/**
 * Main Lambda handler for score submission
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Score submission request received:', JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createResponse(200, { Success: true, Message: 'CORS preflight' } as SubmitScoreResponse);
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return createResponse(400, { error: 'Invalid JSON in request body' });
    }

    const validatedRequest = validateRequest(requestBody);

    // Submit score to DynamoDB
    const result = await dynamoService.submitScore(
      validatedRequest.GameID,
      validatedRequest.UserID,
      validatedRequest.PlayerName,
      validatedRequest.Score,
      validatedRequest.TimeFrame,
      validatedRequest.Metadata
    );

    // Calculate score improvement
    const scoreImprovement = result.previousScore 
      ? validatedRequest.Score - result.previousScore 
      : validatedRequest.Score;

    // Get user's new rank if this was a record
    let newRank: number | undefined;
    if (result.isNewRecord) {
      try {
        const rankInfo = await dynamoService.getUserRank(
          validatedRequest.GameID,
          validatedRequest.UserID,
          validatedRequest.TimeFrame
        );
        newRank = rankInfo?.rank;
      } catch (rankError) {
        console.warn('Could not fetch new rank:', rankError);
        // Don't fail the request if rank calculation fails
      }
    }

    const response: SubmitScoreResponse = {
      Success: true,
      Message: result.isNewRecord 
        ? 'Score submitted successfully - new personal record!'
        : 'Score received but did not improve previous record',
      NewRank: newRank,
      PreviousScore: result.previousScore,
      ScoreImprovement: result.isNewRecord ? scoreImprovement : 0
    };

    console.log('Score submission successful:', response);
    return createResponse(200, response);

  } catch (error) {
    console.error('Error processing score submission:', error);

    if (error instanceof ValidationError) {
      return createResponse(400, { error: error.message });
    }

    // Generic error response for unexpected errors
    return createResponse(500, { 
      error: 'Internal server error occurred while processing score submission' 
    });
  }
};

/**
 * Alternative handler for path parameter style requests
 * Supports: POST /leaderboard/{gameId}/score
 */
export const handlerWithPathParams = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract gameId from path parameters
    const gameId = event.pathParameters?.gameId;
    if (!gameId) {
      return createResponse(400, { error: 'GameID path parameter is required' });
    }

    // Parse request body and add gameId
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
      requestBody.GameID = gameId; // Override with path parameter
    } catch (parseError) {
      return createResponse(400, { error: 'Invalid JSON in request body' });
    }

    // Create new event with modified body
    const modifiedEvent = {
      ...event,
      body: JSON.stringify(requestBody)
    };

    return await handler(modifiedEvent);
  } catch (error) {
    console.error('Error in path parameter handler:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};
