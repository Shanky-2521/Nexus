# Nexus Leaderboard - API Documentation

## Overview

The Nexus Leaderboard API provides endpoints for managing and querying real-time game leaderboards. The API is built on AWS serverless architecture and supports high-throughput operations with sub-millisecond response times.

## Base URL

```
https://your-api-id.execute-api.region.amazonaws.com/stage
```

Replace `your-api-id`, `region`, and `stage` with your actual API Gateway deployment values.

## Authentication

Currently, the API does not require authentication. In production environments, consider implementing API keys, OAuth, or other authentication mechanisms.

## Common Response Format

All API responses include proper HTTP status codes and JSON payloads with consistent error handling.

### Success Response
```json
{
  "data": "response_data_here",
  "timestamp": "2025-07-13T10:30:00Z"
}
```

### Error Response
```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "timestamp": "2025-07-13T10:30:00Z"
}
```

## Endpoints

### 1. Submit Score

Submit a player's score to a leaderboard.

#### Path Parameter Style
```
POST /leaderboard/{gameId}/score
```

**Path Parameters:**
- `gameId` (string, required): Unique identifier for the game

**Request Body:**
```json
{
  "UserID": "string",
  "PlayerName": "string", 
  "Score": number,
  "TimeFrame": "string (optional)",
  "Metadata": "object (optional)"
}
```

#### Generic Style
```
POST /score
```

**Request Body:**
```json
{
  "GameID": "string",
  "UserID": "string",
  "PlayerName": "string",
  "Score": number,
  "TimeFrame": "string (optional)",
  "Metadata": "object (optional)"
}
```

**Response:**
```json
{
  "Success": true,
  "Message": "Score submitted successfully - new personal record!",
  "NewRank": 15,
  "PreviousScore": 1200,
  "ScoreImprovement": 300
}
```

**Example:**
```bash
curl -X POST "https://api.example.com/dev/leaderboard/CyberClash/score" \
  -H "Content-Type: application/json" \
  -d '{
    "UserID": "player123",
    "PlayerName": "CyberNinja",
    "Score": 1500,
    "Metadata": {
      "Level": 42,
      "PlayTime": 3600
    }
  }'
```

### 2. Get Top Players

Retrieve the top N players for a leaderboard, sorted by score in descending order.

#### Standard Path Style
```
GET /leaderboard/{gameId}/top/{count}
```

**Path Parameters:**
- `gameId` (string, required): Unique identifier for the game
- `count` (number, required): Number of top players to retrieve (1-100)

**Query Parameters:**
- `timeFrame` (string, optional): Specific time frame for the leaderboard

#### Query Parameter Style
```
GET /leaderboard/{gameId}/top?count={count}&timeFrame={timeFrame}
```

**Path Parameters:**
- `gameId` (string, required): Unique identifier for the game

**Query Parameters:**
- `count` (number, optional): Number of top players to retrieve (default: 10, max: 100)
- `timeFrame` (string, optional): Specific time frame for the leaderboard

#### Time Frame in Path Style
```
GET /leaderboard/{gameId}/{timeFrame}/top/{count}
```

**Path Parameters:**
- `gameId` (string, required): Unique identifier for the game
- `timeFrame` (string, required): Specific time frame for the leaderboard
- `count` (number, required): Number of top players to retrieve (1-100)

**Response:**
```json
{
  "GameID": "CyberClash",
  "TimeFrame": "2025-W28",
  "Players": [
    {
      "UserID": "player001",
      "PlayerName": "AlphaGamer",
      "Score": 5000,
      "Rank": 1,
      "TotalPlayers": 150,
      "Percentile": 99
    },
    {
      "UserID": "player002", 
      "PlayerName": "BetaWarrior",
      "Score": 4500,
      "Rank": 2,
      "TotalPlayers": 150,
      "Percentile": 98
    }
  ],
  "TotalPlayers": 150,
  "LastUpdated": "2025-07-13T10:30:00Z"
}
```

**Examples:**
```bash
# Get top 10 players
curl "https://api.example.com/dev/leaderboard/CyberClash/top/10"

# Get top 5 players with query parameter
curl "https://api.example.com/dev/leaderboard/CyberClash/top?count=5"

# Get top 10 players for specific time frame
curl "https://api.example.com/dev/leaderboard/CyberClash/top/10?timeFrame=2025-07-13"

# Get top 5 players with time frame in path
curl "https://api.example.com/dev/leaderboard/CyberClash/2025-07-13/top/5"
```

### 3. Get User Rank

Retrieve a specific user's rank and surrounding players for a leaderboard.

#### Specific Leaderboard
```
GET /leaderboard/{gameId}/user/{userId}/rank
```

**Path Parameters:**
- `gameId` (string, required): Unique identifier for the game
- `userId` (string, required): Unique identifier for the user

**Query Parameters:**
- `timeFrame` (string, optional): Specific time frame for the leaderboard
- `contextSize` (number, optional): Number of players above/below to include (default: 5, max: 20)

**Response:**
```json
{
  "GameID": "CyberClash",
  "TimeFrame": "2025-W28",
  "PlayerContext": {
    "Player": {
      "UserID": "player123",
      "PlayerName": "CyberNinja",
      "Score": 2500,
      "Rank": 15,
      "TotalPlayers": 150,
      "Percentile": 90
    },
    "PlayersAbove": [
      {
        "UserID": "player001",
        "PlayerName": "TopPlayer",
        "Score": 2600,
        "Rank": 14,
        "TotalPlayers": 150,
        "Percentile": 91
      }
    ],
    "PlayersBelow": [
      {
        "UserID": "player456",
        "PlayerName": "NextPlayer",
        "Score": 2400,
        "Rank": 16,
        "TotalPlayers": 150,
        "Percentile": 89
      }
    ]
  }
}
```

#### All Leaderboards (UserIndex GSI Demo)
```
GET /user/{userId}/rank
```

**Path Parameters:**
- `userId` (string, required): Unique identifier for the user

**Response:**
```json
{
  "UserID": "player123",
  "Leaderboards": [
    {
      "GameID": "CyberClash",
      "TimeFrame": "2025-W28",
      "Score": 2500,
      "Rank": 15,
      "TotalPlayers": 150,
      "Percentile": 90
    }
  ],
  "TotalLeaderboards": 3,
  "LastUpdated": "2025-07-13T10:30:00Z"
}
```

### 4. Get User Percentile

Calculate and retrieve a user's percentile ranking.

#### Specific Leaderboard
```
GET /leaderboard/{gameId}/user/{userId}/percentile
```

**Path Parameters:**
- `gameId` (string, required): Unique identifier for the game
- `userId` (string, required): Unique identifier for the user

**Query Parameters:**
- `timeFrame` (string, optional): Specific time frame for the leaderboard

**Response:**
```json
{
  "GameID": "CyberClash",
  "TimeFrame": "2025-W28",
  "UserID": "player123",
  "PlayerName": "CyberNinja",
  "Score": 2500,
  "Percentile": 90,
  "Rank": 15,
  "TotalPlayers": 150,
  "PercentileBand": "Top 10%"
}
```

#### Multiple Time Frames
```
GET /user/{userId}/percentile?gameId={gameId}&timeFrames=weekly,monthly,all-time
```

**Path Parameters:**
- `userId` (string, required): Unique identifier for the user

**Query Parameters:**
- `gameId` (string, required): Unique identifier for the game
- `timeFrames` (string, optional): Comma-separated list of time frames

### 5. Get User Scores (UserIndex GSI)

Retrieve all scores for a user across all leaderboards. This endpoint demonstrates the power of the UserIndex GSI for efficient cross-leaderboard queries.

```
GET /user/{userId}/scores
```

**Path Parameters:**
- `userId` (string, required): Unique identifier for the user

**Query Parameters:**
- `gameId` (string, optional): Filter by specific game
- `timeFrame` (string, optional): Filter by specific time frame

**Response:**
```json
{
  "UserID": "player123",
  "Summary": {
    "TotalGames": 3,
    "TotalLeaderboards": 5,
    "AverageRank": 12,
    "AveragePercentile": 88,
    "BestRank": 5,
    "BestPercentile": 95
  },
  "LeaderboardsByGame": {
    "CyberClash": [
      {
        "GameID": "CyberClash",
        "TimeFrame": "2025-W28",
        "Score": 2500,
        "Rank": 15,
        "Percentile": 90
      }
    ]
  },
  "AllLeaderboards": [...],
  "LastUpdated": "2025-07-13T10:30:00Z"
}
```

### 6. Get User Best Scores

Retrieve a user's best score for each game they play.

```
GET /user/{userId}/best-scores
```

**Path Parameters:**
- `userId` (string, required): Unique identifier for the user

**Response:**
```json
{
  "UserID": "player123",
  "BestScores": [
    {
      "GameID": "CyberClash",
      "TimeFrame": "2025-07-13",
      "Score": 3000,
      "Rank": 5,
      "Percentile": 95
    }
  ],
  "TotalGames": 3,
  "LastUpdated": "2025-07-13T10:30:00Z"
}
```

## Time Frame Formats

The API supports various time frame formats for organizing leaderboards:

- **Weekly**: `2025-W28` (ISO week format)
- **Daily**: `2025-07-13` (ISO date format)
- **Monthly**: `2025-07` (Year-Month format)
- **All-time**: `ALL-TIME` (special keyword)

If no time frame is specified, the current week is used by default.

## Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | VALIDATION_ERROR | Invalid request parameters or body |
| 400 | MISSING_PARAMETER | Required parameter is missing |
| 404 | NOT_FOUND | Requested resource not found |
| 500 | INTERNAL_ERROR | Internal server error |

## Rate Limiting

Currently, no rate limiting is implemented. In production, consider implementing appropriate rate limits based on your usage patterns.

## CORS Support

All endpoints include proper CORS headers to support web applications:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

## Data Validation

### Score Submission
- `GameID`: Required, non-empty string
- `UserID`: Required, non-empty string  
- `PlayerName`: Required, non-empty string
- `Score`: Required, non-negative number (rounded to integer)
- `TimeFrame`: Optional, valid time frame format
- `Metadata`: Optional, valid JSON object

### Top Players Query
- `gameId`: Required, non-empty string
- `count`: Required, integer between 1 and 100
- `timeFrame`: Optional, valid time frame format

## Performance Characteristics

- **Score Submission**: O(1) write operation with automatic ranking
- **Top Players Query**: O(log N + K) where K is the requested count
- **Response Time**: Sub-millisecond for most operations
- **Throughput**: Scales automatically with DynamoDB pay-per-request

## Best Practices

1. **Batch Operations**: For bulk score submissions, consider implementing batch endpoints
2. **Caching**: Implement client-side caching for frequently accessed leaderboards
3. **Error Handling**: Always check HTTP status codes and handle errors gracefully
4. **Time Frames**: Use consistent time frame formats across your application
5. **Monitoring**: Monitor API usage and performance through CloudWatch metrics
