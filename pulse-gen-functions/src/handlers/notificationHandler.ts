import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { SNSClient, PublishCommand, CreatePlatformEndpointCommand, DeleteEndpointCommand } from '@aws-sdk/client-sns';
import { DynamoDBClient, GetItemCommand, QueryCommand, ScanCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

// Initialize AWS clients
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

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
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Notification handler called with event:', JSON.stringify(event, null, 2));

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

  } catch (error) {
    console.error('Error in notification handler:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

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
