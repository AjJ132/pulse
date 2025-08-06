/**
 * AWS API Client for Pulse Push Notifications
 * Communicates with the deployed AWS Lambda functions via API Gateway
 */

const AWS_API_URL = process.env.NEXT_PUBLIC_AWS_API_URL;

// Only throw error at runtime, not during build
function getApiUrl(): string {
  if (!AWS_API_URL) {
    throw new Error('NEXT_PUBLIC_AWS_API_URL environment variable is not set');
  }
  return AWS_API_URL;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SubscribeRequest {
  user_id: string;
  subscription: PushSubscriptionData;
}

export interface UnsubscribeRequest {
  user_id: string;
}

export interface SendNotificationRequest {
  user_id: string;
  title: string;
  message: string;
  icon?: string;
  url?: string;
}

export interface SubscriptionResponse {
  subscription_id: string;
  user_id: string;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Get VAPID public key from AWS
 */
export async function getVapidPublicKey(): Promise<string> {
  try {
    const response = await fetch(`${getApiUrl()}/vapid`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch VAPID key: ${response.status}`);
    }

    const data = await response.json();
    return data.publicKey;
  } catch (error) {
    console.error('Error fetching VAPID public key:', error);
    throw error;
  }
}

/**
 * Subscribe to push notifications via AWS
 */
export async function subscribeToNotifications(
  userId: string,
  subscription: PushSubscriptionData
): Promise<ApiResponse<SubscriptionResponse>> {
  try {
    const response = await fetch(`${getApiUrl()}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        subscription,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Subscription failed: ${response.status}`);
    }

    return {
      success: true,
      data,
      message: 'Successfully subscribed to push notifications',
    };
  } catch (error) {
    console.error('Error subscribing to notifications:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Unsubscribe from push notifications via AWS
 */
export async function unsubscribeFromNotifications(userId: string): Promise<ApiResponse> {
  try {
    const response = await fetch(`${getApiUrl()}/subscriptions`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Unsubscribe failed: ${response.status}`);
    }

    return {
      success: true,
      data,
      message: 'Successfully unsubscribed from push notifications',
    };
  } catch (error) {
    console.error('Error unsubscribing from notifications:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send a test notification via AWS
 */
export async function sendTestNotification(
  userId: string,
  title: string,
  message: string,
  icon?: string,
  url?: string
): Promise<ApiResponse> {
  try {
    const response = await fetch(`${getApiUrl()}/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        title,
        message,
        icon: icon || '/icon.svg',
        url: url || '/',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Send notification failed: ${response.status}`);
    }

    return {
      success: true,
      data,
      message: 'Test notification sent successfully',
    };
  } catch (error) {
    console.error('Error sending test notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send quest completion notification
 */
export async function sendQuestCompletionNotification(
  reviewerUserId: string,
  completerName: string,
  questName: string
): Promise<ApiResponse> {
  return await sendTestNotification(
    reviewerUserId,
    'Quest Completed! 🎯',
    `${completerName} just completed the quest: ${questName}`,
    '/icon.svg',
    '/quests'
  );
}

/**
 * Send quest approval notification
 */
export async function sendQuestApprovalNotification(
  questOwnerUserId: string,
  approverName: string,
  questName: string
): Promise<ApiResponse> {
  return await sendTestNotification(
    questOwnerUserId,
    'Quest Approved! ✅',
    `${approverName} approved your quest: ${questName}`,
    '/icon.svg',
    '/progress'
  );
}

/**
 * Health check for the API
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${getApiUrl()}/vapid`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}
