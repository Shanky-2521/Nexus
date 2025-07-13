#!/bin/bash

# Nexus Leaderboard - Score Submission Test Script
# This script tests the score submission API endpoint

echo "Testing Nexus Leaderboard Score Submission API"
echo "=============================================="

# Check if API Gateway URL is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <API_GATEWAY_URL>"
    echo "Example: $0 https://abc123.execute-api.us-east-1.amazonaws.com/dev"
    echo ""
    echo "You can get the API Gateway URL after deploying with 'npm run deploy'"
    exit 1
fi

API_URL="$1"

echo "Testing API endpoint: $API_URL"
echo ""

# Test 1: Submit a score using the generic endpoint
echo "Test 1: Submit score via generic endpoint (/score)"
echo "=================================================="

curl -X POST "$API_URL/score" \
  -H "Content-Type: application/json" \
  -d '{
    "GameID": "CyberClash",
    "UserID": "player123",
    "PlayerName": "CyberNinja",
    "Score": 1500,
    "Metadata": {
      "Level": 42,
      "PlayTime": 3600
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 2: Submit a score using the path parameter endpoint
echo "Test 2: Submit score via path parameter endpoint (/leaderboard/{gameId}/score)"
echo "=============================================================================="

curl -X POST "$API_URL/leaderboard/CyberClash/score" \
  -H "Content-Type: application/json" \
  -d '{
    "UserID": "player456",
    "PlayerName": "QuantumGamer",
    "Score": 2100,
    "Metadata": {
      "Level": 55,
      "PlayTime": 4200
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 3: Submit a higher score for the same user (should update)
echo "Test 3: Submit higher score for existing user (should update record)"
echo "=================================================================="

curl -X POST "$API_URL/leaderboard/CyberClash/score" \
  -H "Content-Type: application/json" \
  -d '{
    "UserID": "player123",
    "PlayerName": "CyberNinja",
    "Score": 2500,
    "Metadata": {
      "Level": 60,
      "PlayTime": 5400
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 4: Submit a lower score for the same user (should not update)
echo "Test 4: Submit lower score for existing user (should not update record)"
echo "====================================================================="

curl -X POST "$API_URL/leaderboard/CyberClash/score" \
  -H "Content-Type: application/json" \
  -d '{
    "UserID": "player123",
    "PlayerName": "CyberNinja",
    "Score": 1000,
    "Metadata": {
      "Level": 30,
      "PlayTime": 2000
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 5: Test validation errors
echo "Test 5: Test validation (missing required fields)"
echo "================================================"

curl -X POST "$API_URL/score" \
  -H "Content-Type: application/json" \
  -d '{
    "GameID": "CyberClash",
    "Score": 1500
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 6: Test with different time frame
echo "Test 6: Submit score for specific time frame"
echo "==========================================="

curl -X POST "$API_URL/score" \
  -H "Content-Type: application/json" \
  -d '{
    "GameID": "CyberClash",
    "UserID": "player789",
    "PlayerName": "TimeWarrior",
    "Score": 3000,
    "TimeFrame": "2025-07-13",
    "Metadata": {
      "Level": 75,
      "PlayTime": 7200
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

echo "Score submission tests completed!"
echo ""
echo "Next steps:"
echo "1. Check the DynamoDB table 'LeaderboardService' in AWS Console"
echo "2. Verify that items were created with the correct PK/SK structure"
echo "3. Test the ranking queries once those endpoints are implemented"
echo ""
echo "Expected table items should have:"
echo "- PK: LEADERBOARD#CyberClash#<timeframe>"
echo "- SK: USER#<userId>"
echo "- Score: <submitted score>"
echo "- UserID: <userId> (for GSI access)"
