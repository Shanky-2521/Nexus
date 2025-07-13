#!/bin/bash

# Nexus Leaderboard - Top Players API Test Script
# This script tests the top players ranking API endpoints

echo "Testing Nexus Leaderboard Top Players API"
echo "========================================="

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

# First, let's submit some test scores to ensure we have data
echo "Setting up test data (submitting sample scores)..."
echo "================================================="

# Submit multiple scores for testing
curl -s -X POST "$API_URL/leaderboard/CyberClash/score" \
  -H "Content-Type: application/json" \
  -d '{
    "UserID": "player001",
    "PlayerName": "AlphaGamer",
    "Score": 5000
  }' > /dev/null

curl -s -X POST "$API_URL/leaderboard/CyberClash/score" \
  -H "Content-Type: application/json" \
  -d '{
    "UserID": "player002",
    "PlayerName": "BetaWarrior",
    "Score": 4500
  }' > /dev/null

curl -s -X POST "$API_URL/leaderboard/CyberClash/score" \
  -H "Content-Type: application/json" \
  -d '{
    "UserID": "player003",
    "PlayerName": "GammaHero",
    "Score": 4000
  }' > /dev/null

curl -s -X POST "$API_URL/leaderboard/CyberClash/score" \
  -H "Content-Type: application/json" \
  -d '{
    "UserID": "player004",
    "PlayerName": "DeltaChampion",
    "Score": 3500
  }' > /dev/null

curl -s -X POST "$API_URL/leaderboard/CyberClash/score" \
  -H "Content-Type: application/json" \
  -d '{
    "UserID": "player005",
    "PlayerName": "EpsilonMaster",
    "Score": 3000
  }' > /dev/null

echo "Test data submitted successfully!"
echo ""

# Wait a moment for data to be available
sleep 2

# Test 1: Get top 5 players using path parameter style
echo "Test 1: Get top 5 players (path parameter style)"
echo "==============================================="

curl -X GET "$API_URL/leaderboard/CyberClash/top/5" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 2: Get top 3 players using query parameter style
echo "Test 2: Get top 3 players (query parameter style)"
echo "================================================"

curl -X GET "$API_URL/leaderboard/CyberClash/top?count=3" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 3: Get top 10 players (default count)
echo "Test 3: Get top players with default count"
echo "========================================="

curl -X GET "$API_URL/leaderboard/CyberClash/top" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 4: Get top players with specific time frame
echo "Test 4: Get top players with specific time frame"
echo "==============================================="

# First submit a score for a specific time frame
curl -s -X POST "$API_URL/score" \
  -H "Content-Type: application/json" \
  -d '{
    "GameID": "CyberClash",
    "UserID": "player006",
    "PlayerName": "TimeFramePlayer",
    "Score": 6000,
    "TimeFrame": "2025-07-13"
  }' > /dev/null

# Now query for that specific time frame
curl -X GET "$API_URL/leaderboard/CyberClash/top/5?timeFrame=2025-07-13" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 5: Test with time frame in path
echo "Test 5: Get top players with time frame in path"
echo "=============================================="

curl -X GET "$API_URL/leaderboard/CyberClash/2025-07-13/top/3" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 6: Test validation errors
echo "Test 6: Test validation (invalid count parameter)"
echo "================================================"

curl -X GET "$API_URL/leaderboard/CyberClash/top/0" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 7: Test with non-existent game
echo "Test 7: Test with non-existent game"
echo "=================================="

curl -X GET "$API_URL/leaderboard/NonExistentGame/top/5" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 8: Test with very large count (should be limited)
echo "Test 8: Test with large count parameter"
echo "======================================"

curl -X GET "$API_URL/leaderboard/CyberClash/top/150" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

echo "Top players API tests completed!"
echo ""
echo "Expected behavior:"
echo "- Test 1-3: Should return ranked players in descending score order"
echo "- Test 4-5: Should return players for specific time frame"
echo "- Test 6: Should return validation error (400 status)"
echo "- Test 7: Should return empty players array"
echo "- Test 8: Should be limited to maximum allowed count (100)"
echo ""
echo "Response format should include:"
echo "- GameID and TimeFrame"
echo "- Players array with UserID, PlayerName, Score, Rank"
echo "- TotalPlayers count"
echo "- LastUpdated timestamp"
echo ""
echo "Next steps:"
echo "1. Verify the ranking order is correct (highest scores first)"
echo "2. Check that rank numbers are sequential (1, 2, 3, etc.)"
echo "3. Confirm percentile calculations are accurate"
echo "4. Test with different games and time frames"
