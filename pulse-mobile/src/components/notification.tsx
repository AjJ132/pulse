"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  isPushNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  urlB64ToUint8Array,
  getUserId,
  storeSubscriptionData,
  getStoredSubscriptionData,
  clearSubscriptionData,
  formatNotificationError,
  debugLog,
  errorLog
} from '@/lib/utils';
import {
  getVapidPublicKey,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  sendTestNotification,
  PushSubscriptionData
} from '@/lib/aws-client';

interface NotificationComponentProps {
  onSubscriptionChange?: (isSubscribed: boolean) => void;
}

export default function NotificationComponent({ 
  onSubscriptionChange 
}: NotificationComponentProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'not-supported'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  const checkInitialState = useCallback(async () => {
    if (!isPushNotificationSupported()) {
      setPermission('not-supported');
      return;
    }

    setPermission(getNotificationPermission());
    await checkSubscriptionStatus();
  }, []);

  useEffect(() => {
    checkInitialState();
  }, [checkInitialState]);

  useEffect(() => {
    onSubscriptionChange?.(isSubscribed);
  }, [isSubscribed, onSubscriptionChange]);

  const checkSubscriptionStatus = async () => {
    try {
      if (!('serviceWorker' in navigator)) {
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        return;
      }

      const subscription = await registration.pushManager.getSubscription();
      setSubscription(subscription);
      
      const { subscriptionId } = getStoredSubscriptionData();
      const hasStoredSubscription = !!subscriptionId;
      const hasActiveSubscription = !!subscription;
      
      setIsSubscribed(hasStoredSubscription && hasActiveSubscription);
      
      debugLog('Subscription status checked', {
        hasStoredSubscription,
        hasActiveSubscription,
        subscription: subscription?.endpoint
      });
    } catch (error) {
      errorLog('Error checking subscription status', error as Error);
    }
  };

  const showNotification = async () => {
    setIsLoading(true);
    setError(null);

    try {
      debugLog('Starting notification subscription process');
      
      // Request permission
      const permissionResult = await requestNotificationPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Subscribe to push notifications
      await subscribeUser();
      
    } catch (error) {
      const errorMessage = formatNotificationError(error as Error);
      setError(errorMessage);
      errorLog('Notification subscription failed', error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeUser = async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported');
    }

    try {
      debugLog('Getting VAPID public key from AWS');
      
      // Get VAPID public key from AWS
      const vapidKey = await getVapidPublicKey();
      
      debugLog('Getting service worker registration');
      
      // Get or register service worker
      let registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }

      debugLog('Service worker ready, creating push subscription');
      
      // Generate push subscription
      await generateSubscribeEndPoint(registration, vapidKey);
      
    } catch (error) {
      errorLog('Error subscribing user', error as Error);
      throw error;
    }
  };

  const generateSubscribeEndPoint = async (registration: ServiceWorkerRegistration, vapidKey: string) => {
    try {
      const applicationServerKey = urlB64ToUint8Array(vapidKey);
      
      const options = {
        applicationServerKey: applicationServerKey as BufferSource,
        userVisibleOnly: true, // Mandatory in Chrome
      };

      debugLog('Subscribing to push manager with options', options);
      
      const subscription = await registration.pushManager.subscribe(options);
      setSubscription(subscription);

      debugLog('Push subscription created', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.getKey('p256dh') ? 'present' : 'missing',
          auth: subscription.getKey('auth') ? 'present' : 'missing'
        }
      });

      // Store subscription in AWS backend
      await storeSubscriptionInAWS(subscription);
      
      setIsSubscribed(true);
      
    } catch (error) {
      errorLog('Error generating subscription endpoint', error as Error);
      throw error;
    }
  };

  const storeSubscriptionInAWS = async (subscription: PushSubscription) => {
    try {
      const userId = getUserId();
      const subscriptionData = subscription.toJSON() as PushSubscriptionData;
      
      debugLog('Storing subscription in AWS', { userId, endpoint: subscriptionData.endpoint });
      
      const result = await subscribeToNotifications(userId, subscriptionData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to store subscription in AWS');
      }
      
      // Store subscription data locally
      storeSubscriptionData(result.data?.subscription_id || 'aws-subscription', userId);
      
      debugLog('Subscription stored in AWS backend', result);
      
    } catch (error) {
      errorLog('Error storing subscription in AWS backend', error as Error);
      throw error;
    }
  };

  const removeNotification = async () => {
    setIsLoading(true);
    setError(null);

    try {
      debugLog('Starting unsubscription process');
      
      // Unsubscribe from AWS backend
      await unsubscribeFromAWS();
      
      // Unsubscribe from push manager
      if (subscription) {
        await subscription.unsubscribe();
        setSubscription(null);
      }

      // Clear local data
      clearSubscriptionData();
      setIsSubscribed(false);
      
      debugLog('Successfully unsubscribed from notifications');
      
    } catch (error) {
      const errorMessage = formatNotificationError(error as Error);
      setError(errorMessage);
      errorLog('Unsubscription failed', error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromAWS = async () => {
    try {
      const userId = getUserId();
      
      debugLog('Unsubscribing from AWS', { userId });
      
      const result = await unsubscribeFromNotifications(userId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to unsubscribe from AWS');
      }

      debugLog('Successfully unsubscribed from AWS backend');
      
    } catch (error) {
      errorLog('Error unsubscribing from AWS backend', error as Error);
      throw error;
    }
  };

  const sendTestNotificationToAWS = async () => {
    if (!isSubscribed) {
      setError('Please subscribe to notifications first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userId = getUserId();
      
      debugLog('Sending test notification via AWS', { userId });
      
      const result = await sendTestNotification(
        userId,
        'Test Notification 🚀',
        'This is a test notification from Pulse PWA!',
        '/icon.svg',
        '/'
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to send test notification');
      }

      debugLog('Test notification sent successfully via AWS', result);
      
    } catch (error) {
      const errorMessage = formatNotificationError(error as Error);
      setError(errorMessage);
      errorLog('Test notification failed', error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPermissionStatusColor = () => {
    switch (permission) {
      case 'granted':
        return 'text-green-600 bg-green-50';
      case 'denied':
        return 'text-red-600 bg-red-50';
      case 'not-supported':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getPermissionStatusText = () => {
    switch (permission) {
      case 'granted':
        return '✅ Notifications Enabled';
      case 'denied':
        return '🚫 Notifications Blocked';
      case 'not-supported':
        return '❌ Not Supported';
      default:
        return '⚠️ Permission Required';
    }
  };

  if (permission === 'not-supported') {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Push Notifications</h3>
        <p className="text-gray-600">
          Push notifications are not supported on this device or browser.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Push Notifications</h3>
      
      {/* Permission Status */}
      <div className={`p-3 rounded-md mb-4 ${getPermissionStatusColor()}`}>
        <p className="font-medium">{getPermissionStatusText()}</p>
        {permission === 'denied' && (
          <p className="text-sm mt-1">
            To enable: Settings → Safari → Website Settings → Notifications
          </p>
        )}
      </div>

      {/* Subscription Status */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Status: <span className={`font-medium ${isSubscribed ? 'text-green-600' : 'text-gray-600'}`}>
            {isSubscribed ? 'Subscribed' : 'Not subscribed'}
          </span>
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md mb-4">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {!isSubscribed ? (
          <button
            onClick={showNotification}
            disabled={isLoading || permission === 'denied'}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Subscribing...' : 'Enable Notifications'}
          </button>
        ) : (
          <>
            <button
              onClick={removeNotification}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Unsubscribing...' : 'Disable Notifications'}
            </button>
            
            <button
              onClick={sendTestNotificationToAWS}
              disabled={isLoading}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Sending...' : 'Send Test Notification'}
            </button>
          </>
        )}
      </div>

      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-xs text-gray-500">
          <summary className="cursor-pointer">Debug Info</summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
            {JSON.stringify({
              permission,
              isSubscribed,
              hasSubscription: !!subscription,
              awsApiConfigured: !!process.env.NEXT_PUBLIC_AWS_API_URL,
              storedData: getStoredSubscriptionData()
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
