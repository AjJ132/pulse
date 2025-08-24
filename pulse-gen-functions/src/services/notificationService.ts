import { DynamoDBClient, GetItemCommand, QueryCommand, ScanCommand, PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { snsService, SNSNotificationPayload } from './snsService';

// Initialize DynamoDB client
const dynamodbClient = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

// Notification Service interfaces
export interface DeviceToken {
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

export interface NotificationRequest {
  message?: string;
  title?: string;
  user_id?: string;
  userId?: string;
  device_id?: string;
  deviceId?: string;
  device_token?: string;
  deviceToken?: string;
}

export interface DeviceRegistrationRequest {
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

export interface NotificationResult {
  success: boolean;
  device_id?: string;
  endpoint_arn?: string;
  device_token?: string;
  message_id?: string;
  error?: string;
}

export interface DeviceRegistrationResult {
  success: boolean;
  device_id?: string;
  endpoint_arn?: string;
  error?: string;
}

export interface DeviceListResult {
  success: boolean;
  devices?: Array<{
    device_id: string;
    user_id: string;
    platform?: string;
    bundle_id?: string;
    created_at?: string;
    active?: boolean;
  }>;
  error?: string;
}

export class NotificationService {
  private tableName: string;

  constructor() {
    this.tableName = process.env.DYNAMODB_TABLE_NAME || '';
    if (!this.tableName) {
      console.error('DYNAMODB_TABLE_NAME environment variable not set');
    }
  }

  /**
   * Send notifications based on request criteria
   */
  async sendNotifications(request: NotificationRequest): Promise<{
    total_devices: number;
    successful: number;
    failed: number;
    results: NotificationResult[];
  }> {
    // Extract notification details - support both formats
    const message = request.message || 'Hello from Pulse!';
    const title = request.title || 'Pulse Notification';
    const user_id = request.user_id || request.userId;
    const device_id = request.device_id || request.deviceId;
    const device_token = request.device_token || request.deviceToken;

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
      deviceTokens = await this.getDeviceToken(device_id);
    } else if (user_id) {
      // Send to all devices for a user
      deviceTokens = await this.getUserDeviceTokens(user_id);
    } else {
      // Send to all registered devices (for testing)
      deviceTokens = await this.getAllDeviceTokens();
    }

    if (deviceTokens.length === 0) {
      return {
        total_devices: 0,
        successful: 0,
        failed: 0,
        results: []
      };
    }

    // Send notifications
    const results: NotificationResult[] = [];
    const payload: SNSNotificationPayload = {
      title,
      message,
      customData: {
        timestamp: new Date().toISOString()
      }
    };

    for (const tokenInfo of deviceTokens) {
      if (tokenInfo.endpoint_arn) {
        // Regular registered device
        const result = await this.sendNotificationToDevice(
          tokenInfo.endpoint_arn,
          payload,
          tokenInfo.device_id
        );
        results.push(result);
      } else if (tokenInfo.device_token) {
        // Direct device token - create temporary endpoint
        const result = await this.sendNotificationToDirectToken(
          tokenInfo.device_token,
          payload,
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

    return {
      total_devices: deviceTokens.length,
      successful: successfulSends.length,
      failed: failedSends.length,
      results
    };
  }

  /**
   * Register a new device
   */
  async registerDevice(request: DeviceRegistrationRequest): Promise<DeviceRegistrationResult> {
    // Extract registration details
    const device_token = request.device_token || request.deviceToken;
    const user_id = request.user_id || request.userId || 'anonymous';
    const device_id = request.device_id || request.deviceId || this.generateUUID();
    const bundle_id = request.bundle_id || request.bundleId;
    const platform = request.platform || 'ios';
    const timestamp = request.timestamp || new Date().toISOString();

    if (!device_token) {
      return {
        success: false,
        error: 'device_token is required'
      };
    }

    console.log(`Registering device: ${device_id} for user: ${user_id}`);

    // Create SNS platform endpoint
    const endpointResult = await snsService.createPlatformEndpoint({
      deviceToken: device_token,
      customUserData: device_id
    });

    if (!endpointResult.success || !endpointResult.endpointArn) {
      return {
        success: false,
        error: endpointResult.error || 'Could not register device with SNS'
      };
    }

    // Store device information in DynamoDB
    const storeResult = await this.storeDeviceToken(
      device_id, 
      user_id, 
      device_token, 
      endpointResult.endpointArn, 
      bundle_id, 
      platform, 
      timestamp
    );

    if (!storeResult) {
      return {
        success: false,
        error: 'Could not save device information'
      };
    }

    return {
      success: true,
      device_id: device_id,
      endpoint_arn: endpointResult.endpointArn
    };
  }

  /**
   * List devices for a user or all devices
   */
  async listDevices(user_id?: string): Promise<DeviceListResult> {
    let devices: DeviceToken[] = [];

    if (user_id) {
      // Get devices for specific user
      devices = await this.getUserDeviceTokens(user_id);
    } else {
      // Get all devices (for admin purposes)
      devices = await this.getAllDeviceTokens();
    }

    return {
      success: true,
      devices: devices.map(device => ({
        device_id: device.device_id,
        user_id: device.user_id,
        platform: device.platform,
        bundle_id: device.bundle_id,
        created_at: device.created_at,
        active: device.active
      }))
    };
  }

  /**
   * Delete a device
   */
  async deleteDevice(device_id: string): Promise<{ success: boolean; error?: string }> {
    const success = await this.deleteDeviceToken(device_id);

    if (!success) {
      return {
        success: false,
        error: 'Could not find device to delete'
      };
    }

    return {
      success: true
    };
  }

  // Private helper methods

  private async sendNotificationToDevice(
    endpointArn: string, 
    payload: SNSNotificationPayload, 
    deviceId?: string
  ): Promise<NotificationResult> {
    const result = await snsService.sendNotificationToEndpoint(endpointArn, payload);
    
    return {
      success: result.success,
      device_id: deviceId,
      endpoint_arn: endpointArn,
      message_id: result.messageId,
      error: result.error
    };
  }

  private async sendNotificationToDirectToken(
    deviceToken: string, 
    payload: SNSNotificationPayload, 
    deviceId?: string
  ): Promise<NotificationResult> {
    const result = await snsService.sendNotificationToDirectToken(deviceToken, payload, deviceId);
    
    return {
      success: result.success,
      device_id: deviceId,
      device_token: deviceToken,
      message_id: result.messageId,
      error: result.error
    };
  }

  private async getDeviceToken(deviceId: string): Promise<DeviceToken[]> {
    try {
      if (!this.tableName) {
        console.error('DYNAMODB_TABLE_NAME environment variable not set');
        return [];
      }

      const command = new GetItemCommand({
        TableName: this.tableName,
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

  private async getUserDeviceTokens(userId: string): Promise<DeviceToken[]> {
    try {
      if (!this.tableName) {
        console.error('DYNAMODB_TABLE_NAME environment variable not set');
        return [];
      }

      const command = new QueryCommand({
        TableName: this.tableName,
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

  private async getAllDeviceTokens(): Promise<DeviceToken[]> {
    try {
      if (!this.tableName) {
        console.error('DYNAMODB_TABLE_NAME environment variable not set');
        return [];
      }

      const command = new ScanCommand({
        TableName: this.tableName
      });

      const response = await dynamodbClient.send(command);
      return (response.Items || []).map(item => unmarshall(item) as DeviceToken);
    } catch (error) {
      console.error('Error getting all device tokens:', error);
      return [];
    }
  }

  private async deleteDeviceToken(deviceId: string): Promise<boolean> {
    try {
      if (!this.tableName) {
        console.error('DYNAMODB_TABLE_NAME environment variable not set');
        return false;
      }

      const command = new DeleteItemCommand({
        TableName: this.tableName,
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

  private async storeDeviceToken(
    deviceId: string, 
    userId: string, 
    deviceToken: string, 
    endpointArn: string, 
    bundleId?: string, 
    platform: string = 'ios', 
    timestamp?: string
  ): Promise<boolean> {
    try {
      if (!this.tableName) {
        console.error('DYNAMODB_TABLE_NAME environment variable not set');
        return false;
      }

      const command = new PutItemCommand({
        TableName: this.tableName,
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

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
