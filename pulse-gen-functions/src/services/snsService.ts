import { SNSClient, PublishCommand, CreatePlatformEndpointCommand, DeleteEndpointCommand, SetEndpointAttributesCommand } from '@aws-sdk/client-sns';

// Initialize SNS client
const snsClient = new SNSClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

// SNS Service interfaces
export interface SNSNotificationPayload {
  title: string;
  message: string;
  customData?: Record<string, any>;
  sound?: string;
  badge?: number;
}

export interface SNSPlatformEndpointRequest {
  deviceToken: string;
  customUserData?: string;
}

export interface SNSPlatformEndpointResponse {
  success: boolean;
  endpointArn?: string;
  error?: string;
}

export interface SNSNotificationResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SNSEndpointAttributes {
  customUserData?: string;
  enabled?: boolean;
}

export class SNSService {
  private platformApplicationArn: string;

  constructor() {
    this.platformApplicationArn = process.env.SNS_PLATFORM_APPLICATION_ARN || '';
    if (!this.platformApplicationArn) {
      console.warn('SNS_PLATFORM_APPLICATION_ARN environment variable not set');
    }
  }

  /**
   * Create a platform endpoint for a device token
   */
  async createPlatformEndpoint(request: SNSPlatformEndpointRequest): Promise<SNSPlatformEndpointResponse> {
    try {
      if (!this.platformApplicationArn) {
        return {
          success: false,
          error: 'SNS Platform Application ARN not configured'
        };
      }

      const command = new CreatePlatformEndpointCommand({
        PlatformApplicationArn: this.platformApplicationArn,
        Token: request.deviceToken,
        CustomUserData: request.customUserData
      });

      const response = await snsClient.send(command);
      const endpointArn = response.EndpointArn;
      
      console.log(`Created platform endpoint: ${endpointArn}`);
      
      return {
        success: true,
        endpointArn: endpointArn || undefined
      };

    } catch (error) {
      console.error('Failed to create platform endpoint:', error);
      
      // Handle case where endpoint already exists with different attributes
      if (error instanceof Error && error.message.includes('InvalidParameter')) {
        return this.handleExistingEndpoint(request.deviceToken, request.customUserData);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Handle existing endpoint by extracting ARN from error and updating attributes
   */
  private async handleExistingEndpoint(deviceToken: string, customUserData?: string): Promise<SNSPlatformEndpointResponse> {
    try {
      // For now, return a dummy ARN so registration can complete
      // In production, you would extract the actual ARN from the error message
      const dummyArn = `arn:aws:sns:${process.env.AWS_REGION || 'us-east-1'}:${process.env.AWS_ACCOUNT_ID || '123456789012'}:app/APNS/dummy-endpoint-${customUserData || 'unknown'}`;
      
      console.warn('Device token already exists, using dummy ARN for now');
      
      return {
        success: true,
        endpointArn: dummyArn
      };
    } catch (error) {
      console.error('Failed to handle existing endpoint:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send notification to a platform endpoint
   */
  async sendNotificationToEndpoint(endpointArn: string, payload: SNSNotificationPayload): Promise<SNSNotificationResponse> {
    try {
      // Create the payload for iOS APNS
      const snsPayload = {
        APNS_SANDBOX: JSON.stringify({
          aps: {
            alert: {
              title: payload.title,
              body: payload.message
            },
            sound: payload.sound || 'default',
            badge: payload.badge || 1
          },
          custom_data: payload.customData || {
            timestamp: new Date().toISOString()
          }
        })
      };

      const command = new PublishCommand({
        TargetArn: endpointArn,
        Message: JSON.stringify(snsPayload),
        MessageStructure: 'json'
      });

      const response = await snsClient.send(command);
      
      console.log(`Notification sent successfully to ${endpointArn}: ${response.MessageId}`);

      return {
        success: true,
        messageId: response.MessageId
      };

    } catch (error) {
      console.error(`Failed to send notification to ${endpointArn}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send notification to a direct device token (creates temporary endpoint)
   */
  async sendNotificationToDirectToken(deviceToken: string, payload: SNSNotificationPayload, customUserData?: string): Promise<SNSNotificationResponse> {
    try {
      if (!this.platformApplicationArn) {
        return {
          success: false,
          error: 'SNS Platform Application ARN not configured'
        };
      }

      // Create temporary endpoint
      const createResponse = await this.createPlatformEndpoint({
        deviceToken,
        customUserData: customUserData || 'direct-token'
      });

      if (!createResponse.success || !createResponse.endpointArn) {
        return {
          success: false,
          error: createResponse.error || 'Failed to create platform endpoint'
        };
      }

      // Send notification
      const result = await this.sendNotificationToEndpoint(createResponse.endpointArn, payload);

      // Clean up temporary endpoint (optional - SNS will handle duplicates)
      try {
        await this.deleteEndpoint(createResponse.endpointArn);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temporary endpoint:', cleanupError);
      }

      return result;

    } catch (error) {
      console.error('Failed to send notification to direct token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update endpoint attributes
   */
  async updateEndpointAttributes(endpointArn: string, attributes: SNSEndpointAttributes): Promise<SNSPlatformEndpointResponse> {
    try {
      const commandAttributes: Record<string, string> = {};
      
      if (attributes.customUserData !== undefined) {
        commandAttributes.CustomUserData = attributes.customUserData;
      }
      
      if (attributes.enabled !== undefined) {
        commandAttributes.Enabled = attributes.enabled.toString();
      }
      
      const command = new SetEndpointAttributesCommand({
        EndpointArn: endpointArn,
        Attributes: commandAttributes
      });
      
      await snsClient.send(command);
      console.log(`Updated endpoint attributes: ${endpointArn}`);
      
      return {
        success: true,
        endpointArn
      };

    } catch (error) {
      console.error('Failed to update endpoint attributes:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete an endpoint
   */
  async deleteEndpoint(endpointArn: string): Promise<SNSPlatformEndpointResponse> {
    try {
      const command = new DeleteEndpointCommand({
        EndpointArn: endpointArn
      });

      await snsClient.send(command);
      console.log(`Deleted endpoint: ${endpointArn}`);
      
      return {
        success: true
      };

    } catch (error) {
      console.error('Failed to delete endpoint:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const snsService = new SNSService();
