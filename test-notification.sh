#!/bin/bash

# Test notification script for Pulse mobile app
# This script publishes a test notification to the aj-general topic

API_ENDPOINT="https://p2kgt1b98i.execute-api.us-east-1.amazonaws.com/dev"
NOTIFICATIONS_URL="${API_ENDPOINT}/notifications"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Pulse Notification Test Script${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Check if curl is available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ curl is required but not installed. Please install curl first.${NC}"
    exit 1
fi

# Function to send a basic test notification
send_basic_test() {
    echo -e "${YELLOW}📱 Sending basic test notification...${NC}"
    
    RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "${NOTIFICATIONS_URL}" \
        -H "Content-Type: application/json" \
        -d '{
            "title": "Hello from Pulse! 👋",
            "message": "This is a test notification from the aj-general topic. Your iPhone should receive this!",
            "data": {
                "test": true,
                "topic": "aj-general",
                "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
                "action": "open_app"
            }
        }')
    
    HTTP_BODY=$(echo $RESPONSE | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
    HTTP_STATUS=$(echo $RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$HTTP_STATUS" -eq 200 ]; then
        echo -e "${GREEN}✅ Basic test notification sent successfully!${NC}"
        echo -e "${GREEN}Response: ${HTTP_BODY}${NC}"
    else
        echo -e "${RED}❌ Failed to send notification. HTTP Status: $HTTP_STATUS${NC}"
        echo -e "${RED}Response: ${HTTP_BODY}${NC}"
    fi
    echo ""
}

# Function to send a rich notification with custom data
send_rich_test() {
    echo -e "${YELLOW}📱 Sending rich test notification...${NC}"
    
    RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "${NOTIFICATIONS_URL}" \
        -H "Content-Type: application/json" \
        -d '{
            "title": "Achievement Unlocked! 🏆",
            "message": "You successfully set up push notifications for the aj-general topic!",
            "data": {
                "event_type": "achievement_unlocked",
                "achievement_id": "push_notifications_setup",
                "achievement_name": "Push Master",
                "points_earned": 100,
                "topic": "aj-general",
                "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
                "action": "view_achievements"
            }
        }')
    
    HTTP_BODY=$(echo $RESPONSE | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
    HTTP_STATUS=$(echo $RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$HTTP_STATUS" -eq 200 ]; then
        echo -e "${GREEN}✅ Rich test notification sent successfully!${NC}"
        echo -e "${GREEN}Response: ${HTTP_BODY}${NC}"
    else
        echo -e "${RED}❌ Failed to send notification. HTTP Status: $HTTP_STATUS${NC}"
        echo -e "${RED}Response: ${HTTP_BODY}${NC}"
    fi
    echo ""
}

# Function to send a workout notification
send_workout_notification() {
    echo -e "${YELLOW}📱 Sending workout notification...${NC}"
    
    RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "${NOTIFICATIONS_URL}" \
        -H "Content-Type: application/json" \
        -d '{
            "title": "Workout Reminder 💪",
            "message": "Time for your daily workout! Your iPhone is ready to track your progress.",
            "data": {
                "event_type": "workout_reminder",
                "workout_type": "cardio",
                "duration": "30",
                "topic": "aj-general",
                "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
                "action": "start_workout"
            }
        }')
    
    HTTP_BODY=$(echo $RESPONSE | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
    HTTP_STATUS=$(echo $RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$HTTP_STATUS" -eq 200 ]; then
        echo -e "${GREEN}✅ Workout notification sent successfully!${NC}"
        echo -e "${GREEN}Response: ${HTTP_BODY}${NC}"
    else
        echo -e "${RED}❌ Failed to send notification. HTTP Status: $HTTP_STATUS${NC}"
        echo -e "${RED}Response: ${HTTP_BODY}${NC}"
    fi
    echo ""
}

# Function to send a custom notification
send_custom_notification() {
    echo -e "${YELLOW}📝 Enter your custom notification details:${NC}"
    echo ""
    
    read -p "Title: " custom_title
    read -p "Message: " custom_message
    
    if [ -z "$custom_title" ] || [ -z "$custom_message" ]; then
        echo -e "${RED}❌ Title and message are required.${NC}"
        return
    fi
    
    echo -e "${YELLOW}📱 Sending custom notification...${NC}"
    
    RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" -X POST "${NOTIFICATIONS_URL}" \
        -H "Content-Type: application/json" \
        -d '{
            "title": "'"$custom_title"'",
            "message": "'"$custom_message"'",
            "data": {
                "custom": true,
                "topic": "aj-general",
                "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
                "action": "open_app"
            }
        }')
    
    HTTP_BODY=$(echo $RESPONSE | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
    HTTP_STATUS=$(echo $RESPONSE | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$HTTP_STATUS" -eq 200 ]; then
        echo -e "${GREEN}✅ Custom notification sent successfully!${NC}"
        echo -e "${GREEN}Response: ${HTTP_BODY}${NC}"
    else
        echo -e "${RED}❌ Failed to send notification. HTTP Status: $HTTP_STATUS${NC}"
        echo -e "${RED}Response: ${HTTP_BODY}${NC}"
    fi
    echo ""
}

# Main menu
show_menu() {
    echo -e "${BLUE}📱 Choose a notification to send:${NC}"
    echo "1) Basic test notification"
    echo "2) Rich test notification (achievement)"
    echo "3) Workout reminder notification"
    echo "4) Custom notification"
    echo "5) Send all test notifications"
    echo "6) Exit"
    echo ""
}

# Main script execution
echo -e "${YELLOW}ℹ️  Make sure your iPhone has the Pulse PWA installed and subscribed to notifications!${NC}"
echo -e "${YELLOW}ℹ️  API Endpoint: ${API_ENDPOINT}${NC}"
echo -e "${YELLOW}ℹ️  Topic: aj-general${NC}"
echo ""

while true; do
    show_menu
    read -p "Enter your choice (1-6): " choice
    echo ""
    
    case $choice in
        1)
            send_basic_test
            ;;
        2)
            send_rich_test
            ;;
        3)
            send_workout_notification
            ;;
        4)
            send_custom_notification
            ;;
        5)
            echo -e "${YELLOW}🚀 Sending all test notifications...${NC}"
            echo ""
            send_basic_test
            sleep 2
            send_rich_test
            sleep 2
            send_workout_notification
            echo -e "${GREEN}✅ All test notifications sent!${NC}"
            echo ""
            ;;
        6)
            echo -e "${BLUE}👋 Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid choice. Please enter 1-6.${NC}"
            echo ""
            ;;
    esac
done