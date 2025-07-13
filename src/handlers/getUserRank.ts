/**
 * Get User Rank Lambda Handler
 * 
 * This handler retrieves a user's rank and surrounding players for a specific leaderboard,
 * or all leaderboards the user participates in using the UserIndex GSI.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../services/dynamodb';
import { GetUserRankResponse, PlayerContext, PlayerRank, ValidationError, KeyPatterns } from '../models/leaderboard';
import { createSuccessResponse, createErrorResponse, getPathParameter, getQueryParameter, parseNumberParameter } from '../utils/response';

const dynamoService = new DynamoDBService();

/**
 * Validates the request parameters for getting user rank
 */
function validateRequest(event: APIGatewayProxyEvent): {
  gameId?: string;
  userId: string;
  timeFrame?: string;
  contextSize: number;
} {
  // Extract and validate path parameters
  const userId = getPathParameter(event.pathParameters, 'userId', true);
  const gameId = getPathParameter(event.pathParameters, 'gameId', false);

  if (!userId) {
    throw new ValidationError('UserID path parameter is required');
  }

  // Extract optional parameters from query string
  const timeFrame = getQueryParameter(event.queryStringParameters, 'timeFrame');
  const contextSizeParam = getQueryParameter(event.queryStringParameters, 'contextSize', '5');
  const contextSize = parseNumberParameter(contextSizeParam, 'contextSize', 0, 20);

  return {
    gameId: gameId?.trim(),
    userId: userId.trim(),
    timeFrame: timeFrame?.trim(),
    contextSize
  };
}

/**
 * Get user's rank and context for a specific leaderboard
 */
async function getUserRankForLeaderboard(
  gameId: string,
  userId: string,
  timeFrame?: string,
  contextSize: number = 5
): Promise<GetUserRankResponse | null> {
  try {
    // Get user's rank information
    const rankInfo = await dynamoService.getUserRank(gameId, userId, timeFrame);
    if (!rankInfo) {
      return null;
    }

    // Get surrounding players for context
    const surroundingPlayers = await dynamoService.getPlayersAroundUserRank(
      gameId,
      userId,
      contextSize,
      timeFrame
    );

    // Find the target user in the surrounding players
    const userIndex = surroundingPlayers.findIndex(player => player.UserID === userId);
    const targetPlayer: PlayerRank = {
      UserID: userId,
      PlayerName: surroundingPlayers[userIndex]?.PlayerName || 'Unknown',
      Score: rankInfo.userScore,
      Rank: rankInfo.rank,
      TotalPlayers: rankInfo.totalPlayers,
      Percentile: Math.round((1 - (rankInfo.rank - 1) / rankInfo.totalPlayers) * 100)
    };

    // Split surrounding players into above and below
    const playersAbove = surroundingPlayers
      .slice(0, userIndex)
      .map((player, index) => ({
        UserID: player.UserID,
        PlayerName: player.PlayerName,
        Score: player.Score,
        Rank: rankInfo.rank - (userIndex - index),
        TotalPlayers: rankInfo.totalPlayers,
        Percentile: Math.round((1 - (rankInfo.rank - (userIndex - index) - 1) / rankInfo.totalPlayers) * 100)
      }));

    const playersBelow = surroundingPlayers
      .slice(userIndex + 1)
      .map((player, index) => ({
        UserID: player.UserID,
        PlayerName: player.PlayerName,
        Score: player.Score,
        Rank: rankInfo.rank + index + 1,
        TotalPlayers: rankInfo.totalPlayers,
        Percentile: Math.round((1 - (rankInfo.rank + index) / rankInfo.totalPlayers) * 100)
      }));

    const playerContext: PlayerContext = {
      Player: targetPlayer,
      PlayersAbove: playersAbove,
      PlayersBelow: playersBelow
    };

    return {
      GameID: gameId,
      TimeFrame: timeFrame || 'current week',
      PlayerContext: playerContext
    };
  } catch (error) {
    console.error('Error getting user rank for leaderboard:', error);
    throw error;
  }
}

/**
 * Get all leaderboards a user participates in
 */
async function getAllUserLeaderboards(userId: string): Promise<any[]> {
  try {
    const userLeaderboards = await dynamoService.getUserLeaderboards(userId);
    
    // Process each leaderboard entry to include rank information
    const enrichedLeaderboards = await Promise.all(
      userLeaderboards.map(async (entry) => {
        try {
          // Parse the PK to extract game and timeframe
          const parsed = KeyPatterns.parseLeaderboardPK(entry.PK);
          if (!parsed) {
            console.warn('Could not parse leaderboard PK:', entry.PK);
            return entry;
          }

          // Get rank information for this leaderboard
          const rankInfo = await dynamoService.getUserRank(
            parsed.gameId,
            userId,
            parsed.timeFrame
          );

          return {
            GameID: parsed.gameId,
            TimeFrame: parsed.timeFrame,
            UserID: entry.UserID,
            PlayerName: entry.PlayerName,
            Score: entry.Score,
            Rank: rankInfo?.rank || 0,
            TotalPlayers: rankInfo?.totalPlayers || 0,
            Percentile: rankInfo ? Math.round((1 - (rankInfo.rank - 1) / rankInfo.totalPlayers) * 100) : 0,
            LastUpdated: entry.Timestamp,
            Metadata: entry.Metadata
          };
        } catch (error) {
          console.warn('Error enriching leaderboard entry:', error);
          return entry;
        }
      })
    );

    return enrichedLeaderboards;
  } catch (error) {
    console.error('Error getting all user leaderboards:', error);
    throw error;
  }
}

/**
 * Main Lambda handler for getting user rank
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Get user rank request received:', JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({ message: 'CORS preflight successful' });
    }

    // Validate request parameters
    const { gameId, userId, timeFrame, contextSize } = validateRequest(event);

    console.log(`Getting rank for user: ${userId}, game: ${gameId || 'all'}, timeFrame: ${timeFrame || 'current week'}`);

    if (gameId) {
      // Get rank for specific leaderboard
      const userRank = await getUserRankForLeaderboard(gameId, userId, timeFrame, contextSize);
      
      if (!userRank) {
        return createErrorResponse(
          `User ${userId} not found in leaderboard for game ${gameId}`,
          404,
          'USER_NOT_FOUND'
        );
      }

      console.log(`Successfully retrieved rank for user ${userId} in game ${gameId}`);
      return createSuccessResponse(userRank);
    } else {
      // Get all leaderboards for user
      const allLeaderboards = await getAllUserLeaderboards(userId);
      
      if (allLeaderboards.length === 0) {
        return createErrorResponse(
          `User ${userId} not found in any leaderboards`,
          404,
          'USER_NOT_FOUND'
        );
      }

      const response = {
        UserID: userId,
        Leaderboards: allLeaderboards,
        TotalLeaderboards: allLeaderboards.length,
        LastUpdated: new Date().toISOString()
      };

      console.log(`Successfully retrieved ${allLeaderboards.length} leaderboards for user ${userId}`);
      return createSuccessResponse(response);
    }

  } catch (error) {
    console.error('Error processing user rank request:', error);

    if (error instanceof ValidationError) {
      return createErrorResponse(error.message, 400, 'VALIDATION_ERROR');
    }

    // Generic error response for unexpected errors
    return createErrorResponse(
      'Internal server error occurred while retrieving user rank',
      500,
      'INTERNAL_ERROR'
    );
  }
};
