import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { NotificationSubRoute } from '../types/routes';
import { notificationService } from '../services/notificationService';
import { ValidationUtils, ValidationResult } from '../utils/validation';

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
    
    return createErrorResponse(500, 'Internal server error', error instanceof Error ? error.message : 'Unknown error');
  }
};

// Sub-handlers
async function handleSendNotification(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  // Parse the request body
  let body: any;
  if (event.body) {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } else {
    body = event as any;
  }

  // Validate input
  const validation = ValidationUtils.validateNotificationRequest(body);
  if (!validation.isValid) {
    return createErrorResponse(400, 'Validation failed', validation.errors.join(', '));
  }

  // Sanitize input
  const sanitizedRequest = ValidationUtils.sanitizeNotificationRequest(body);

  // Call notification service
  const result = await notificationService.sendNotifications(sanitizedRequest);

  if (result.total_devices === 0) {
    return createErrorResponse(404, 'No device tokens found', 'No registered devices found for the specified criteria');
  }

  const responseBody = {
    message: 'Notifications sent',
    total_devices: result.total_devices,
    successful: result.successful,
    failed: result.failed,
    results: result.results
  };

  return createSuccessResponse(200, responseBody);
}

async function handleRegisterDevice(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  // Parse the request body
  let body: any;
  if (event.body) {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } else {
    body = event as any;
  }

  // Validate input
  const validation = ValidationUtils.validateDeviceRegistrationRequest(body);
  if (!validation.isValid) {
    return createErrorResponse(400, 'Validation failed', validation.errors.join(', '));
  }

  // Sanitize input
  const sanitizedRequest = ValidationUtils.sanitizeDeviceRegistrationRequest(body);

  // Call notification service
  const result = await notificationService.registerDevice(sanitizedRequest);

  if (!result.success) {
    return createErrorResponse(500, 'Registration failed', result.error || 'Unknown error');
  }

  const responseBody = {
    message: 'Device registered successfully',
    device_id: result.device_id,
    endpoint_arn: result.endpoint_arn
  };

  return createSuccessResponse(200, responseBody);
}

async function handleListDevices(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const user_id = event.queryStringParameters?.user_id || event.queryStringParameters?.userId;

  // Validate input
  const validation = ValidationUtils.validateUserId(user_id);
  if (!validation.isValid) {
    return createErrorResponse(400, 'Validation failed', validation.errors.join(', '));
  }

  // Call notification service
  const result = await notificationService.listDevices(user_id || undefined);

  if (!result.success) {
    return createErrorResponse(500, 'Failed to list devices', result.error || 'Unknown error');
  }

  const responseBody = {
    message: 'Devices retrieved successfully',
    total_devices: result.devices?.length || 0,
    devices: result.devices || []
  };

  return createSuccessResponse(200, responseBody);
}

async function handleDeleteDevice(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  const device_id = event.pathParameters?.device_id || event.queryStringParameters?.device_id;

  // Validate input
  const validation = ValidationUtils.validateDeviceDeletionRequest(device_id);
  if (!validation.isValid) {
    return createErrorResponse(400, 'Validation failed', validation.errors.join(', '));
  }

  // Call notification service
  const result = await notificationService.deleteDevice(device_id!);

  if (!result.success) {
    return createErrorResponse(404, 'Device not found', result.error || 'Could not find device to delete');
  }

  const responseBody = {
    message: 'Device deleted successfully',
    device_id: device_id
  };

  return createSuccessResponse(200, responseBody);
}

// Helper functions for creating responses
function createSuccessResponse(statusCode: number, body: any): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(body)
  };
}

function createErrorResponse(statusCode: number, error: string, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({
      error,
      message
    })
  };
}
