import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { SNSClient, PublishCommand, CreatePlatformEndpointCommand, DeleteEndpointCommand } from '@aws-sdk/client-sns';
import { DynamoDBClient, GetItemCommand, QueryCommand, ScanCommand, PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { NotificationSubRoute } from '../types/routes';

// Initialize AWS clients
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Request interfaces
interface NotificationRequest {
  message?: string;
  title?: string;
  user_id?: string;
  userId?: string;
  device_id?: string;
  deviceId?: string;
  device_token?: string;
  deviceToken?: string;
}

interface DeviceRegistrationRequest {
  device_token?: string;
  deviceToken?: string;
  user_id?: string;
  userId?: string;
  device_id?: string;
  deviceId?: string;
  bundle_id?: string;
  bundleId?: string;
  platform?: string;
  timestamp?: string;
}

// Data interfaces
interface DeviceToken {
  device_id: string;
  user_id: string;
  device_token: string;
  endpoint_arn: string;
  bundle_id?: string;
  platform?: string;
  created_at?: string;
  last_updated?: string;
  active?: boolean;
}

interface NotificationResult {
  success: boolean;
  device_id?: string;
  endpoint_arn?: string;
  device_token?: string;
  message_id?: string;
  error?: string;
}

export const notificationHandler = async (
  event: APIGatewayProxyEvent,
  context: Context,
  subRoute?: NotificationSubRoute
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Notification handler called with event:', JSON.stringify(event, null, 2));
    console.log('Sub-route:', subRoute);

    // Route to appropriate sub-handler based on sub-route
    switch (subRoute) {
      case NotificationSubRoute.SEND:
        return await handleSendNotification(event, context);
      
      case NotificationSubRoute.REGISTER_DEVICE:
        return await handleRegisterDevice(event, context);
      
      case NotificationSubRoute.LIST_DEVICES:
        return await handleListDevices(event, context);
      
      case NotificationSubRoute.DELETE_DEVICE:
        return await handleDeleteDevice(event, context);
      
      default:
        // Default to send notification if no sub-route specified
        return await handleSendNotification(event, context);
    }

  } catch (error) {
    console.error('Error in notification handler:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

// Sub-handlers
async function handleSendNotification(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  // Parse the request body
  let body: NotificationRequest;
  if (event.body) {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } else {
    body = event as any;
  }

  // Extract notification details - support both formats
  const message = body.message || 'Hello from Pulse!';
  const title = body.title || 'Pulse Notification';
  const user_id = body.user_id || body.userId;
  const device_id = body.device_id || body.deviceId;
  const device_token = body.device_token || body.deviceToken;

  console.log(`Sending notification: ${title} - ${message}`);

  // Get device tokens to send to
  let deviceTokens: DeviceToken[] = [];

  if (device_token) {
    // Direct device token provided - create temporary endpoint for testing
    deviceTokens = [{ 
      device_id: 'direct-token', 
      user_id: 'direct', 
      device_token, 
      endpoint_arn: '' 
    }];
  } else if (device_id) {
    // Send to specific device
    deviceTokens = await getDeviceToken(device_id);
  } else if (user_id) {
    // Send to all devices for a user
    deviceTokens = await getUserDeviceTokens(user_id);
  } else {
    // Send to all registered devices (for testing)
    deviceTokens = await getAllDeviceTokens();
  }

  if (deviceTokens.length === 0) {
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        error: 'No device tokens found',
        message: 'No registered devices found for the specified criteria'
      })
    };
  }

  // Send notifications
  const results: NotificationResult[] = [];
  for (const tokenInfo of deviceTokens) {
    if (tokenInfo.endpoint_arn) {
      // Regular registered device
      const result = await sendNotificationToDevice(
        tokenInfo.endpoint_arn,
        title,
        message,
        tokenInfo.device_id
      );
      results.push(result);
    } else if (tokenInfo.device_token) {
      // Direct device token - create temporary endpoint
      const result = await sendNotificationToDirectToken(
        tokenInfo.device_token,
        title,
        message,
        tokenInfo.device_id
      );
      results.push(result);
    } else {
      results.push({
        success: false,
        error: 'Invalid token info format'
      });
    }
  }

  const successfulSends = results.filter(r => r.success);
  const failedSends = results.filter(r => !r.success);

  const responseBody = {
    message: 'Notifications sent',
    total_devices: deviceTokens.length,
    successful: successfulSends.length,
    failed: failedSends.length,
    results
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(responseBody)
  };
}

async function handleRegisterDevice(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  // Parse the request body
  let body: DeviceRegistrationRequest;
  if (event.body) {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } else {
    body = event as any;
  }

  // Extract registration details
  const device_token = body.device_token || body.deviceToken;
  const user_id = body.user_id || body.userId || 'anonymous';
  const device_id = body.device_id || body.deviceId || generateUUID();
  const bundle_id = body.bundle_id || body.bundleId;
  const platform = body.platform || 'ios';
  const timestamp = body.timestamp || new Date().toISOString();

  if (!device_token) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        error: 'Missing device_token',
        message: 'device_token is required'
      })
    };
  }

  console.log(`Registering device: ${device_id} for user: ${user_id}`);

  // Create SNS platform endpoint
  const endpoint_arn = await createPlatformEndpoint(device_token, device_id);

  if (!endpoint_arn) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        error: 'Failed to create platform endpoint',
        message: 'Could not register device with SNS'
      })
    };
  }

  // Store device information in DynamoDB
  const success = await storeDeviceToken(
    device_id, 
    user_id, 
    device_token, 
    endpoint_arn, 
    bundle_id, 
    platform, 
    timestamp
  );

  if (!success) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        error: 'Failed to store device token',
        message: 'Could not save device information'
      })
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({
      message: 'Device registered successfully',
      device_id: device_id,
      endpoint_arn: endpoint_arn
    })
  };
}

async function handleListDevices(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const user_id = event.queryStringParameters?.user_id || event.queryStringParameters?.userId;

  let devices: DeviceToken[] = [];

  if (user_id) {
    // Get devices for specific user
    devices = await getUserDeviceTokens(user_id);
  } else {
    // Get all devices (for admin purposes)
    devices = await getAllDeviceTokens();
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({
      message: 'Devices retrieved successfully',
      total_devices: devices.length,
      devices: devices.map(device => ({
        device_id: device.device_id,
        user_id: device.user_id,
        platform: device.platform,
        bundle_id: device.bundle_id,
        created_at: device.created_at,
        active: device.active
      }))
    })
  };
}

async function handleDeleteDevice(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const device_id = event.pathParameters?.device_id || event.queryStringParameters?.device_id;

  if (!device_id) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        error: 'Missing device_id',
        message: 'device_id is required'
      })
    };
  }

  const success = await deleteDeviceToken(device_id);

  if (!success) {
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        error: 'Device not found',
        message: 'Could not find device to delete'
      })
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({
      message: 'Device deleted successfully',
      device_id: device_id
    })
  };
}

// Utility functions
async function getDeviceToken(deviceId: string): Promise<DeviceToken[]> {
  try {
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      console.error('DYNAMODB_TABLE_NAME environment variable not set');
      return [];
    }

    const command = new GetItemCommand({
      TableName: tableName,
      Key: marshall({ device_id: deviceId })
    });

    const response = await dynamodbClient.send(command);
    
    if (response.Item) {
      return [unmarshall(response.Item) as DeviceToken];
    }
    return [];
  } catch (error) {
    console.error('Error getting device token:', error);
    return [];
  }
}

async function getUserDeviceTokens(userId: string): Promise<DeviceToken[]> {
  try {
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      console.error('DYNAMODB_TABLE_NAME environment variable not set');
      return [];
    }

    const command = new QueryCommand({
      TableName: tableName,
      IndexName: 'user-id-index',
      KeyConditionExpression: 'user_id = :user_id',
      ExpressionAttributeValues: marshall({ ':user_id': userId })
    });

    const response = await dynamodbClient.send(command);
    return (response.Items || []).map(item => unmarshall(item) as DeviceToken);
  } catch (error) {
    console.error('Error getting user device tokens:', error);
    return [];
  }
}

async function getAllDeviceTokens(): Promise<DeviceToken[]> {
  try {
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      console.error('DYNAMODB_TABLE_NAME environment variable not set');
      return [];
    }

    const command = new ScanCommand({
      TableName: tableName
    });

    const response = await dynamodbClient.send(command);
    return (response.Items || []).map(item => unmarshall(item) as DeviceToken);
  } catch (error) {
    console.error('Error getting all device tokens:', error);
    return [];
  }
}

async function deleteDeviceToken(deviceId: string): Promise<boolean> {
  try {
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      console.error('DYNAMODB_TABLE_NAME environment variable not set');
      return false;
    }

    const command = new DeleteItemCommand({
      TableName: tableName,
      Key: marshall({ device_id: deviceId })
    });

    await dynamodbClient.send(command);
    console.log(`Deleted device token for device: ${deviceId}`);
    return true;
  } catch (error) {
    console.error('Error deleting device token:', error);
    return false;
  }
}

async function sendNotificationToDirectToken(
  deviceToken: string, 
  title: string, 
  message: string, 
  deviceId?: string
): Promise<NotificationResult> {
  try {
    const platformApplicationArn = process.env.SNS_PLATFORM_APPLICATION_ARN;
    
    if (!platformApplicationArn) {
      console.warn('No SNS Platform Application ARN configured - APNS certificate required');
      return {
        success: false,
        device_id: deviceId,
        device_token: deviceToken,
        error: 'SNS Platform Application not configured - APNS certificate required'
      };
    }

    // Create temporary endpoint
    const createCommand = new CreatePlatformEndpointCommand({
      PlatformApplicationArn: platformApplicationArn,
      Token: deviceToken,
      CustomUserData: deviceId || 'direct-token'
    });

    const createResponse = await snsClient.send(createCommand);
    const endpointArn = createResponse.EndpointArn;

    if (!endpointArn) {
      return {
        success: false,
        device_id: deviceId,
        device_token: deviceToken,
        error: 'Failed to create platform endpoint'
      };
    }

    // Send notification
    const result = await sendNotificationToDevice(endpointArn, title, message, deviceId);

    // Clean up temporary endpoint (optional - SNS will handle duplicates)
    try {
      const deleteCommand = new DeleteEndpointCommand({
        EndpointArn: endpointArn
      });
      await snsClient.send(deleteCommand);
    } catch (cleanupError) {
      console.warn('Failed to cleanup temporary endpoint:', cleanupError);
    }

    return result;

  } catch (error) {
    console.error('Failed to send notification to direct token:', error);
    return {
      success: false,
      device_id: deviceId,
      device_token: deviceToken,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function sendNotificationToDevice(
  endpointArn: string, 
  title: string, 
  message: string, 
  deviceId?: string
): Promise<NotificationResult> {
  try {
    // Create the payload for iOS APNS
    const payload = {
      APNS: JSON.stringify({
        aps: {
          alert: {
            title: title,
            body: message
          },
          sound: 'default',
          badge: 1
        },
        custom_data: {
          timestamp: new Date().toISOString()
        }
      })
    };

    // Send the notification
    const command = new PublishCommand({
      TargetArn: endpointArn,
      Message: JSON.stringify(payload),
      MessageStructure: 'json'
    });

    const response = await snsClient.send(command);
    
    console.log(`Notification sent successfully to ${deviceId || endpointArn}: ${response.MessageId}`);

    return {
      success: true,
      device_id: deviceId,
      endpoint_arn: endpointArn,
      message_id: response.MessageId
    };

  } catch (error) {
    console.error(`Failed to send notification to ${deviceId || endpointArn}:`, error);
    
    return {
      success: false,
      device_id: deviceId,
      endpoint_arn: endpointArn,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function createPlatformEndpoint(deviceToken: string, deviceId: string): Promise<string | null> {
  try {
    const platformApplicationArn = process.env.SNS_PLATFORM_APPLICATION_ARN;
    
    if (!platformApplicationArn) {
      console.warn('No SNS Platform Application ARN configured - APNS certificate required');
      // For now, return a dummy ARN so the registration can complete
      // The actual push notifications won't work until the certificate is configured
      return `arn:aws:sns:us-east-1:123456789012:app/APNS/dummy-endpoint-${deviceId}`;
    }

    const command = new CreatePlatformEndpointCommand({
      PlatformApplicationArn: platformApplicationArn,
      Token: deviceToken,
      CustomUserData: deviceId
    });

    const response = await snsClient.send(command);
    const endpointArn = response.EndpointArn;
    
    console.log(`Created platform endpoint: ${endpointArn}`);
    
    return endpointArn || null;

  } catch (error) {
    console.error('Failed to create platform endpoint:', error);
    
    // If it's an InvalidParameter error, the token might already exist
    if (error instanceof Error && error.message.includes('InvalidParameter')) {
      console.warn('Device token might already exist');
      // In a production app, you'd want to handle this case better
      // by searching for existing endpoints and updating them
    }
    
    return null;
  }
}

async function storeDeviceToken(
  deviceId: string, 
  userId: string, 
  deviceToken: string, 
  endpointArn: string, 
  bundleId?: string, 
  platform: string = 'ios', 
  timestamp?: string
): Promise<boolean> {
  try {
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
      console.error('DYNAMODB_TABLE_NAME environment variable not set');
      return false;
    }

    const command = new PutItemCommand({
      TableName: tableName,
      Item: marshall({
        device_id: deviceId,
        user_id: userId,
        device_token: deviceToken,
        endpoint_arn: endpointArn,
        bundle_id: bundleId || 'unknown',
        platform: platform,
        created_at: timestamp || new Date().toISOString(),
        last_updated: new Date().toISOString(),
        active: true
      })
    });

    await dynamodbClient.send(command);
    
    console.log(`Stored device token for device: ${deviceId}`);
    return true;

  } catch (error) {
    console.error('Failed to store device token:', error);
    return false;
  }
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
