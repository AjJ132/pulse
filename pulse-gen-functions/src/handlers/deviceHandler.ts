import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { SNSClient, CreatePlatformEndpointCommand } from '@aws-sdk/client-sns';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

// Initialize AWS clients
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamodbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

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

export const deviceHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Device handler called with event:', JSON.stringify(event, null, 2));

    // Parse the request body
    let body: DeviceRegistrationRequest;
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      body = event as any;
    }

    // Extract registration details from your DeviceInfoManager
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

  } catch (error) {
    console.error('Error in device handler:', error);
    
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
