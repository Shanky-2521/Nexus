/**
 * Get User Percentile Lambda Handler
 * 
 * This handler calculates and returns a user's percentile ranking
 * for a specific leaderboard or across all leaderboards.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../services/dynamodb';
import { GetUserPercentileResponse, ValidationError } from '../models/leaderboard';
import { createSuccessResponse, createErrorResponse, getPathParameter, getQueryParameter } from '../utils/response';

const dynamoService = new DynamoDBService();

/**
 * Validates the request parameters for getting user percentile
 */
function validateRequest(event: APIGatewayProxyEvent): {
  gameId: string;
  userId: string;
  timeFrame?: string;
} {
  // Extract and validate path parameters
  const gameId = getPathParameter(event.pathParameters, 'gameId', true);
  const userId = getPathParameter(event.pathParameters, 'userId', true);

  if (!gameId || !userId) {
    throw new ValidationError('GameID and UserID path parameters are required');
  }

  // Extract optional timeFrame from query parameters
  const timeFrame = getQueryParameter(event.queryStringParameters, 'timeFrame');

  return {
    gameId: gameId.trim(),
    userId: userId.trim(),
    timeFrame: timeFrame?.trim()
  };
}

/**
 * Determines the percentile band description
 */
function getPercentileBand(percentile: number): string {
  if (percentile >= 99) return 'Top 1%';
  if (percentile >= 95) return 'Top 5%';
  if (percentile >= 90) return 'Top 10%';
  if (percentile >= 75) return 'Top 25%';
  if (percentile >= 50) return 'Top 50%';
  if (percentile >= 25) return 'Bottom 75%';
  if (percentile >= 10) return 'Bottom 90%';
  if (percentile >= 5) return 'Bottom 95%';
  return 'Bottom 99%';
}

/**
 * Main Lambda handler for getting user percentile
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Get user percentile request received:', JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({ message: 'CORS preflight successful' });
    }

    // Validate request parameters
    const { gameId, userId, timeFrame } = validateRequest(event);

    console.log(`Getting percentile for user: ${userId}, game: ${gameId}, timeFrame: ${timeFrame || 'current week'}`);

    // Get user's rank information
    const rankInfo = await dynamoService.getUserRank(gameId, userId, timeFrame);
    
    if (!rankInfo) {
      return createErrorResponse(
        `User ${userId} not found in leaderboard for game ${gameId}`,
        404,
        'USER_NOT_FOUND'
      );
    }

    // Get user's basic information
    const userEntry = await dynamoService.getUserScore(gameId, userId, timeFrame);
    if (!userEntry) {
      return createErrorResponse(
        `User ${userId} not found in leaderboard for game ${gameId}`,
        404,
        'USER_NOT_FOUND'
      );
    }

    // Calculate percentile (higher rank = lower percentile)
    const percentile = Math.round((1 - (rankInfo.rank - 1) / rankInfo.totalPlayers) * 100);
    const percentileBand = getPercentileBand(percentile);

    const response: GetUserPercentileResponse = {
      GameID: gameId,
      TimeFrame: timeFrame || 'current week',
      UserID: userId,
      PlayerName: userEntry.PlayerName,
      Score: rankInfo.userScore,
      Percentile: percentile,
      Rank: rankInfo.rank,
      TotalPlayers: rankInfo.totalPlayers,
      PercentileBand: percentileBand
    };

    console.log(`Successfully calculated percentile for user ${userId}: ${percentile}% (${percentileBand})`);
    return createSuccessResponse(response);

  } catch (error) {
    console.error('Error processing user percentile request:', error);

    if (error instanceof ValidationError) {
      return createErrorResponse(error.message, 400, 'VALIDATION_ERROR');
    }

    // Generic error response for unexpected errors
    return createErrorResponse(
      'Internal server error occurred while calculating user percentile',
      500,
      'INTERNAL_ERROR'
    );
  }
};

/**
 * Handler for getting percentile across multiple time frames
 * Supports: GET /user/{userId}/percentile?gameId={gameId}&timeFrames=weekly,monthly,all-time
 */
export const handlerMultiTimeFrame = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract parameters
    const userId = getPathParameter(event.pathParameters, 'userId', true);
    const gameId = getQueryParameter(event.queryStringParameters, 'gameId');
    const timeFramesParam = getQueryParameter(event.queryStringParameters, 'timeFrames', 'current');

    if (!userId || !gameId) {
      return createErrorResponse('UserID and gameId parameters are required', 400, 'MISSING_PARAMETER');
    }

    // Parse time frames
    const timeFrames = timeFramesParam.split(',').map(tf => tf.trim());
    
    // Get percentile for each time frame
    const percentileResults = await Promise.all(
      timeFrames.map(async (timeFrame) => {
        try {
          const rankInfo = await dynamoService.getUserRank(gameId, userId, timeFrame === 'current' ? undefined : timeFrame);
          const userEntry = await dynamoService.getUserScore(gameId, userId, timeFrame === 'current' ? undefined : timeFrame);
          
          if (!rankInfo || !userEntry) {
            return {
              TimeFrame: timeFrame,
              Found: false,
              Error: 'User not found in this leaderboard'
            };
          }

          const percentile = Math.round((1 - (rankInfo.rank - 1) / rankInfo.totalPlayers) * 100);
          
          return {
            TimeFrame: timeFrame,
            Found: true,
            Score: rankInfo.userScore,
            Rank: rankInfo.rank,
            TotalPlayers: rankInfo.totalPlayers,
            Percentile: percentile,
            PercentileBand: getPercentileBand(percentile)
          };
        } catch (error) {
          return {
            TimeFrame: timeFrame,
            Found: false,
            Error: 'Error retrieving data for this time frame'
          };
        }
      })
    );

    const response = {
      GameID: gameId,
      UserID: userId,
      TimeFrames: percentileResults,
      LastUpdated: new Date().toISOString()
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Error in multi-timeframe percentile handler:', error);
    return createErrorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
};
