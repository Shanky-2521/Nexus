/**
 * Get Top Players Lambda Handler
 * 
 * This handler retrieves the top N players for a specific leaderboard
 * using the RankIndex GSI for efficient score-based queries.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../services/dynamodb';
import { GetTopPlayersResponse, PlayerRank, ValidationError } from '../models/leaderboard';
import { createSuccessResponse, createErrorResponse, getPathParameter, getQueryParameter, parseNumberParameter } from '../utils/response';

const dynamoService = new DynamoDBService();

/**
 * Validates the request parameters for getting top players
 */
function validateRequest(event: APIGatewayProxyEvent): {
  gameId: string;
  count: number;
  timeFrame?: string;
} {
  // Extract and validate path parameters
  const gameId = getPathParameter(event.pathParameters, 'gameId', true);
  const countParam = getPathParameter(event.pathParameters, 'count', true);

  if (!gameId || !countParam) {
    throw new ValidationError('GameID and count path parameters are required');
  }

  // Validate and parse count parameter
  const count = parseNumberParameter(countParam, 'count', 1, 100);

  // Extract optional timeFrame from query parameters
  const timeFrame = getQueryParameter(event.queryStringParameters, 'timeFrame');

  return {
    gameId: gameId.trim(),
    count,
    timeFrame: timeFrame?.trim()
  };
}

/**
 * Converts DynamoDB leaderboard entries to ranked player objects
 */
function convertToPlayerRanks(entries: any[], startRank: number = 1): PlayerRank[] {
  return entries.map((entry, index) => ({
    UserID: entry.UserID,
    PlayerName: entry.PlayerName,
    Score: entry.Score,
    Rank: startRank + index,
    TotalPlayers: 0, // Will be set later if needed
    Percentile: 0    // Will be calculated later if needed
  }));
}

/**
 * Main Lambda handler for getting top players
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Get top players request received:', JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({ message: 'CORS preflight successful' });
    }

    // Validate request parameters
    const { gameId, count, timeFrame } = validateRequest(event);

    console.log(`Fetching top ${count} players for game: ${gameId}, timeFrame: ${timeFrame || 'current week'}`);

    // Get top players from DynamoDB
    const topPlayersEntries = await dynamoService.getTopPlayers(gameId, count, timeFrame);

    if (topPlayersEntries.length === 0) {
      console.log('No players found for the specified leaderboard');
      const response: GetTopPlayersResponse = {
        GameID: gameId,
        TimeFrame: timeFrame || 'current week',
        Players: [],
        TotalPlayers: 0,
        LastUpdated: new Date().toISOString()
      };
      return createSuccessResponse(response);
    }

    // Convert to ranked player objects
    const rankedPlayers = convertToPlayerRanks(topPlayersEntries);

    // Get total player count for this leaderboard
    let totalPlayers = 0;
    try {
      const totalCount = await dynamoService.getTotalPlayerCount(gameId, timeFrame);
      totalPlayers = totalCount;
      
      // Update total players count in each player object
      rankedPlayers.forEach(player => {
        player.TotalPlayers = totalPlayers;
        // Calculate percentile (rank 1 = top percentile)
        player.Percentile = Math.round((1 - (player.Rank - 1) / totalPlayers) * 100);
      });
    } catch (countError) {
      console.warn('Could not fetch total player count:', countError);
      // Continue without total count - not critical for basic functionality
    }

    const response: GetTopPlayersResponse = {
      GameID: gameId,
      TimeFrame: timeFrame || 'current week',
      Players: rankedPlayers,
      TotalPlayers: totalPlayers,
      LastUpdated: new Date().toISOString()
    };

    console.log(`Successfully retrieved ${rankedPlayers.length} top players`);
    return createSuccessResponse(response);

  } catch (error) {
    console.error('Error getting top players:', error);

    if (error instanceof ValidationError) {
      return createErrorResponse(error.message, 400, 'VALIDATION_ERROR');
    }

    // Generic error response for unexpected errors
    return createErrorResponse(
      'Internal server error occurred while retrieving top players',
      500,
      'INTERNAL_ERROR'
    );
  }
};

/**
 * Alternative handler that supports flexible count parameter
 * Supports: GET /leaderboard/{gameId}/top?count=N
 */
export const handlerWithQueryCount = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract gameId from path parameters
    const gameId = getPathParameter(event.pathParameters, 'gameId', true);
    if (!gameId) {
      return createErrorResponse('GameID path parameter is required', 400, 'MISSING_PARAMETER');
    }

    // Get count from query parameters (default to 10)
    const countParam = getQueryParameter(event.queryStringParameters, 'count', '10');
    const count = parseNumberParameter(countParam, 'count', 1, 100);

    // Create modified event with count in path parameters
    const modifiedEvent = {
      ...event,
      pathParameters: {
        ...event.pathParameters,
        gameId,
        count: count.toString()
      }
    };

    return await handler(modifiedEvent);
  } catch (error) {
    console.error('Error in query count handler:', error);
    return createErrorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
};

/**
 * Handler for getting leaderboard with time frame in path
 * Supports: GET /leaderboard/{gameId}/{timeFrame}/top/{count}
 */
export const handlerWithTimeFrame = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract parameters from path
    const gameId = getPathParameter(event.pathParameters, 'gameId', true);
    const timeFrame = getPathParameter(event.pathParameters, 'timeFrame', true);
    const countParam = getPathParameter(event.pathParameters, 'count', true);

    if (!gameId || !timeFrame || !countParam) {
      return createErrorResponse('GameID, timeFrame, and count path parameters are required', 400, 'MISSING_PARAMETER');
    }

    const count = parseNumberParameter(countParam, 'count', 1, 100);

    // Create modified event with timeFrame in query parameters
    const modifiedEvent = {
      ...event,
      pathParameters: {
        ...event.pathParameters,
        gameId,
        count: count.toString()
      },
      queryStringParameters: {
        ...event.queryStringParameters,
        timeFrame
      }
    };

    return await handler(modifiedEvent);
  } catch (error) {
    console.error('Error in time frame handler:', error);
    return createErrorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
};
