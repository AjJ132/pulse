import { NotificationRequest, DeviceRegistrationRequest } from '../services/notificationService';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ValidationUtils {
  /**
   * Validate notification request
   */
  static validateNotificationRequest(request: any): ValidationResult {
    const errors: string[] = [];

    // Check if at least one target is specified
    const hasUserId = request.user_id || request.userId;
    const hasDeviceId = request.device_id || request.deviceId;
    const hasDeviceToken = request.device_token || request.deviceToken;

    if (!hasUserId && !hasDeviceId && !hasDeviceToken) {
      errors.push('At least one target must be specified: user_id, device_id, or device_token');
    }

    // Validate message length
    const message = request.message;
    if (message && typeof message === 'string' && message.length > 256) {
      errors.push('Message must be 256 characters or less');
    }

    // Validate title length
    const title = request.title;
    if (title && typeof title === 'string' && title.length > 64) {
      errors.push('Title must be 64 characters or less');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate device registration request
   */
  static validateDeviceRegistrationRequest(request: any): ValidationResult {
    const errors: string[] = [];

    // Check required fields
    const deviceToken = request.device_token || request.deviceToken;
    if (!deviceToken) {
      errors.push('device_token is required');
    } else if (typeof deviceToken !== 'string' || deviceToken.length === 0) {
      errors.push('device_token must be a non-empty string');
    }

    // Validate user_id if provided
    const userId = request.user_id || request.userId;
    if (userId && typeof userId !== 'string') {
      errors.push('user_id must be a string');
    }

    // Validate device_id if provided
    const deviceId = request.device_id || request.deviceId;
    if (deviceId && typeof deviceId !== 'string') {
      errors.push('device_id must be a string');
    }

    // Validate bundle_id if provided
    const bundleId = request.bundle_id || request.bundleId;
    if (bundleId && typeof bundleId !== 'string') {
      errors.push('bundle_id must be a string');
    }

    // Validate platform if provided
    const platform = request.platform;
    if (platform && !['ios', 'android'].includes(platform)) {
      errors.push('platform must be either "ios" or "android"');
    }

    // Validate timestamp if provided
    const timestamp = request.timestamp;
    if (timestamp && !this.isValidISOString(timestamp)) {
      errors.push('timestamp must be a valid ISO 8601 date string');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate device deletion request
   */
  static validateDeviceDeletionRequest(deviceId: any): ValidationResult {
    const errors: string[] = [];

    if (!deviceId) {
      errors.push('device_id is required');
    } else if (typeof deviceId !== 'string' || deviceId.length === 0) {
      errors.push('device_id must be a non-empty string');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate user_id for device listing
   */
  static validateUserId(userId: any): ValidationResult {
    const errors: string[] = [];

    if (userId && typeof userId !== 'string') {
      errors.push('user_id must be a string');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if string is valid ISO 8601 date
   */
  private static isValidISOString(str: string): boolean {
    try {
      const date = new Date(str);
      return date.toISOString() === str;
    } catch {
      return false;
    }
  }

  /**
   * Sanitize notification request
   */
  static sanitizeNotificationRequest(request: any): NotificationRequest {
    return {
      message: request.message,
      title: request.title,
      user_id: request.user_id || request.userId,
      userId: request.userId || request.user_id,
      device_id: request.device_id || request.deviceId,
      deviceId: request.deviceId || request.device_id,
      device_token: request.device_token || request.deviceToken,
      deviceToken: request.deviceToken || request.device_token
    };
  }

  /**
   * Sanitize device registration request
   */
  static sanitizeDeviceRegistrationRequest(request: any): DeviceRegistrationRequest {
    return {
      device_token: request.device_token || request.deviceToken,
      deviceToken: request.deviceToken || request.device_token,
      user_id: request.user_id || request.userId,
      userId: request.userId || request.user_id,
      device_id: request.device_id || request.deviceId,
      deviceId: request.deviceId || request.device_id,
      bundle_id: request.bundle_id || request.bundleId,
      bundleId: request.bundleId || request.bundle_id,
      platform: request.platform,
      timestamp: request.timestamp
    };
  }
}
