/**
 * Get User Scores Lambda Handler
 * 
 * This handler demonstrates the power of the UserIndex GSI by retrieving
 * all leaderboard entries for a specific user across all games and time frames.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBService } from '../services/dynamodb';
import { ValidationError, KeyPatterns } from '../models/leaderboard';
import { createSuccessResponse, createErrorResponse, getPathParameter, getQueryParameter } from '../utils/response';

const dynamoService = new DynamoDBService();

/**
 * Validates the request parameters for getting user scores
 */
function validateRequest(event: APIGatewayProxyEvent): {
  userId: string;
  gameId?: string;
  timeFrame?: string;
} {
  // Extract and validate path parameters
  const userId = getPathParameter(event.pathParameters, 'userId', true);

  if (!userId) {
    throw new ValidationError('UserID path parameter is required');
  }

  // Extract optional filters from query parameters
  const gameId = getQueryParameter(event.queryStringParameters, 'gameId');
  const timeFrame = getQueryParameter(event.queryStringParameters, 'timeFrame');

  return {
    userId: userId.trim(),
    gameId: gameId?.trim(),
    timeFrame: timeFrame?.trim()
  };
}

/**
 * Enriches leaderboard entries with rank and percentile information
 */
async function enrichLeaderboardEntry(entry: any): Promise<any> {
  try {
    // Parse the PK to extract game and timeframe
    const parsed = KeyPatterns.parseLeaderboardPK(entry.PK);
    if (!parsed) {
      console.warn('Could not parse leaderboard PK:', entry.PK);
      return {
        ...entry,
        GameID: 'Unknown',
        TimeFrame: 'Unknown',
        Rank: 0,
        TotalPlayers: 0,
        Percentile: 0
      };
    }

    // Get rank information for this leaderboard
    const rankInfo = await dynamoService.getUserRank(
      parsed.gameId,
      entry.UserID,
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
      Metadata: entry.Metadata || {}
    };
  } catch (error) {
    console.warn('Error enriching leaderboard entry:', error);
    return {
      ...entry,
      GameID: 'Error',
      TimeFrame: 'Error',
      Rank: 0,
      TotalPlayers: 0,
      Percentile: 0
    };
  }
}

/**
 * Filters leaderboard entries based on query parameters
 */
function filterLeaderboards(leaderboards: any[], gameId?: string, timeFrame?: string): any[] {
  return leaderboards.filter(entry => {
    if (gameId && entry.GameID !== gameId) {
      return false;
    }
    if (timeFrame && entry.TimeFrame !== timeFrame) {
      return false;
    }
    return true;
  });
}

/**
 * Groups leaderboards by game for better organization
 */
function groupLeaderboardsByGame(leaderboards: any[]): Record<string, any[]> {
  return leaderboards.reduce((groups, entry) => {
    const gameId = entry.GameID;
    if (!groups[gameId]) {
      groups[gameId] = [];
    }
    groups[gameId].push(entry);
    return groups;
  }, {} as Record<string, any[]>);
}

/**
 * Main Lambda handler for getting all user scores
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Get user scores request received:', JSON.stringify(event, null, 2));

  try {
    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return createSuccessResponse({ message: 'CORS preflight successful' });
    }

    // Validate request parameters
    const { userId, gameId, timeFrame } = validateRequest(event);

    console.log(`Getting all scores for user: ${userId}, filters - game: ${gameId || 'all'}, timeFrame: ${timeFrame || 'all'}`);

    // Get all leaderboards for the user using UserIndex GSI
    const userLeaderboards = await dynamoService.getUserLeaderboards(userId);
    
    if (userLeaderboards.length === 0) {
      return createErrorResponse(
        `User ${userId} not found in any leaderboards`,
        404,
        'USER_NOT_FOUND'
      );
    }

    console.log(`Found ${userLeaderboards.length} leaderboard entries for user ${userId}`);

    // Enrich each leaderboard entry with rank and percentile information
    const enrichedLeaderboards = await Promise.all(
      userLeaderboards.map(enrichLeaderboardEntry)
    );

    // Apply filters if specified
    const filteredLeaderboards = filterLeaderboards(enrichedLeaderboards, gameId, timeFrame);

    if (filteredLeaderboards.length === 0) {
      return createErrorResponse(
        `No leaderboard entries found for user ${userId} with the specified filters`,
        404,
        'NO_RESULTS'
      );
    }

    // Group by game for better organization
    const groupedByGame = groupLeaderboardsByGame(filteredLeaderboards);

    // Calculate summary statistics
    const totalGames = Object.keys(groupedByGame).length;
    const totalLeaderboards = filteredLeaderboards.length;
    const averageRank = filteredLeaderboards.reduce((sum, entry) => sum + entry.Rank, 0) / totalLeaderboards;
    const averagePercentile = filteredLeaderboards.reduce((sum, entry) => sum + entry.Percentile, 0) / totalLeaderboards;
    const bestRank = Math.min(...filteredLeaderboards.map(entry => entry.Rank));
    const bestPercentile = Math.max(...filteredLeaderboards.map(entry => entry.Percentile));

    const response = {
      UserID: userId,
      Summary: {
        TotalGames: totalGames,
        TotalLeaderboards: totalLeaderboards,
        AverageRank: Math.round(averageRank),
        AveragePercentile: Math.round(averagePercentile),
        BestRank: bestRank,
        BestPercentile: bestPercentile
      },
      LeaderboardsByGame: groupedByGame,
      AllLeaderboards: filteredLeaderboards,
      Filters: {
        GameID: gameId || null,
        TimeFrame: timeFrame || null
      },
      LastUpdated: new Date().toISOString()
    };

    console.log(`Successfully retrieved ${totalLeaderboards} leaderboard entries across ${totalGames} games for user ${userId}`);
    return createSuccessResponse(response);

  } catch (error) {
    console.error('Error processing user scores request:', error);

    if (error instanceof ValidationError) {
      return createErrorResponse(error.message, 400, 'VALIDATION_ERROR');
    }

    // Generic error response for unexpected errors
    return createErrorResponse(
      'Internal server error occurred while retrieving user scores',
      500,
      'INTERNAL_ERROR'
    );
  }
};

/**
 * Handler for getting user's best scores across all games
 * Supports: GET /user/{userId}/best-scores
 */
export const handlerBestScores = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getPathParameter(event.pathParameters, 'userId', true);
    if (!userId) {
      return createErrorResponse('UserID path parameter is required', 400, 'MISSING_PARAMETER');
    }

    // Get all user leaderboards
    const userLeaderboards = await dynamoService.getUserLeaderboards(userId);
    
    if (userLeaderboards.length === 0) {
      return createErrorResponse(`User ${userId} not found in any leaderboards`, 404, 'USER_NOT_FOUND');
    }

    // Enrich and find best scores per game
    const enrichedLeaderboards = await Promise.all(
      userLeaderboards.map(enrichLeaderboardEntry)
    );

    // Group by game and find best score for each
    const bestScoresByGame = enrichedLeaderboards.reduce((best, entry) => {
      const gameId = entry.GameID;
      if (!best[gameId] || entry.Score > best[gameId].Score) {
        best[gameId] = entry;
      }
      return best;
    }, {} as Record<string, any>);

    const response = {
      UserID: userId,
      BestScores: Object.values(bestScoresByGame),
      TotalGames: Object.keys(bestScoresByGame).length,
      LastUpdated: new Date().toISOString()
    };

    return createSuccessResponse(response);
  } catch (error) {
    console.error('Error in best scores handler:', error);
    return createErrorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
};
