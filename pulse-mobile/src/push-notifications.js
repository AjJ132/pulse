// Push Notification Service for iOS Safari PWA using Web Push Protocol
class PushNotificationService {
  constructor() {
    this.apiEndpoint = 'https://p2kgt1b98i.execute-api.us-east-1.amazonaws.com/dev';
    this.topicName = 'aj-general';
    
    // VAPID public key will be fetched dynamically from the backend
    this.vapidPublicKey = null;
    this.vapidKeyFetched = false;
  }

  // Check if device supports iOS notifications
  isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  // Check if running as PWA (added to home screen)
  isPWA() {
    return window.navigator.standalone === true || 
           window.matchMedia('(display-mode: standalone)').matches;
  }

  // Fetch VAPID public key from backend
  async fetchVapidPublicKey() {
    if (this.vapidKeyFetched && this.vapidPublicKey) {
      console.log('✅ VAPID public key already cached');
      return this.vapidPublicKey;
    }

    try {
      console.log('🔑 Fetching VAPID public key from backend...');
      
      const response = await fetch(`${this.apiEndpoint}/vapid`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('📡 VAPID key response status:', response.status, response.statusText);

      if (!response.ok) {
        const error = await response.text();
        console.error('🚫 Failed to fetch VAPID key:', error);
        throw new Error(`Failed to fetch VAPID key: ${response.status} - ${error}`);
      }

      const result = await response.json();
      this.vapidPublicKey = result.publicKey;
      this.vapidKeyFetched = true;

      console.log('✅ VAPID public key fetched successfully:', this.vapidPublicKey.substring(0, 20) + '...');
      return this.vapidPublicKey;

    } catch (error) {
      console.error('💥 Error fetching VAPID public key:', error);
      console.error('🔍 Network error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Request notification permission
  async requestPermission() {
    if (!('Notification' in window)) {
      console.error('🚫 Browser does not support notifications');
      return false;
    }

    console.log('🔔 Current notification permission status:', Notification.permission);
    
    // If already denied, log helpful information
    if (Notification.permission === 'denied') {
      console.error('🚫 Notifications were previously denied. User must manually enable in browser settings.');
      console.log('📱 iOS Safari: Settings > Safari > Website Settings > Notifications');
      console.log('🖥️  Chrome: Site Information (lock icon) > Notifications');
      return false;
    }

    // If already granted, no need to request again
    if (Notification.permission === 'granted') {
      console.log('✅ Notification permission already granted');
      return true;
    }

    console.log('🔔 Requesting notification permission...');
    const permission = await Notification.requestPermission();
    
    console.log('🔔 Permission request result:', permission);
    
    switch (permission) {
      case 'granted':
        console.log('✅ Notification permission granted successfully');
        break;
      case 'denied':
        console.error('🚫 Notification permission denied by user');
        console.log('💡 To enable notifications:');
        console.log('   iOS Safari: Settings > Safari > Website Settings > Notifications');
        console.log('   Chrome: Click the lock icon > Notifications > Allow');
        console.log('   Firefox: Click the shield icon > Permissions > Notifications');
        break;
      case 'default':
        console.warn('⚠️  Notification permission dismissed (default state)');
        console.log('💡 User dismissed the permission dialog. Try subscribing again.');
        break;
      default:
        console.warn('⚠️  Unknown permission state:', permission);
    }
    
    return permission === 'granted';
  }

  // Subscribe to push notifications for iOS Safari
  async subscribeToPushNotifications() {
    try {
      console.log('🚀 Attempting to subscribe to push notifications...');
      console.log('📱 Device info:', {
        userAgent: navigator.userAgent,
        isIOSDevice: this.isIOSDevice(),
        isPWA: this.isPWA(),
        isStandalone: window.navigator.standalone,
        displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'
      });
      
      // Request permission first
      const permissionGranted = await this.requestPermission();
      if (!permissionGranted) {
        console.error('🚫 Cannot subscribe: Notification permission not granted');
        console.log('📋 Subscription failed due to permission denial');
        return false;
      }

      // Fetch VAPID public key before subscribing
      await this.fetchVapidPublicKey();

      // Use Web Push for both iOS PWA and other browsers
      if (this.isIOSDevice() && this.isPWA()) {
        console.log('📱 Using iOS PWA Web Push subscription method');
        return await this.subscribeIOSPWA();
      } else {
        console.log('🌐 Using standard Web Push subscription method');
        return await this.subscribeWebPush();
      }
    } catch (error) {
      console.error('💥 Error subscribing to push notifications:', error);
      console.error('🔍 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  // Subscribe for iOS PWA using Web Push Protocol with VAPID
  async subscribeIOSPWA() {
    try {
      console.log('📱 Starting iOS PWA Web Push subscription process...');
      
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.error('🚫 Push notifications are not supported on this device');
        console.log('📋 Browser capabilities:', {
          serviceWorker: 'serviceWorker' in navigator,
          pushManager: 'PushManager' in window,
          notifications: 'Notification' in window
        });
        return false;
      }

      if (!this.vapidPublicKey) {
        throw new Error('VAPID public key not available');
      }

      console.log('⏳ Waiting for service worker to be ready...');
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ Service worker ready:', registration);
      
      // Convert VAPID public key to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
      
      console.log('🔔 Subscribing to push manager with VAPID key...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      console.log('✅ Web Push subscription created:', {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime,
        keys: {
          p256dh: subscription.getKey('p256dh') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))) : null,
          auth: subscription.getKey('auth') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))) : null
        }
      });

      // Send the full subscription object to backend
      console.log('☁️  Sending Web Push subscription to backend...');
      await this.sendWebPushSubscriptionToBackend(subscription);

      console.log('✅ Successfully subscribed to iOS Web Push notifications');
      return true;
    } catch (error) {
      console.error('💥 Error subscribing to iOS Web Push notifications:', error);
      console.error('🔍 Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Provide specific guidance for common iOS issues
      if (error.name === 'NotAllowedError') {
        console.error('🚫 Permission denied - user must enable notifications in Safari settings');
      } else if (error.name === 'NotSupportedError') {
        console.error('🚫 Push notifications not supported - ensure app is added to home screen and iOS 16.4+');
      } else if (error.name === 'AbortError') {
        console.error('🚫 Push subscription was aborted - try again');
      }
      
      return false;
    }
  }

  // Fallback subscription for web browsers
  async subscribeWebPush() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.error('Push notifications are not supported');
        return false;
      }

      if (!this.vapidPublicKey) {
        throw new Error('VAPID public key not available');
      }

      const registration = await navigator.serviceWorker.ready;
      
      // Convert VAPID public key to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      // For web browsers, we'll use the full subscription object
      await this.sendWebPushSubscriptionToBackend(subscription);

      console.log('Successfully subscribed to web push notifications');
      return true;
    } catch (error) {
      console.error('Error subscribing to web push notifications:', error);
      return false;
    }
  }

  // Helper function to convert VAPID key from base64 to Uint8Array
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Send Web Push subscription to backend (simplified without SNS)
  async sendWebPushSubscriptionToBackend(subscription) {
    try {
      // Extract subscription data for Web Push
      const subscriptionData = subscription.toJSON();
      
      const requestData = {
        user_id: this.getUserId(),
        subscription: subscriptionData, // Send full Web Push subscription
        topic: this.topicName
      };
      
      console.log('☁️  Sending Web Push subscription to backend:', {
        ...requestData,
        subscription: {
          endpoint: subscriptionData.endpoint.substring(0, 50) + '...',
          keys: subscriptionData.keys ? 'present' : 'missing'
        }
      });

      const response = await fetch(`${this.apiEndpoint}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      console.log('📡 Backend response status:', response.status, response.statusText);

      if (!response.ok) {
        const error = await response.text();
        console.error('🚫 Backend error response:', error);
        console.error('📋 Request details:', {
          url: `${this.apiEndpoint}/subscriptions`,
          method: 'POST',
          status: response.status,
          statusText: response.statusText
        });
        throw new Error(`Failed to subscribe to backend: ${response.status} - ${error}`);
      }

      const result = await response.json();
      console.log('✅ Successfully subscribed to backend:', result);
      
      // Store subscription info locally
      localStorage.setItem('pulse_subscription_id', result.subscription_id);
      localStorage.setItem('pulse_user_id', result.user_id);
      console.log('💾 Stored subscription info locally');
      
      return result;
    } catch (error) {
      console.error('💥 Error sending Web Push subscription to backend:', error);
      console.error('🔍 Network error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Get user ID (you can implement your own user identification)
  getUserId() {
    // For demo purposes, generate a random ID
    // In production, you'd get this from your auth system
    let userId = localStorage.getItem('pulse_user_id');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('pulse_user_id', userId);
    }
    return userId;
  }

  // Unsubscribe from push notifications
  async unsubscribeFromPushNotifications() {
    try {
      // First unsubscribe from backend
      await this.unsubscribeFromBackend();
      
      // Then unsubscribe from local push manager
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Clear stored subscription info
      localStorage.removeItem('pulse_subscription_id');
      
      console.log('Successfully unsubscribed from push notifications');
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }

  // Unsubscribe from backend
  async unsubscribeFromBackend() {
    try {
      const response = await fetch(`${this.apiEndpoint}/subscriptions`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: this.getUserId()
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Server response:', error);
        throw new Error(`Failed to unsubscribe from backend: ${response.status}`);
      }

      const result = await response.json();
      console.log('Successfully unsubscribed from backend:', result);
      return result;
    } catch (error) {
      console.error('Error unsubscribing from backend:', error);
      throw error;
    }
  }

  // Send a test notification (for manual testing)
  async sendTestNotification(title = 'Test Notification', message = 'This is a test notification from Pulse!', data = {}) {
    try {
      console.log('📨 Sending test notification:', { title, message, data });
      
      const response = await fetch(`${this.apiEndpoint}/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title,
          message: message,
          data: {
            ...data,
            test: true
          }
        })
      });

      console.log('📡 Test notification response status:', response.status, response.statusText);

      if (!response.ok) {
        const error = await response.text();
        console.error('🚫 Failed to send test notification:', error);
        throw new Error(`Failed to send test notification: ${response.status} - ${error}`);
      }

      const result = await response.json();
      console.log('✅ Test notification sent successfully:', result);
      return result;

    } catch (error) {
      console.error('💥 Error sending test notification:', error);
      throw error;
    }
  }

  // Check if user is subscribed
  async isSubscribed() {
    try {
      // Check if we have stored subscription info from backend
      const subscriptionId = localStorage.getItem('pulse_subscription_id');
      if (subscriptionId) {
        return true;
      }

      // Fallback to checking service worker subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return !!subscription;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  // Get the topic name for display
  getTopicName() {
    return this.topicName;
  }

  // Get subscription info
  getSubscriptionInfo() {
    return {
      subscriptionId: localStorage.getItem('pulse_subscription_id'),
      userId: this.getUserId(),
      topic: this.topicName,
      apiEndpoint: this.apiEndpoint
    };
  }

  // Get detailed diagnostic information for debugging
  async getDiagnosticInfo() {
    const info = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      notificationSupport: 'Notification' in window,
      notificationPermission: 'Notification' in window ? Notification.permission : 'not-supported',
      serviceWorkerSupport: 'serviceWorker' in navigator,
      pushManagerSupport: 'PushManager' in window,
      isIOSDevice: this.isIOSDevice(),
      isPWA: this.isPWA(),
      isStandalone: window.navigator.standalone,
      displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
      localStorage: {
        userId: localStorage.getItem('pulse_user_id'),
        subscriptionId: localStorage.getItem('pulse_subscription_id')
      },
      config: {
        apiEndpoint: this.apiEndpoint,
        topicName: this.topicName,
        vapidPublicKey: this.vapidPublicKey ? this.vapidPublicKey.substring(0, 20) + '...' : 'not-fetched',
        vapidKeyFetched: this.vapidKeyFetched
      }
    };

    // Check service worker status
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        info.serviceWorker = {
          scope: registration.scope,
          updatefound: !!registration.updatefound,
          installing: !!registration.installing,
          waiting: !!registration.waiting,
          active: !!registration.active
        };

        // Check push subscription
        if ('pushManager' in registration) {
          const subscription = await registration.pushManager.getSubscription();
          info.pushSubscription = {
            exists: !!subscription,
            endpoint: subscription?.endpoint,
            expirationTime: subscription?.expirationTime
          };
        }
      } catch (error) {
        info.serviceWorkerError = error.message;
      }
    }

    return info;
  }

  // Log diagnostic information to console
  async logDiagnostics() {
    console.log('🔍 Pulse Notification Diagnostics');
    console.log('================================');
    
    const diagnostics = await this.getDiagnosticInfo();
    
    console.log('📱 Device & Browser Info:');
    console.log('  User Agent:', diagnostics.userAgent);
    console.log('  iOS Device:', diagnostics.isIOSDevice);
    console.log('  PWA Mode:', diagnostics.isPWA);
    console.log('  Standalone:', diagnostics.isStandalone);
    console.log('  Display Mode:', diagnostics.displayMode);
    console.log('');
    
    console.log('🔔 Notification Support:');
    console.log('  Notification API:', diagnostics.notificationSupport);
    console.log('  Permission Status:', diagnostics.notificationPermission);
    console.log('  Service Worker:', diagnostics.serviceWorkerSupport);
    console.log('  Push Manager:', diagnostics.pushManagerSupport);
    console.log('');
    
    console.log('⚙️ Configuration:');
    console.log('  API Endpoint:', diagnostics.config.apiEndpoint);
    console.log('  Topic:', diagnostics.config.topicName);
    console.log('  VAPID Public Key:', diagnostics.config.vapidPublicKey);
    console.log('  VAPID Key Fetched:', diagnostics.config.vapidKeyFetched);
    console.log('');
    
    console.log('💾 Local Storage:');
    console.log('  User ID:', diagnostics.localStorage.userId);
    console.log('  Subscription ID:', diagnostics.localStorage.subscriptionId ? 'Set' : 'Not set');
    console.log('');
    
    if (diagnostics.serviceWorker) {
      console.log('🔧 Service Worker:');
      console.log('  Scope:', diagnostics.serviceWorker.scope);
      console.log('  Active:', diagnostics.serviceWorker.active);
      console.log('');
    }
    
    if (diagnostics.pushSubscription) {
      console.log('📡 Push Subscription:');
      console.log('  Exists:', diagnostics.pushSubscription.exists);
      if (diagnostics.pushSubscription.exists) {
        console.log('  Endpoint:', diagnostics.pushSubscription.endpoint);
        console.log('  Expiration:', diagnostics.pushSubscription.expirationTime || 'None');
      }
      console.log('');
    }
    
    if (diagnostics.serviceWorkerError) {
      console.error('❌ Service Worker Error:', diagnostics.serviceWorkerError);
    }
    
    console.log('📋 Full diagnostic object:', diagnostics);
    
    return diagnostics;
  }
}

// Export the service
export const pushNotificationService = new PushNotificationService();