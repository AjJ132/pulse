#!/bin/bash

# Test script to send a direct notification to AWS backend
# This tests the backend without going through the frontend

API_URL="https://p2kgt1b98i.execute-api.us-east-1.amazonaws.com/dev"

echo "🧪 Testing Pulse Notification System"
echo "======================================"

echo "📡 Testing VAPID endpoint..."
VAPID_RESPONSE=$(curl -s -X GET "${API_URL}/vapid")
echo "VAPID Response: $VAPID_RESPONSE"

if [[ $VAPID_RESPONSE == *"publicKey"* ]]; then
  echo "✅ VAPID endpoint working"
else
  echo "❌ VAPID endpoint failed"
  exit 1
fi

echo ""
echo "📨 Testing notification endpoint..."
NOTIFICATION_RESPONSE=$(curl -s -X POST "${API_URL}/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-123",
    "title": "Backend Test 🚀",
    "message": "This is a direct backend test notification!",
    "icon": "/icon.svg",
    "url": "/"
  }')

echo "Notification Response: $NOTIFICATION_RESPONSE"

if [[ $NOTIFICATION_RESPONSE == *"No active subscriptions"* ]]; then
  echo "⚠️  No active subscriptions found (expected if no users are subscribed)"
elif [[ $NOTIFICATION_RESPONSE == *"sent_count"* ]]; then
  echo "✅ Notification endpoint working"
else
  echo "❌ Notification endpoint failed"
  exit 1
fi

echo ""
echo "✅ Backend API tests complete!"
echo "💡 To test full flow:"
echo "   1. Open your PWA in a browser"
echo "   2. Enable notifications"
echo "   3. Click 'Send Test Notification'"
echo "   4. Check if notification appears"
