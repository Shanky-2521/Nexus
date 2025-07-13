# Nexus Leaderboard - Local Development Setup

## Prerequisites Installation

### 1. Install Node.js and npm

**Option A: Using Homebrew (Recommended for macOS)**
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js (includes npm)
brew install node

# Verify installation
node --version
npm --version
```

**Option B: Using Node Version Manager (nvm)**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or source the profile
source ~/.bashrc

# Install and use Node.js 18
nvm install 18
nvm use 18
nvm alias default 18
```

**Option C: Direct Download**
- Visit https://nodejs.org/
- Download the LTS version for your operating system
- Follow the installation wizard

### 2. Install AWS CLI (if not already done)

```bash
# Using pip3 (already done in this project)
pip3 install awscli

# Or using Homebrew
brew install awscli

# Verify installation
aws --version
```

### 3. Configure AWS Credentials

```bash
# Configure AWS CLI with your credentials
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1
```

## Project Setup

### 1. Install Project Dependencies

```bash
# Install all dependencies
npm install

# Or if you prefer yarn
yarn install
```

### 2. Install Serverless Framework Globally

```bash
# Install serverless globally for easier CLI access
npm install -g serverless

# Verify installation
serverless --version
```

### 3. Create DynamoDB Table

```bash
# Run the table creation script
./scripts/create-dynamodb-table.sh

# Verify table creation
./scripts/verify-table.sh
```

## Development Workflow

### 1. Local Development

```bash
# Start local development server
npm run local

# This starts serverless-offline for local testing
# API will be available at http://localhost:3000
```

### 2. Testing Locally

```bash
# Test score submission locally
curl -X POST http://localhost:3000/dev/score \
  -H "Content-Type: application/json" \
  -d '{
    "GameID": "CyberClash",
    "UserID": "player123",
    "PlayerName": "TestPlayer",
    "Score": 1500
  }'
```

### 3. Deploy to AWS

```bash
# Deploy to development stage
npm run deploy:dev

# Deploy to production stage
npm run deploy:prod

# Deploy with custom configuration
serverless deploy --stage staging --region us-west-2
```

### 4. Test Deployed API

```bash
# Get the API Gateway URL from deployment output
# Then run the test script
./scripts/test-score-submission.sh https://your-api-url.com/dev
```

## Development Tools

### TypeScript Compilation

```bash
# Compile TypeScript (handled automatically by serverless)
npx tsc

# Watch mode for development
npx tsc --watch
```

### Code Linting

```bash
# Run ESLint
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

### Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Environment Configuration

### Environment Variables

Create a `.env` file for local development:

```bash
# .env file (do not commit to git)
AWS_REGION=us-east-1
LEADERBOARD_TABLE=LeaderboardService
STAGE=dev
```

### Serverless Configuration

The `serverless.yml` file handles environment configuration:

```yaml
provider:
  environment:
    LEADERBOARD_TABLE: ${self:custom.leaderboardTable}
    STAGE: ${self:provider.stage}
```

## Debugging

### Local Debugging

```bash
# Enable debug logging
export SLS_DEBUG=*

# Run with verbose output
serverless deploy --verbose

# Check function logs
serverless logs -f submitScore --tail
```

### AWS Debugging

```bash
# View CloudWatch logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/nexus-leaderboard"

# Stream logs in real-time
aws logs tail /aws/lambda/nexus-leaderboard-dev-submitScore --follow
```

### DynamoDB Debugging

```bash
# List table items (for testing)
aws dynamodb scan --table-name LeaderboardService --max-items 10

# Get specific item
aws dynamodb get-item \
  --table-name LeaderboardService \
  --key '{"PK":{"S":"LEADERBOARD#CyberClash#2025-W28"},"SK":{"S":"USER#player123"}}'
```

## Common Issues and Solutions

### 1. Node.js Not Found
```bash
# Check if Node.js is in PATH
echo $PATH

# Add Node.js to PATH (if installed via nvm)
export PATH="$HOME/.nvm/versions/node/v18.x.x/bin:$PATH"
```

### 2. AWS Credentials Issues
```bash
# Check current credentials
aws sts get-caller-identity

# Reset credentials
aws configure
```

### 3. DynamoDB Permission Errors
```bash
# Check IAM permissions
aws iam get-user

# Ensure user has DynamoDB permissions:
# - dynamodb:PutItem
# - dynamodb:GetItem
# - dynamodb:Query
# - dynamodb:Scan
```

### 4. Serverless Deployment Errors
```bash
# Clear serverless cache
serverless remove

# Redeploy from scratch
serverless deploy
```

## Project Structure

```
nexus/
├── src/
│   ├── handlers/          # Lambda function handlers
│   │   └── submitScore.ts # Score submission handler
│   ├── models/           # TypeScript interfaces
│   │   └── leaderboard.ts # Data models
│   ├── services/         # Business logic
│   │   └── dynamodb.ts   # DynamoDB operations
│   └── utils/            # Utility functions
│       └── response.ts   # API response helpers
├── scripts/              # Setup and test scripts
├── docs/                 # Documentation
├── package.json          # Node.js dependencies
├── serverless.yml        # Serverless configuration
└── tsconfig.json         # TypeScript configuration
```

## Next Steps

1. Complete the local development setup
2. Deploy the score submission API
3. Test the endpoints thoroughly
4. Implement the remaining query endpoints
5. Add comprehensive error handling and monitoring
