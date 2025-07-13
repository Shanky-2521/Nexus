#!/bin/bash

# Nexus Leaderboard - DynamoDB Table Creation Script
# This script creates the LeaderboardService table with the required indexes

echo "Creating DynamoDB table: LeaderboardService"
echo "============================================="

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "ERROR: AWS CLI is not configured or credentials are invalid"
    echo "Please run 'aws configure' to set up your credentials first"
    exit 1
fi

echo "AWS CLI is configured successfully"

# Create the DynamoDB table
echo "Creating table with the following structure:"
echo "- Primary Key: PK (Partition Key), SK (Sort Key)"
echo "- GSI 1 (RankIndex): PK (Partition Key), Score (Sort Key) - for top N queries"
echo "- GSI 2 (UserIndex): UserID (Partition Key), PK (Sort Key) - for user lookup"

aws dynamodb create-table \
    --table-name LeaderboardService \
    --attribute-definitions \
        AttributeName=PK,AttributeType=S \
        AttributeName=SK,AttributeType=S \
        AttributeName=Score,AttributeType=N \
        AttributeName=UserID,AttributeType=S \
    --key-schema \
        AttributeName=PK,KeyType=HASH \
        AttributeName=SK,KeyType=RANGE \
    --global-secondary-indexes \
    "[
        {
            \"IndexName\": \"RankIndex\",
            \"KeySchema\": [
                {\"AttributeName\":\"PK\",\"KeyType\":\"HASH\"},
                {\"AttributeName\":\"Score\",\"KeyType\":\"RANGE\"}
            ],
            \"Projection\": {\"ProjectionType\":\"ALL\"}
        },
        {
            \"IndexName\": \"UserIndex\",
            \"KeySchema\": [
                {\"AttributeName\":\"UserID\",\"KeyType\":\"HASH\"},
                {\"AttributeName\":\"PK\",\"KeyType\":\"RANGE\"}
            ],
            \"Projection\": {\"ProjectionType\":\"ALL\"}
        }
    ]" \
    --billing-mode PAY_PER_REQUEST

if [ $? -eq 0 ]; then
    echo ""
    echo "Table creation initiated successfully!"
    echo "Waiting for table to become active..."

    # Wait for table to become active
    aws dynamodb wait table-exists --table-name LeaderboardService

    if [ $? -eq 0 ]; then
        echo "Table 'LeaderboardService' is now active and ready to use!"
        echo ""
        echo "Table Details:"
        echo "=============="
        aws dynamodb describe-table --table-name LeaderboardService --query 'Table.[TableName,TableStatus,ItemCount,TableSizeBytes]' --output table
        echo ""
        echo "Global Secondary Indexes:"
        echo "========================"
        aws dynamodb describe-table --table-name LeaderboardService --query 'Table.GlobalSecondaryIndexes[*].[IndexName,IndexStatus]' --output table
    else
        echo "ERROR: Table creation failed or timed out"
        exit 1
    fi
else
    echo "ERROR: Failed to create table"
    exit 1
fi
