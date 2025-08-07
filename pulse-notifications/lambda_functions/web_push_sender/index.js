const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');
const webpush = require('web-push');

const dynamoClient = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(dynamoClient);
const ssm = new SSMClient({});

/**
 * Web Push Sender Lambda Function
 * 
 * Handles:
 * - POST /notifications - Send web push notifications to all active subscribers
 * 
 * Features:
 * - Fetches VAPID keys from SSM Parameter Store
 * - Queries DynamoDB for active subscriptions
 * - Sends notifications using web-push library
 * - Handles failed subscriptions by incrementing failure count
 * - Detailed logging for debugging
 */
exports.handler = async (event) => {
  console.log('🚀 Web Push Sender - Request received:', {
    httpMethod: event.httpMethod,
    path: event.path,
    headers: event.headers,
    body: event.body ? JSON.parse(event.body) : null
  });

  try {
    const corsHeaders = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      console.log('✅ Handling CORS preflight request');
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'CORS preflight successful' })
      };
    }

    // Only handle POST requests to /notifications
    if (event.httpMethod !== 'POST' || !event.path.includes('/notifications')) {
      console.log('❌ Invalid request method or path:', { method: event.httpMethod, path: event.path });
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Endpoint not found',
          method: event.httpMethod,
          path: event.path
        })
      };
    }

    const body = JSON.parse(event.body || '{}');
    console.log('📨 Notification request:', { 
      title: body.title, 
      message: body.message,
      hasData: !!body.data,
      targetUser: body.user_id || 'all'
    });

    return await handleNotificationSend(body, corsHeaders);

  } catch (error) {
    console.error('💥 Lambda execution error:', error);
    console.error('🔍 Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

/**
 * Handle sending web push notifications
 */
async function handleNotificationSend(body, corsHeaders) {
  try {
    const { title, message, data, user_id, icon, url } = body;
    
    // Validate required fields
    if (!message) {
      console.log('❌ Missing message in notification request');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing required field: message'
        })
      };
    }

    console.log('🔑 Fetching VAPID configuration from SSM...');
    
    // Fetch VAPID configuration from SSM
    const vapidConfig = await getVapidConfiguration();
    console.log('✅ VAPID configuration loaded successfully');
    
    // Configure web-push with VAPID details
    webpush.setVapidDetails(
      vapidConfig.contact,
      vapidConfig.publicKey,
      vapidConfig.privateKey
    );

    console.log('🔍 Fetching active subscriptions from DynamoDB...');
    
    // Get active subscriptions from DynamoDB
    const subscriptions = await getActiveSubscriptions(user_id);
    
    if (subscriptions.length === 0) {
      console.log('⚠️ No active subscriptions found');
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          message: 'No active subscriptions found',
          sent_count: 0,
          failed_count: 0,
          timestamp: new Date().toISOString()
        })
      };
    }

    console.log(`📱 Found ${subscriptions.length} active subscription(s)`);

    // Prepare notification payload
    const notificationPayload = {
      title: title || 'Pulse Notification',
      body: message,
      icon: icon || '/icon.svg',
      badge: icon || '/icon.svg',
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        click_action: url || '/'
      }
    };

    console.log('📨 Notification payload prepared:', {
      title: notificationPayload.title,
      body: notificationPayload.body,
      hasData: !!notificationPayload.data
    });

    // Send notifications to all subscriptions
    const results = await sendNotificationsToSubscriptions(subscriptions, notificationPayload);
    
    console.log('📊 Notification sending results:', {
      total: subscriptions.length,
      successful: results.successful.length,
      failed: results.failed.length
    });

    // Update failure counts for failed subscriptions
    if (results.failed.length > 0) {
      console.log('🔧 Updating failure counts for failed subscriptions...');
      await updateFailureCounts(results.failed);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Notifications sent successfully',
        sent_count: results.successful.length,
        failed_count: results.failed.length,
        total_subscriptions: subscriptions.length,
        successful_deliveries: results.successful,
        failed_deliveries: results.failed.map(f => ({
          user_id: f.user_id,
          subscription_id: f.subscription_id,
          error: f.error
        })),
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('💥 Error sending notifications:', error);
    console.error('🔍 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to send notifications',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}

/**
 * Get VAPID configuration from SSM Parameter Store
 */
async function getVapidConfiguration() {
  try {
    const paramNames = [
      process.env.VAPID_PRIVATE_KEY_PARAM,
      process.env.VAPID_PUBLIC_KEY_PARAM,
      process.env.VAPID_CONTACT_PARAM
    ];

    console.log('🔑 Fetching VAPID parameters:', paramNames);

    const command = new GetParametersCommand({
      Names: paramNames,
      WithDecryption: true
    });
    const result = await ssm.send(command);

    if (result.Parameters.length !== 3) {
      throw new Error(`Expected 3 VAPID parameters, got ${result.Parameters.length}`);
    }

    const config = {};
    result.Parameters.forEach(param => {
      if (param.Name.includes('private-key')) {
        config.privateKey = param.Value;
      } else if (param.Name.includes('public-key')) {
        config.publicKey = param.Value;
      } else if (param.Name.includes('contact')) {
        config.contact = param.Value;
      }
    });

    console.log('✅ VAPID parameters loaded:', {
      hasPrivateKey: !!config.privateKey,
      hasPublicKey: !!config.publicKey,
      contact: config.contact
    });

    return config;

  } catch (error) {
    console.error('💥 Error fetching VAPID configuration:', error);
    throw new Error(`Failed to fetch VAPID configuration: ${error.message}`);
  }
}

/**
 * Get active subscriptions from DynamoDB
 */
async function getActiveSubscriptions(targetUserId = null) {
  try {
    let params;
    
    if (targetUserId) {
      // Query specific user's subscriptions
      console.log('🔍 Fetching subscriptions for specific user:', targetUserId);
      params = {
        TableName: process.env.DYNAMODB_TABLE,
        KeyConditionExpression: 'user_id = :user_id',
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':user_id': targetUserId,
          ':status': 'active'
        }
      };
      
      const command = new QueryCommand(params);
      const result = await dynamodb.send(command);
      return result.Items || [];
      
    } else {
      // Scan all active subscriptions
      console.log('🔍 Fetching all active subscriptions...');
      params = {
        TableName: process.env.DYNAMODB_TABLE,
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': 'active'
        }
      };
      
      const command = new ScanCommand(params);
      const result = await dynamodb.send(command);
      return result.Items || [];
    }

  } catch (error) {
    console.error('💥 Error fetching subscriptions:', error);
    throw new Error(`Failed to fetch subscriptions: ${error.message}`);
  }
}

/**
 * Send notifications to all subscriptions
 */
async function sendNotificationsToSubscriptions(subscriptions, payload) {
  const successful = [];
  const failed = [];

  console.log(`📨 Sending notifications to ${subscriptions.length} subscription(s)...`);

  // Send notifications with controlled concurrency
  const promises = subscriptions.map(async (subscription) => {
    try {
      console.log(`📱 Sending to user ${subscription.user_id} (${subscription.subscription_id})`);
      
      // Send the notification
      const result = await webpush.sendNotification(
        subscription.subscription,
        JSON.stringify(payload)
      );

      console.log(`✅ Successfully sent to ${subscription.user_id}:`, {
        statusCode: result.statusCode,
        headers: result.headers
      });

      successful.push({
        user_id: subscription.user_id,
        subscription_id: subscription.subscription_id,
        status: 'sent',
        statusCode: result.statusCode
      });

      // Update last notification sent timestamp
      await updateLastNotificationSent(subscription.user_id, subscription.subscription_id);

    } catch (error) {
      console.error(`❌ Failed to send to ${subscription.user_id}:`, {
        error: error.message,
        statusCode: error.statusCode,
        headers: error.headers
      });

      failed.push({
        user_id: subscription.user_id,
        subscription_id: subscription.subscription_id,
        error: error.message,
        statusCode: error.statusCode,
        subscription: subscription.subscription
      });
    }
  });

  await Promise.all(promises);

  return { successful, failed };
}

/**
 * Update last notification sent timestamp
 */
async function updateLastNotificationSent(userId, subscriptionId) {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        user_id: userId,
        subscription_id: subscriptionId
      },
      UpdateExpression: 'SET last_notification_sent = :timestamp, updated_at = :timestamp',
      ExpressionAttributeValues: {
        ':timestamp': new Date().toISOString()
      }
    };

    const command = new UpdateCommand(params);
    await dynamodb.send(command);
    
  } catch (error) {
    console.error(`⚠️ Failed to update last notification timestamp for ${userId}:`, error);
    // Don't throw here - this is not critical for the notification sending
  }
}

/**
 * Update failure counts for failed subscriptions
 */
async function updateFailureCounts(failedSubscriptions) {
  const updatePromises = failedSubscriptions.map(async (failed) => {
    try {
      const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
          user_id: failed.user_id,
          subscription_id: failed.subscription_id
        },
        UpdateExpression: 'SET failure_count = failure_count + :inc, updated_at = :timestamp',
        ExpressionAttributeValues: {
          ':inc': 1,
          ':timestamp': new Date().toISOString()
        }
      };

      const command = new UpdateCommand(params);
    await dynamodb.send(command);
      console.log(`📈 Updated failure count for ${failed.user_id}`);

      // If failure count is too high, deactivate the subscription
      // (You can adjust this threshold)
      const MAX_FAILURES = 5;
      if (failed.statusCode === 410) { // Gone - subscription is no longer valid
        console.log(`🔄 Deactivating subscription for ${failed.user_id} (410 Gone)`);
        await deactivateSubscription(failed.user_id, failed.subscription_id);
      }

    } catch (error) {
      console.error(`⚠️ Failed to update failure count for ${failed.user_id}:`, error);
    }
  });

  await Promise.all(updatePromises);
}

/**
 * Deactivate a subscription that is no longer valid
 */
async function deactivateSubscription(userId, subscriptionId) {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Key: {
        user_id: userId,
        subscription_id: subscriptionId
      },
      UpdateExpression: 'SET #status = :status, updated_at = :timestamp',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'inactive',
        ':timestamp': new Date().toISOString()
      }
    };

    const command = new UpdateCommand(params);
    await dynamodb.send(command);
    console.log(`🔄 Deactivated subscription for ${userId}`);

  } catch (error) {
    console.error(`⚠️ Failed to deactivate subscription for ${userId}:`, error);
  }
}