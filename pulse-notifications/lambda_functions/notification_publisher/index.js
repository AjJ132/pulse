const AWS = require('aws-sdk');
const sns = new AWS.SNS();

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { message, title, data } = body;
    
    if (!message) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS'
        },
        body: JSON.stringify({
          error: 'Missing required field: message'
        })
      };
    }

    // Prepare the notification payload for multiple platforms
    const notificationPayload = {
      default: message,
      // Web Push format (used by iOS PWA and other browsers)
      GCM: JSON.stringify({
        notification: {
          title: title || 'Notification',
          body: message,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png'
        },
        data: {
          ...data,
          click_action: '/'
        }
      }),
      // Legacy APNS format (for native iOS apps)
      APNS: JSON.stringify({
        aps: {
          alert: {
            title: title || 'Notification',
            body: message
          },
          sound: 'default',
          badge: 1
        },
        data: data || {}
      }),
      APNS_SANDBOX: JSON.stringify({
        aps: {
          alert: {
            title: title || 'Notification',
            body: message
          },
          sound: 'default',
          badge: 1
        },
        data: data || {}
      })
    };

    // Publish to SNS topic
    const publishParams = {
      TopicArn: process.env.SNS_TOPIC_ARN,
      Message: JSON.stringify(notificationPayload),
      MessageStructure: 'json'
    };

    const result = await sns.publish(publishParams).promise();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        message: 'Notification published successfully',
        message_id: result.MessageId
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        error: 'Internal server error'
      })
    };
  }
}; 