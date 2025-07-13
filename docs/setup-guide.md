# Nexus Leaderboard - Setup Guide

## Prerequisites

1. **AWS Account**: You need an active AWS account
2. **AWS CLI**: Already installed in this project
3. **AWS Credentials**: You'll need to configure your AWS access keys

## Step 1: Configure AWS Credentials

You have several options to configure AWS credentials:

### Option A: Using AWS Configure (Recommended for Development)
```bash
aws configure
```

You'll be prompted to enter:
- **AWS Access Key ID**: Your AWS access key
- **AWS Secret Access Key**: Your AWS secret key  
- **Default region name**: e.g., `us-east-1`
- **Default output format**: `json` (recommended)

### Option B: Using Environment Variables
```bash
export AWS_ACCESS_KEY_ID=your_access_key_here
export AWS_SECRET_ACCESS_KEY=your_secret_key_here
export AWS_DEFAULT_REGION=us-east-1
```

### Option C: Using AWS Profiles
```bash
aws configure --profile nexus-dev
```

Then use the profile:
```bash
export AWS_PROFILE=nexus-dev
```

## Step 2: Create the DynamoDB Table

Once your AWS credentials are configured, run the table creation script:

```bash
./scripts/create-dynamodb-table.sh
```

This script will:
1. Verify your AWS credentials are working
2. Create the `LeaderboardService` table with the required structure
3. Wait for the table to become active
4. Display table details and index status

## Step 3: Verify Table Creation

You can verify the table was created successfully:

```bash
# Check table status
aws dynamodb describe-table --table-name LeaderboardService

# List all tables
aws dynamodb list-tables
```

## Expected Table Structure

After successful creation, you should have:

### Main Table: `LeaderboardService`
- **Partition Key**: `PK` (String)
- **Sort Key**: `SK` (String)
- **Billing Mode**: Pay-per-request

### Global Secondary Indexes:
1. **RankIndex**
   - Partition Key: `PK` (String)
   - Sort Key: `Score` (Number)
   - Projection: ALL

2. **UserIndex**
   - Partition Key: `UserID` (String)
   - Sort Key: `PK` (String)
   - Projection: ALL

## Troubleshooting

### Common Issues:

1. **"aws: command not found"**
   - AWS CLI is already installed in this project
   - Try: `which aws` to verify installation

2. **"Unable to locate credentials"**
   - Run `aws configure` to set up credentials
   - Verify with: `aws sts get-caller-identity`

3. **"Table already exists"**
   - The table was already created
   - You can delete it with: `aws dynamodb delete-table --table-name LeaderboardService`
   - Wait for deletion, then re-run the creation script

4. **"Access Denied"**
   - Ensure your AWS user has DynamoDB permissions
   - Required permissions: `dynamodb:CreateTable`, `dynamodb:DescribeTable`

### Useful Commands:

```bash
# Check AWS credentials
aws sts get-caller-identity

# List DynamoDB tables
aws dynamodb list-tables

# Delete table (if needed)
aws dynamodb delete-table --table-name LeaderboardService

# Check table status
aws dynamodb describe-table --table-name LeaderboardService --query 'Table.TableStatus'
```

## Next Steps

Once the table is created successfully:
1. Table structure is ready for leaderboard data
2. Ready to implement Lambda functions for score ingestion
3. Ready to build ranking and query APIs
4. Ready to add sample data for testing

The table design supports all required leaderboard operations:
- Real-time score updates
- Top-N player queries
- User rank lookups
- Percentile calculations
- Time-based leaderboards

## Security Notes

- Never commit AWS credentials to version control
- Use IAM roles in production environments
- Consider using AWS SSO for team access
- Regularly rotate access keys
