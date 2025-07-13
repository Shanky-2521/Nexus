# Nexus Leaderboard - DynamoDB Table Design

## Overview

The Nexus leaderboard system uses a single DynamoDB table with a sophisticated indexing strategy to support all required query patterns efficiently. This design follows DynamoDB best practices for single-table design and leverages Global Secondary Indexes (GSIs) to create multiple access patterns.

## Table Structure

### Primary Table: `LeaderboardService`

#### Primary Key Design

**Partition Key (PK)**: `LEADERBOARD#<GameID>#<TimeFrame>`
- **Purpose**: Isolates data for specific leaderboards
- **Examples**: 
  - `LEADERBOARD#CyberClash#2025-W28` (weekly leaderboard)
  - `LEADERBOARD#CyberClash#2025-07-13` (daily leaderboard)
  - `LEADERBOARD#CyberClash#ALL-TIME` (all-time leaderboard)

**Sort Key (SK)**: `USER#<UserID>`
- **Purpose**: Uniquely identifies each user within a leaderboard
- **Examples**: 
  - `USER#0a9f-4eb1`
  - `USER#player123`

#### Additional Attributes

- **Score** (Number): The user's score for this leaderboard
- **UserID** (String): The user's ID (duplicated for GSI access)
- **Timestamp** (String): When the score was last updated
- **PlayerName** (String): Display name for the player
- **Metadata** (Map): Additional game-specific data

## Global Secondary Indexes (GSIs)

### GSI 1: RankIndex
**Purpose**: Enable efficient top-N player queries sorted by score

**Key Schema**:
- **Partition Key**: `PK` (same as main table)
- **Sort Key**: `Score` (Number)

**Query Pattern**: Get top N players for a leaderboard
```
Query GSI1 where PK = "LEADERBOARD#CyberClash#2025-W28"
Order by Score DESC
Limit N
```

**Why this works**: 
- All players for a specific leaderboard are in the same partition
- Sorting by score as the sort key gives us natural ranking order
- Using `ScanIndexForward=false` returns highest scores first

### GSI 2: UserIndex
**Purpose**: Enable efficient user lookup across all leaderboards (inverted index)

**Key Schema**:
- **Partition Key**: `UserID` (String)
- **Sort Key**: `PK` (from main table)

**Query Pattern**: Find all leaderboards a user participates in
```
Query GSI2 where UserID = "player123"
```

**Why this works**:
- Quickly find all leaderboards for a specific user
- Enables "my rankings" and user profile features
- Supports cross-leaderboard analytics

## Query Patterns Supported

### 1. Submit Score
**Operation**: PutItem
**Key**: `PK = LEADERBOARD#<GameID>#<TimeFrame>`, `SK = USER#<UserID>`
**Complexity**: O(1)

### 2. Get Top N Players
**Operation**: Query on RankIndex GSI
**Key**: `PK = LEADERBOARD#<GameID>#<TimeFrame>`
**Sort**: By Score (descending)
**Complexity**: O(log N + N)

### 3. Get User's Rank
**Operation**: 
1. GetItem to get user's score
2. Query RankIndex with Score > user's score to count higher scores
**Complexity**: O(log R) where R is the user's rank

### 4. Get User's Context (players above/below)
**Operation**: Query RankIndex around user's score
**Complexity**: O(log N)

### 5. Get User's Percentile
**Operation**: 
1. GetItem to get user's score
2. Query RankIndex to count total players and players with higher scores
**Complexity**: O(log N)

### 6. Get All User's Leaderboards
**Operation**: Query on UserIndex GSI
**Key**: `UserID = <UserID>`
**Complexity**: O(log L) where L is number of leaderboards user is on

## Time-Based Leaderboard Strategy

The partition key format `LEADERBOARD#<GameID>#<TimeFrame>` enables multiple time-based leaderboards:

- **Daily**: `LEADERBOARD#CyberClash#2025-07-13`
- **Weekly**: `LEADERBOARD#CyberClash#2025-W28`
- **Monthly**: `LEADERBOARD#CyberClash#2025-07`
- **All-Time**: `LEADERBOARD#CyberClash#ALL-TIME`

Each timeframe creates a separate partition, allowing:
- Independent scaling per timeframe
- Efficient queries within each timeframe
- Easy archival of old leaderboards

## Billing and Performance Considerations

### Pay-Per-Request Billing
- No need to provision capacity
- Automatically scales with demand
- Cost-effective for variable workloads

### Hot Partition Mitigation
- Time-based partitioning distributes load
- Multiple games create natural distribution
- GSIs provide alternative access patterns

### Write Patterns
- Score updates are idempotent (can safely retry)
- Each user update affects only one item
- No cross-partition transactions needed

## Example Data Items

```json
{
  "PK": "LEADERBOARD#CyberClash#2025-W28",
  "SK": "USER#player123",
  "UserID": "player123",
  "Score": 15750,
  "PlayerName": "CyberNinja",
  "Timestamp": "2025-07-13T10:30:00Z",
  "Metadata": {
    "Level": 42,
    "PlayTime": 3600
  }
}
```

This design provides the foundation for a highly scalable, cost-effective leaderboard system that can handle millions of users and high-velocity score updates while maintaining sub-millisecond query performance.
