/**
 * DynamoDB Service Layer
 * 
 * This service handles all DynamoDB operations for the leaderboard system.
 * It provides a clean abstraction over the AWS SDK and implements the
 * single-table design patterns.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  GetCommand, 
  QueryCommand,
  UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import { LeaderboardEntry, KeyPatterns, TimeFrameUtils } from '../models/leaderboard';

export class DynamoDBService {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
    
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = process.env.LEADERBOARD_TABLE || 'LeaderboardService';
  }

  /**
   * Submit or update a player's score for a specific leaderboard
   */
  async submitScore(
    gameId: string,
    userId: string,
    playerName: string,
    score: number,
    timeFrame?: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; previousScore?: number; isNewRecord: boolean }> {
    try {
      // Default to current week if no timeframe specified
      const leaderboardTimeFrame = timeFrame || TimeFrameUtils.getCurrentWeek();
      
      const pk = KeyPatterns.leaderboardPK(gameId, leaderboardTimeFrame);
      const sk = KeyPatterns.userSK(userId);

      // First, check if user already has a score
      const existingItem = await this.getUserScore(gameId, userId, leaderboardTimeFrame);
      const previousScore = existingItem?.Score;
      const isNewRecord = !previousScore || score > previousScore;

      // Only update if this is a new record or first submission
      if (isNewRecord) {
        const item: LeaderboardEntry = {
          PK: pk,
          SK: sk,
          UserID: userId,
          Score: score,
          PlayerName: playerName,
          Timestamp: new Date().toISOString(),
          Metadata: metadata
        };

        await this.client.send(new PutCommand({
          TableName: this.tableName,
          Item: item
        }));

        return { success: true, previousScore, isNewRecord: true };
      }

      return { success: true, previousScore, isNewRecord: false };
    } catch (error) {
      console.error('Error submitting score:', error);
      throw new Error('Failed to submit score');
    }
  }

  /**
   * Get a specific user's score for a leaderboard
   */
  async getUserScore(
    gameId: string, 
    userId: string, 
    timeFrame?: string
  ): Promise<LeaderboardEntry | null> {
    try {
      const leaderboardTimeFrame = timeFrame || TimeFrameUtils.getCurrentWeek();
      const pk = KeyPatterns.leaderboardPK(gameId, leaderboardTimeFrame);
      const sk = KeyPatterns.userSK(userId);

      const result = await this.client.send(new GetCommand({
        TableName: this.tableName,
        Key: { PK: pk, SK: sk }
      }));

      return result.Item as LeaderboardEntry || null;
    } catch (error) {
      console.error('Error getting user score:', error);
      return null;
    }
  }

  /**
   * Get top N players for a leaderboard using the RankIndex GSI
   */
  async getTopPlayers(
    gameId: string,
    count: number = 10,
    timeFrame?: string
  ): Promise<LeaderboardEntry[]> {
    try {
      const leaderboardTimeFrame = timeFrame || TimeFrameUtils.getCurrentWeek();
      const pk = KeyPatterns.leaderboardPK(gameId, leaderboardTimeFrame);

      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'RankIndex',
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': pk
        },
        ScanIndexForward: false, // Sort by score descending (highest first)
        Limit: count
      }));

      return result.Items as LeaderboardEntry[] || [];
    } catch (error) {
      console.error('Error getting top players:', error);
      throw new Error('Failed to get top players');
    }
  }

  /**
   * Get all leaderboards a user participates in using the UserIndex GSI
   */
  async getUserLeaderboards(userId: string): Promise<LeaderboardEntry[]> {
    try {
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'UserIndex',
        KeyConditionExpression: 'UserID = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      }));

      return result.Items as LeaderboardEntry[] || [];
    } catch (error) {
      console.error('Error getting user leaderboards:', error);
      throw new Error('Failed to get user leaderboards');
    }
  }

  /**
   * Get user's rank by counting players with higher scores
   */
  async getUserRank(
    gameId: string,
    userId: string,
    timeFrame?: string
  ): Promise<{ rank: number; totalPlayers: number; userScore: number } | null> {
    try {
      const leaderboardTimeFrame = timeFrame || TimeFrameUtils.getCurrentWeek();
      const pk = KeyPatterns.leaderboardPK(gameId, leaderboardTimeFrame);

      // First get the user's score
      const userEntry = await this.getUserScore(gameId, userId, leaderboardTimeFrame);
      if (!userEntry) {
        return null;
      }

      // Count players with higher scores
      const higherScoresResult = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'RankIndex',
        KeyConditionExpression: 'PK = :pk AND Score > :userScore',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':userScore': userEntry.Score
        },
        Select: 'COUNT'
      }));

      // Count total players
      const totalPlayersResult = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'RankIndex',
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': pk
        },
        Select: 'COUNT'
      }));

      const rank = (higherScoresResult.Count || 0) + 1;
      const totalPlayers = totalPlayersResult.Count || 0;

      return {
        rank,
        totalPlayers,
        userScore: userEntry.Score
      };
    } catch (error) {
      console.error('Error getting user rank:', error);
      throw new Error('Failed to get user rank');
    }
  }

  /**
   * Get total number of players in a leaderboard
   */
  async getTotalPlayerCount(gameId: string, timeFrame?: string): Promise<number> {
    try {
      const leaderboardTimeFrame = timeFrame || TimeFrameUtils.getCurrentWeek();
      const pk = KeyPatterns.leaderboardPK(gameId, leaderboardTimeFrame);

      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'RankIndex',
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': pk
        },
        Select: 'COUNT'
      }));

      return result.Count || 0;
    } catch (error) {
      console.error('Error getting total player count:', error);
      throw new Error('Failed to get total player count');
    }
  }

  /**
   * Get players around a specific rank (for context queries)
   */
  async getPlayersAroundRank(
    gameId: string,
    targetRank: number,
    contextSize: number = 5,
    timeFrame?: string
  ): Promise<LeaderboardEntry[]> {
    try {
      const leaderboardTimeFrame = timeFrame || TimeFrameUtils.getCurrentWeek();
      const pk = KeyPatterns.leaderboardPK(gameId, leaderboardTimeFrame);

      // Calculate the range to fetch
      const startRank = Math.max(1, targetRank - contextSize);
      const endRank = targetRank + contextSize;
      const limit = endRank - startRank + 1;

      // Get players starting from the calculated position
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'RankIndex',
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': pk
        },
        ScanIndexForward: false, // Sort by score descending
        Limit: limit,
        // Note: DynamoDB doesn't support OFFSET, so we'll need to implement
        // pagination logic if we need to skip to a specific rank
      }));

      return result.Items as LeaderboardEntry[] || [];
    } catch (error) {
      console.error('Error getting players around rank:', error);
      throw new Error('Failed to get players around rank');
    }
  }

  /**
   * Get players around a specific user's rank (for context queries)
   */
  async getPlayersAroundUserRank(
    gameId: string,
    userId: string,
    contextSize: number = 5,
    timeFrame?: string
  ): Promise<LeaderboardEntry[]> {
    try {
      const leaderboardTimeFrame = timeFrame || TimeFrameUtils.getCurrentWeek();
      const pk = KeyPatterns.leaderboardPK(gameId, leaderboardTimeFrame);

      // First get the user's score to determine the range
      const userEntry = await this.getUserScore(gameId, userId, leaderboardTimeFrame);
      if (!userEntry) {
        return [];
      }

      // Get players with scores around the user's score
      // We'll get players with higher scores and lower scores
      const higherScoresResult = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'RankIndex',
        KeyConditionExpression: 'PK = :pk AND Score >= :userScore',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':userScore': userEntry.Score
        },
        ScanIndexForward: false, // Sort by score descending
        Limit: contextSize + 1 // +1 to include the user
      }));

      const lowerScoresResult = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'RankIndex',
        KeyConditionExpression: 'PK = :pk AND Score < :userScore',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':userScore': userEntry.Score
        },
        ScanIndexForward: false, // Sort by score descending
        Limit: contextSize
      }));

      // Combine and sort all results
      const allPlayers = [
        ...(higherScoresResult.Items as LeaderboardEntry[] || []),
        ...(lowerScoresResult.Items as LeaderboardEntry[] || [])
      ];

      // Sort by score descending and remove duplicates
      const uniquePlayers = allPlayers
        .filter((player, index, self) =>
          index === self.findIndex(p => p.UserID === player.UserID)
        )
        .sort((a, b) => b.Score - a.Score);

      return uniquePlayers;
    } catch (error) {
      console.error('Error getting players around user rank:', error);
      throw new Error('Failed to get players around user rank');
    }
  }
}
