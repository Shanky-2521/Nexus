# Nexus Leaderboard - Deployment Guide

## Prerequisites

Before deploying the Nexus leaderboard system, ensure you have:

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured with valid credentials
3. **Node.js 18+** and npm installed
4. **DynamoDB table** created (LeaderboardService)

## Step 1: Install Dependencies

Install all required Node.js packages:

```bash
npm install
```

This will install:
- AWS SDK v3 for DynamoDB operations
- Serverless Framework for deployment
- TypeScript for type safety
- Development dependencies for testing

## Step 2: Configure Environment

The system uses environment variables for configuration:

- `LEADERBOARD_TABLE`: DynamoDB table name (default: LeaderboardService)
- `AWS_REGION`: AWS region (default: us-east-1)
- `STAGE`: Deployment stage (dev, staging, prod)

These are automatically configured by the Serverless Framework during deployment.

## Step 3: Deploy to AWS

Deploy the entire stack using the Serverless Framework:

```bash
# Deploy to development stage
npm run deploy:dev

# Deploy to production stage
npm run deploy:prod

# Deploy with custom stage
serverless deploy --stage staging
```

The deployment will create:
- Lambda functions for score ingestion and queries
- API Gateway endpoints with proper routing
- IAM roles with minimal required permissions
- CloudWatch logs for monitoring

## Step 4: Get API Gateway URL

After successful deployment, you'll see output similar to:

```
Service Information
service: nexus-leaderboard
stage: dev
region: us-east-1
stack: nexus-leaderboard-dev
resources: 12
api keys:
  None
endpoints:
  POST - https://abc123.execute-api.us-east-1.amazonaws.com/dev/leaderboard/{gameId}/score
  POST - https://abc123.execute-api.us-east-1.amazonaws.com/dev/score
  GET - https://abc123.execute-api.us-east-1.amazonaws.com/dev/leaderboard/{gameId}/top/{count}
  GET - https://abc123.execute-api.us-east-1.amazonaws.com/dev/leaderboard/{gameId}/user/{userId}/rank
  GET - https://abc123.execute-api.us-east-1.amazonaws.com/dev/leaderboard/{gameId}/user/{userId}/percentile
functions:
  submitScore: nexus-leaderboard-dev-submitScore
  submitScoreGeneric: nexus-leaderboard-dev-submitScoreGeneric
```

Copy the base URL (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com/dev`) for testing.

## Step 5: Test Score Submission

Use the provided test script to verify the deployment:

```bash
./scripts/test-score-submission.sh https://your-api-gateway-url.com/dev
```

This script will test:
- Score submission via both endpoint styles
- Score updates and validation
- Error handling for invalid requests
- Different time frame submissions

## API Endpoints

### Submit Score (Path Parameter Style)
```
POST /leaderboard/{gameId}/score
```

Request body:
```json
{
  "UserID": "player123",
  "PlayerName": "CyberNinja",
  "Score": 1500,
  "TimeFrame": "2025-W28",
  "Metadata": {
    "Level": 42,
    "PlayTime": 3600
  }
}
```

### Submit Score (Generic Style)
```
POST /score
```

Request body:
```json
{
  "GameID": "CyberClash",
  "UserID": "player123",
  "PlayerName": "CyberNinja",
  "Score": 1500,
  "TimeFrame": "2025-W28",
  "Metadata": {
    "Level": 42,
    "PlayTime": 3600
  }
}
```

### Response Format
```json
{
  "Success": true,
  "Message": "Score submitted successfully - new personal record!",
  "NewRank": 15,
  "PreviousScore": 1200,
  "ScoreImprovement": 300
}
```

## Monitoring and Debugging

### CloudWatch Logs
Each Lambda function creates its own log group:
- `/aws/lambda/nexus-leaderboard-dev-submitScore`
- `/aws/lambda/nexus-leaderboard-dev-submitScoreGeneric`

### DynamoDB Monitoring
Monitor table metrics in the AWS Console:
- Read/Write capacity consumption
- Item count and table size
- GSI performance metrics

### API Gateway Monitoring
Track API performance:
- Request count and latency
- Error rates by endpoint
- Integration latency with Lambda

## Troubleshooting

### Common Deployment Issues

1. **Permission Errors**
   - Ensure AWS credentials have sufficient permissions
   - Check IAM roles for Lambda execution

2. **DynamoDB Table Not Found**
   - Verify the LeaderboardService table exists
   - Check table name matches environment variable

3. **API Gateway 502 Errors**
   - Check Lambda function logs in CloudWatch
   - Verify function timeout settings

### Testing Issues

1. **CORS Errors**
   - API includes proper CORS headers
   - Use the correct HTTP methods (POST for submissions)

2. **Validation Errors**
   - Ensure all required fields are included
   - Check data types match the schema

3. **Score Not Updating**
   - Lower scores don't overwrite higher scores (by design)
   - Check the response message for confirmation

## Security Considerations

### API Security
- No authentication required for this demo
- In production, implement API keys or OAuth
- Consider rate limiting for high-traffic scenarios

### Data Validation
- All inputs are validated and sanitized
- Scores are rounded to integers
- String inputs are trimmed of whitespace

### Error Handling
- Sensitive error details are not exposed
- All errors are logged to CloudWatch
- Generic error messages for client responses

## Performance Optimization

### DynamoDB Optimization
- Uses single-table design for optimal performance
- Pay-per-request billing scales automatically
- GSIs provide efficient query patterns

### Lambda Optimization
- Functions use minimal memory allocation
- Cold start optimization with connection reuse
- Proper error handling prevents function crashes

### API Gateway Optimization
- Response caching can be enabled if needed
- Request validation reduces Lambda invocations
- Proper HTTP status codes for client optimization

## Next Steps

After successful deployment:
1. Implement the remaining query endpoints (top players, user rank, percentile)
2. Add authentication and authorization
3. Implement real-time notifications for rank changes
4. Add comprehensive monitoring and alerting
5. Consider implementing data archival for old leaderboards
