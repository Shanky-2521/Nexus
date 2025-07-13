/**
 * Nexus Leaderboard - Data Models
 * 
 * This file defines the TypeScript interfaces and types for the leaderboard system.
 * These models correspond to the DynamoDB table structure and API contracts.
 */

// ============================================================================
// Core Data Models
// ============================================================================

/**
 * Represents a player's entry in a leaderboard
 */
export interface LeaderboardEntry {
  /** Partition Key: LEADERBOARD#<GameID>#<TimeFrame> */
  PK: string;
  
  /** Sort Key: USER#<UserID> */
  SK: string;
  
  /** User's unique identifier (duplicated for GSI access) */
  UserID: string;
  
  /** Player's score for this leaderboard */
  Score: number;
  
  /** Display name for the player */
  PlayerName: string;
  
  /** ISO timestamp when score was last updated */
  Timestamp: string;
  
  /** Additional game-specific metadata */
  Metadata?: {
    Level?: number;
    PlayTime?: number;
    Achievements?: string[];
    [key: string]: any;
  };
}

/**
 * Represents a player's ranking information
 */
export interface PlayerRank {
  UserID: string;
  PlayerName: string;
  Score: number;
  Rank: number;
  TotalPlayers: number;
  Percentile: number;
}

/**
 * Represents the context around a player's rank (players above and below)
 */
export interface PlayerContext {
  /** The target player's information */
  Player: PlayerRank;
  
  /** Players ranked above the target player */
  PlayersAbove: PlayerRank[];
  
  /** Players ranked below the target player */
  PlayersBelow: PlayerRank[];
}

// ============================================================================
// API Request/Response Models
// ============================================================================

/**
 * Request to submit a score
 */
export interface SubmitScoreRequest {
  GameID: string;
  UserID: string;
  PlayerName: string;
  Score: number;
  TimeFrame?: string; // defaults to current week
  Metadata?: Record<string, any>;
}

/**
 * Response from score submission
 */
export interface SubmitScoreResponse {
  Success: boolean;
  Message: string;
  NewRank?: number;
  PreviousScore?: number;
  ScoreImprovement?: number;
}

/**
 * Request to get top players
 */
export interface GetTopPlayersRequest {
  GameID: string;
  Count: number;
  TimeFrame?: string;
}

/**
 * Response with top players
 */
export interface GetTopPlayersResponse {
  GameID: string;
  TimeFrame: string;
  Players: PlayerRank[];
  TotalPlayers: number;
  LastUpdated: string;
}

/**
 * Request to get user's rank
 */
export interface GetUserRankRequest {
  GameID: string;
  UserID: string;
  TimeFrame?: string;
  ContextSize?: number; // number of players above/below to include
}

/**
 * Response with user's rank and context
 */
export interface GetUserRankResponse {
  GameID: string;
  TimeFrame: string;
  PlayerContext: PlayerContext;
}

/**
 * Request to get user's percentile
 */
export interface GetUserPercentileRequest {
  GameID: string;
  UserID: string;
  TimeFrame?: string;
}

/**
 * Response with user's percentile information
 */
export interface GetUserPercentileResponse {
  GameID: string;
  TimeFrame: string;
  UserID: string;
  PlayerName: string;
  Score: number;
  Percentile: number;
  Rank: number;
  TotalPlayers: number;
  PercentileBand: string; // e.g., "Top 1%", "Top 10%", "Top 50%"
}

// ============================================================================
// Utility Types and Enums
// ============================================================================

/**
 * Supported time frames for leaderboards
 */
export enum TimeFrame {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY', 
  MONTHLY = 'MONTHLY',
  ALL_TIME = 'ALL_TIME'
}

/**
 * DynamoDB key patterns
 */
export class KeyPatterns {
  static leaderboardPK(gameId: string, timeFrame: string): string {
    return `LEADERBOARD#${gameId}#${timeFrame}`;
  }
  
  static userSK(userId: string): string {
    return `USER#${userId}`;
  }
  
  static parseLeaderboardPK(pk: string): { gameId: string; timeFrame: string } | null {
    const match = pk.match(/^LEADERBOARD#(.+)#(.+)$/);
    if (!match) return null;
    return { gameId: match[1], timeFrame: match[2] };
  }
  
  static parseUserSK(sk: string): { userId: string } | null {
    const match = sk.match(/^USER#(.+)$/);
    if (!match) return null;
    return { userId: match[1] };
  }
}

/**
 * Time frame utilities
 */
export class TimeFrameUtils {
  static getCurrentWeek(): string {
    const now = new Date();
    const year = now.getFullYear();
    const week = this.getWeekNumber(now);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }
  
  static getCurrentDay(): string {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  }
  
  static getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }
  
  private static getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}

// ============================================================================
// Error Types
// ============================================================================

export class LeaderboardError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'LeaderboardError';
  }
}

export class ValidationError extends LeaderboardError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class NotFoundError extends LeaderboardError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
  }
}
