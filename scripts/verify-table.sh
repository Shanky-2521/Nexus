#!/bin/bash

# Nexus Leaderboard - Table Verification Script
# This script verifies that the LeaderboardService table was created correctly

echo "Verifying DynamoDB table: LeaderboardService"
echo "============================================="

# Check if table exists and get its status
TABLE_STATUS=$(aws dynamodb describe-table --table-name LeaderboardService --query 'Table.TableStatus' --output text 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "ERROR: Table 'LeaderboardService' does not exist"
    echo "Please run './scripts/create-dynamodb-table.sh' to create the table"
    exit 1
fi

echo "Table exists with status: $TABLE_STATUS"

if [ "$TABLE_STATUS" != "ACTIVE" ]; then
    echo "Table is not yet active. Current status: $TABLE_STATUS"
    echo "Please wait for the table to become active before proceeding."
    exit 1
fi

echo ""
echo "Table Details:"
echo "=================="
aws dynamodb describe-table --table-name LeaderboardService --query 'Table.[TableName,TableStatus,ItemCount,TableSizeBytes,BillingModeSummary.BillingMode]' --output table

echo ""
echo "Global Secondary Indexes:"
echo "============================"
aws dynamodb describe-table --table-name LeaderboardService --query 'Table.GlobalSecondaryIndexes[*].[IndexName,IndexStatus,KeySchema[0].AttributeName,KeySchema[1].AttributeName]' --output table

echo ""
echo "Key Schema:"
echo "=============="
echo "Main Table:"
aws dynamodb describe-table --table-name LeaderboardService --query 'Table.KeySchema[*].[AttributeName,KeyType]' --output table

echo ""
echo "GSI Key Schemas:"
aws dynamodb describe-table --table-name LeaderboardService --query 'Table.GlobalSecondaryIndexes[*].{IndexName:IndexName,Keys:KeySchema[*].[AttributeName,KeyType]}' --output json

echo ""
echo "Table verification complete!"
echo ""
echo "The table is ready for:"
echo "- Real-time score ingestion"
echo "- Top-N player queries via RankIndex"
echo "- User lookup queries via UserIndex"
echo "- Time-based leaderboard operations"
