#!/bin/bash

# Test script for Pulse Notifications API
# Run this after deploying the infrastructure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if API_URL is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide the API Gateway URL as the first argument${NC}"
    echo "Usage: $0 <API_GATEWAY_URL>"
    echo "Example: $0 https://abc123.execute-api.us-east-1.amazonaws.com/prod"
    exit 1
fi

API_URL="$1"

echo -e "${YELLOW}Testing Pulse Notifications API at: $API_URL${NC}"
echo

# Test 1: Register a test device
echo -e "${YELLOW}Test 1: Registering a test device...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/register-device" \
  -H "Content-Type: application/json" \
  -d '{
    "device_token": "test-device-token-12345",
    "user_id": "test-user",
    "device_id": "test-device-001"
  }')

echo "Response: $REGISTER_RESPONSE"

if echo "$REGISTER_RESPONSE" | grep -q "Device registered successfully"; then
    echo -e "${GREEN}✓ Device registration test passed${NC}"
else
    echo -e "${RED}✗ Device registration test failed${NC}"
fi

echo

# Test 2: Send a test notification
echo -e "${YELLOW}Test 2: Sending a test notification...${NC}"
NOTIFICATION_RESPONSE=$(curl -s -X POST "$API_URL/send-notification" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test notification from the API",
    "user_id": "test-user"
  }')

echo "Response: $NOTIFICATION_RESPONSE"

if echo "$NOTIFICATION_RESPONSE" | grep -q "Notifications sent"; then
    echo -e "${GREEN}✓ Notification sending test passed${NC}"
else
    echo -e "${RED}✗ Notification sending test failed${NC}"
fi

echo

# Test 3: Send notification to specific device
echo -e "${YELLOW}Test 3: Sending notification to specific device...${NC}"
DEVICE_NOTIFICATION_RESPONSE=$(curl -s -X POST "$API_URL/send-notification" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Device-Specific Test",
    "message": "This notification is for a specific device",
    "device_id": "test-device-001"
  }')

echo "Response: $DEVICE_NOTIFICATION_RESPONSE"

if echo "$DEVICE_NOTIFICATION_RESPONSE" | grep -q "Notifications sent"; then
    echo -e "${GREEN}✓ Device-specific notification test passed${NC}"
else
    echo -e "${RED}✗ Device-specific notification test failed${NC}"
fi

echo
echo -e "${YELLOW}Testing complete!${NC}"
echo
echo -e "${YELLOW}Note: These tests use mock device tokens. For real push notifications,${NC}"
echo -e "${YELLOW}you'll need to use actual device tokens from iOS devices.${NC}"
