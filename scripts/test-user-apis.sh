#!/bin/bash

# Nexus Leaderboard - User-Specific APIs Test Script
# This script tests all user-specific endpoints demonstrating the UserIndex GSI

echo "Testing Nexus Leaderboard User-Specific APIs"
echo "============================================"

# Check if API Gateway URL is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <API_GATEWAY_URL>"
    echo "Example: $0 https://abc123.execute-api.us-east-1.amazonaws.com/dev"
    echo ""
    echo "You can get the API Gateway URL after deploying with 'npm run deploy'"
    exit 1
fi

API_URL="$1"
TEST_USER="testuser123"

echo "Testing API endpoint: $API_URL"
echo "Test user: $TEST_USER"
echo ""

# First, let's submit scores for our test user across multiple games and time frames
echo "Setting up comprehensive test data for user: $TEST_USER"
echo "======================================================="

# Submit scores for CyberClash (current week)
curl -s -X POST "$API_URL/leaderboard/CyberClash/score" \
  -H "Content-Type: application/json" \
  -d '{
    "UserID": "'$TEST_USER'",
    "PlayerName": "TestWarrior",
    "Score": 2500
  }' > /dev/null

# Submit scores for SpaceInvaders (current week)
curl -s -X POST "$API_URL/leaderboard/SpaceInvaders/score" \
  -H "Content-Type: application/json" \
  -d '{
    "UserID": "'$TEST_USER'",
    "PlayerName": "TestWarrior",
    "Score": 1800
  }' > /dev/null

# Submit scores for CyberClash (specific date)
curl -s -X POST "$API_URL/score" \
  -H "Content-Type: application/json" \
  -d '{
    "GameID": "CyberClash",
    "UserID": "'$TEST_USER'",
    "PlayerName": "TestWarrior",
    "Score": 3000,
    "TimeFrame": "2025-07-13"
  }' > /dev/null

# Submit scores for RetroArcade (current week)
curl -s -X POST "$API_URL/leaderboard/RetroArcade/score" \
  -H "Content-Type: application/json" \
  -d '{
    "UserID": "'$TEST_USER'",
    "PlayerName": "TestWarrior",
    "Score": 1200
  }' > /dev/null

# Submit some competitor scores for context
curl -s -X POST "$API_URL/leaderboard/CyberClash/score" \
  -H "Content-Type: application/json" \
  -d '{
    "UserID": "competitor1",
    "PlayerName": "Competitor1",
    "Score": 2800
  }' > /dev/null

curl -s -X POST "$API_URL/leaderboard/CyberClash/score" \
  -H "Content-Type: application/json" \
  -d '{
    "UserID": "competitor2",
    "PlayerName": "Competitor2",
    "Score": 2200
  }' > /dev/null

echo "Test data submitted successfully!"
echo ""

# Wait a moment for data to be available
sleep 3

# Test 1: Get all user scores (demonstrates UserIndex GSI)
echo "Test 1: Get all user scores across all leaderboards (UserIndex GSI)"
echo "=================================================================="

curl -X GET "$API_URL/user/$TEST_USER/scores" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 2: Get user scores filtered by game
echo "Test 2: Get user scores filtered by specific game"
echo "================================================"

curl -X GET "$API_URL/user/$TEST_USER/scores?gameId=CyberClash" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 3: Get user's best scores across all games
echo "Test 3: Get user's best scores across all games"
echo "=============================================="

curl -X GET "$API_URL/user/$TEST_USER/best-scores" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 4: Get user rank for specific leaderboard
echo "Test 4: Get user rank and context for specific leaderboard"
echo "========================================================="

curl -X GET "$API_URL/leaderboard/CyberClash/user/$TEST_USER/rank" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 5: Get user rank across all leaderboards
echo "Test 5: Get user rank across all leaderboards"
echo "============================================"

curl -X GET "$API_URL/user/$TEST_USER/rank" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 6: Get user percentile for specific leaderboard
echo "Test 6: Get user percentile for specific leaderboard"
echo "==================================================="

curl -X GET "$API_URL/leaderboard/CyberClash/user/$TEST_USER/percentile" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 7: Get user percentile across multiple time frames
echo "Test 7: Get user percentile across multiple time frames"
echo "======================================================"

curl -X GET "$API_URL/user/$TEST_USER/percentile?gameId=CyberClash&timeFrames=current,2025-07-13" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 8: Get user rank with custom context size
echo "Test 8: Get user rank with custom context size"
echo "============================================="

curl -X GET "$API_URL/leaderboard/CyberClash/user/$TEST_USER/rank?contextSize=3" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 9: Test with non-existent user
echo "Test 9: Test with non-existent user"
echo "=================================="

curl -X GET "$API_URL/user/nonexistentuser/scores" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

# Test 10: Test user scores with time frame filter
echo "Test 10: Test user scores with time frame filter"
echo "==============================================="

curl -X GET "$API_URL/user/$TEST_USER/scores?timeFrame=2025-07-13" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo ""
echo ""

echo "User-specific API tests completed!"
echo ""
echo "Expected behavior:"
echo "- Test 1: Should return all leaderboards the user participates in"
echo "- Test 2: Should return only CyberClash leaderboards for the user"
echo "- Test 3: Should return best score for each game the user plays"
echo "- Test 4: Should return user's rank and surrounding players"
echo "- Test 5: Should return user's rank across all leaderboards"
echo "- Test 6: Should return percentile calculation for specific game"
echo "- Test 7: Should return percentiles across multiple time frames"
echo "- Test 8: Should return rank with 3 players above/below"
echo "- Test 9: Should return 404 error for non-existent user"
echo "- Test 10: Should return only entries for specific time frame"
echo ""
echo "Key features demonstrated:"
echo "- UserIndex GSI for efficient user lookups across all leaderboards"
echo "- Cross-leaderboard user analytics and statistics"
echo "- Rank calculation with contextual player information"
echo "- Percentile calculations and performance bands"
echo "- Flexible filtering by game and time frame"
echo ""
echo "This completes the demonstration of all core leaderboard functionality!"
echo "The system now supports:"
echo "1. High-throughput score ingestion"
echo "2. Efficient top-N player queries"
echo "3. User-specific rank and percentile calculations"
echo "4. Cross-leaderboard user analytics"
