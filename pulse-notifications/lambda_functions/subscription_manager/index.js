const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();
const ssm = new AWS.SSM();

/**
 * Subscription Manager Lambda Function
 * 
 * Handles:
 * - POST /subscriptions - Subscribe a user to web push notifications
 * - DELETE /subscriptions - Unsubscribe a user from notifications
 * - GET /vapid - Get VAPID public key for frontend
 * 
 * Updated to work with direct Web Push API (no SNS)
 */
exports.handler = async (event) => {
  console.log('🚀 Subscription Manager - Request received:', {
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

    // Handle VAPID public key request
    if (event.httpMethod === 'GET' && event.path.includes('/vapid')) {
      console.log('🔑 VAPID public key requested');
      return await handleVapidRequest(corsHeaders);
    }

    // Handle subscription management
    if (event.path.includes('/subscriptions')) {
      const body = JSON.parse(event.body || '{}');
      
      if (event.httpMethod === 'POST') {
        console.log('📝 Subscription request:', { 
          action: body.action, 
          user_id: body.user_id,
          hasSubscription: !!body.subscription 
        });
        return await handleSubscription(body, corsHeaders);
      } else if (event.httpMethod === 'DELETE') {
        console.log('🗑️ Unsubscription request:', { 
          action: body.action, 
          user_id: body.user_id 
        });
        return await handleUnsubscription(body, corsHeaders);
      }
    }

    console.log('❌ Unsupported request:', { method: event.httpMethod, path: event.path });
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Endpoint not found',
        method: event.httpMethod,
        path: event.path
      })
    };

  } catch (error) {
    console.error('💥 Lambda execution error:', error);
    console.error('🔍 Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, DELETE, GET, OPTIONS'
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
 * Handle VAPID public key request
 */
async function handleVapidRequest(corsHeaders) {
  try {
    console.log('🔑 Fetching VAPID public key from SSM...');
    
    const paramName = process.env.VAPID_PUBLIC_KEY_PARAM;
    if (!paramName) {
      throw new Error('VAPID_PUBLIC_KEY_PARAM environment variable not set');
    }

    const result = await ssm.getParameter({
      Name: paramName,
      WithDecryption: false
    }).promise();

    const publicKey = result.Parameter.Value;
    console.log('✅ VAPID public key retrieved successfully:', publicKey.substring(0, 20) + '...');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        publicKey: publicKey,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('💥 Error fetching VAPID public key:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to retrieve VAPID public key',
        message: error.message
      })
    };
  }
}

/**
 * Handle subscription to web push notifications
 */
async function handleSubscription(body, corsHeaders) {
  try {
    const { user_id, subscription } = body;
    
    // Validate required fields
    if (!user_id) {
      console.log('❌ Missing user_id in subscription request');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing required field: user_id'
        })
      };
    }

    if (!subscription || !subscription.endpoint) {
      console.log('❌ Missing or invalid subscription object:', { subscription });
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing required field: subscription with valid endpoint'
        })
      };
    }

    // Validate subscription keys
    if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      console.log('❌ Missing subscription keys:', { keys: subscription.keys });
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Invalid subscription: missing encryption keys (p256dh, auth)'
        })
      };
    }

    // Generate subscription ID from endpoint (for uniqueness)
    const subscriptionId = generateSubscriptionId(subscription.endpoint);
    console.log('🆔 Generated subscription ID:', subscriptionId);

    // Store subscription in DynamoDB
    const dbParams = {
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        user_id: user_id,
        subscription_id: subscriptionId,
        subscription: subscription,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        failure_count: 0,
        last_notification_sent: null
      }
    };

    console.log('💾 Storing subscription in DynamoDB:', {
      user_id,
      subscription_id: subscriptionId,
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      hasKeys: !!subscription.keys
    });

    await dynamodb.put(dbParams).promise();

    console.log('✅ Subscription stored successfully');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Successfully subscribed to web push notifications',
        subscription_id: subscriptionId,
        user_id: user_id,
        status: 'active',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('💥 Error handling subscription:', error);
    console.error('🔍 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to subscribe to notifications',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}

/**
 * Handle unsubscription from web push notifications
 */
async function handleUnsubscription(body, corsHeaders) {
  try {
    const { user_id } = body;
    
    if (!user_id) {
      console.log('❌ Missing user_id in unsubscription request');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Missing required field: user_id'
        })
      };
    }

    console.log('🔍 Looking up subscriptions for user:', user_id);

    // Query all subscriptions for the user
    const queryParams = {
      TableName: process.env.DYNAMODB_TABLE,
      KeyConditionExpression: 'user_id = :user_id',
      ExpressionAttributeValues: {
        ':user_id': user_id
      }
    };

    const queryResult = await dynamodb.query(queryParams).promise();
    
    if (!queryResult.Items || queryResult.Items.length === 0) {
      console.log('❌ No subscriptions found for user:', user_id);
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'No subscriptions found for this user'
        })
      };
    }

    console.log(`🗑️ Found ${queryResult.Items.length} subscription(s) to delete`);

    // Delete all subscriptions for the user
    const deletePromises = queryResult.Items.map(async (item) => {
      console.log('🗑️ Deleting subscription:', item.subscription_id);
      
      const deleteParams = {
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
          user_id: user_id,
          subscription_id: item.subscription_id
        }
      };

      await dynamodb.delete(deleteParams).promise();
      return item.subscription_id;
    });

    const deletedIds = await Promise.all(deletePromises);
    
    console.log('✅ Successfully deleted subscriptions:', deletedIds);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Successfully unsubscribed from notifications',
        deleted_subscriptions: deletedIds.length,
        user_id: user_id,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('💥 Error handling unsubscription:', error);
    console.error('🔍 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to unsubscribe from notifications',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}

/**
 * Generate a unique subscription ID from the endpoint URL
 */
function generateSubscriptionId(endpoint) {
  // Extract the unique part from various push service endpoints
  try {
    const url = new URL(endpoint);
    const pathParts = url.pathname.split('/');
    const uniquePart = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
    
    // If we can't parse it, use a hash of the full endpoint
    if (!uniquePart || uniquePart.length < 10) {
      const crypto = require('crypto');
      return crypto.createHash('sha256').update(endpoint).digest('hex').substring(0, 16);
    }
    
    return uniquePart.substring(0, 32); // Limit length for DynamoDB
  } catch (error) {
    console.log('⚠️ Could not parse endpoint URL, using hash:', error.message);
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(endpoint).digest('hex').substring(0, 16);
  }
}