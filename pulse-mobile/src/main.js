import './style.css'
import { setupCounter } from './counter.js'
import { pushNotificationService } from './push-notifications.js'

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}

document.querySelector('#app').innerHTML = `
  <div>
    <h1>Pulse</h1>
    <p>Your mobile push notification app for iPhone!</p>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <div class="notification-controls">
      <h3>Push Notifications</h3>
      <p>Topic: <strong>${pushNotificationService.getTopicName()}</strong></p>
      <div id="permission-status" style="margin: 10px 0; padding: 10px; border-radius: 5px; font-size: 0.9em;"></div>
      <button id="subscribe-btn" type="button">Subscribe to ${pushNotificationService.getTopicName()}</button>
      <button id="unsubscribe-btn" type="button" style="display: none;">Unsubscribe from ${pushNotificationService.getTopicName()}</button>
      <button id="test-notification-btn" type="button">Send Test Notification</button>
      <button id="debug-btn" type="button" style="background-color: #666; color: white; margin-top: 5px;">Run Diagnostics</button>
      <div id="subscription-info" style="margin-top: 10px; font-size: 0.9em; color: #666;"></div>
    </div>
    <div class="ios-instructions" style="margin: 20px 0; padding: 15px; background: #f0f8ff; border-radius: 8px; font-size: 0.9em;">
      <h4>📱 iPhone Setup Instructions:</h4>
      <ol>
        <li>Open this page in Safari on your iPhone</li>
        <li>Tap the Share button (square with arrow)</li>
        <li>Select "Add to Home Screen"</li>
        <li>Open the app from your home screen</li>
        <li>Subscribe to notifications when prompted</li>
      </ol>
    </div>
    <p class="read-the-docs">
      This PWA uses Web Push API for iOS push notifications
    </p>
  </div>
`

setupCounter(document.querySelector('#counter'))

// Push notification controls
const subscribeBtn = document.querySelector('#subscribe-btn');
const unsubscribeBtn = document.querySelector('#unsubscribe-btn');
const testNotificationBtn = document.querySelector('#test-notification-btn');
const debugBtn = document.querySelector('#debug-btn');
const subscriptionInfo = document.querySelector('#subscription-info');
const permissionStatus = document.querySelector('#permission-status');

// Check subscription status on load
async function updateSubscriptionUI() {
  const isSubscribed = await pushNotificationService.isSubscribed();
  subscribeBtn.style.display = isSubscribed ? 'none' : 'block';
  unsubscribeBtn.style.display = isSubscribed ? 'block' : 'none';
  
  // Update permission status display
  updatePermissionStatus();
  
  // Update subscription info display
  if (isSubscribed) {
    const info = pushNotificationService.getSubscriptionInfo();
    subscriptionInfo.innerHTML = `
      <div style="color: green;">✅ Subscribed to ${info.topic}</div>
      <div>User ID: ${info.userId}</div>
      ${info.subscriptionId ? `<div>Subscription ID: ${info.subscriptionId}</div>` : ''}
    `;
  } else {
    subscriptionInfo.innerHTML = `
      <div style="color: orange;">⚠️ Not subscribed to notifications</div>
    `;
  }
}

// Update permission status display
function updatePermissionStatus() {
  if (!('Notification' in window)) {
    permissionStatus.innerHTML = '🚫 Notifications not supported';
    permissionStatus.style.backgroundColor = '#ffe6e6';
    permissionStatus.style.color = '#d00';
    return;
  }

  const permission = Notification.permission;
  switch (permission) {
    case 'granted':
      permissionStatus.innerHTML = '✅ Notification permission: Granted';
      permissionStatus.style.backgroundColor = '#e6ffe6';
      permissionStatus.style.color = '#080';
      break;
    case 'denied':
      permissionStatus.innerHTML = `
        🚫 Notification permission: Denied
        <br>
        <small>To enable: Settings > Safari > Website Settings > Notifications</small>
      `;
      permissionStatus.style.backgroundColor = '#ffe6e6';
      permissionStatus.style.color = '#d00';
      break;
    case 'default':
      permissionStatus.innerHTML = '⚠️ Notification permission: Not requested yet';
      permissionStatus.style.backgroundColor = '#fff3e6';
      permissionStatus.style.color = '#b85c00';
      break;
    default:
      permissionStatus.innerHTML = `❓ Unknown permission status: ${permission}`;
      permissionStatus.style.backgroundColor = '#f0f0f0';
      permissionStatus.style.color = '#666';
  }
}

// Subscribe to push notifications
subscribeBtn.addEventListener('click', async () => {
  try {
    subscribeBtn.disabled = true;
    subscribeBtn.textContent = 'Subscribing...';
    
    const success = await pushNotificationService.subscribeToPushNotifications();
    if (success) {
      updateSubscriptionUI();
      alert('✅ Successfully subscribed to push notifications for AJ General!');
    } else {
      // Check notification permission to provide specific error message
      const permission = Notification.permission;
      let errorMessage = '❌ Failed to subscribe to push notifications.\n\n';
      
      if (permission === 'denied') {
        errorMessage += '🚫 Notifications are blocked.\n\n';
        errorMessage += 'To enable notifications:\n';
        errorMessage += '📱 iOS: Settings > Safari > Website Settings > Notifications\n';
        errorMessage += '🖥️ Desktop: Click the lock icon next to the URL > Allow notifications';
      } else if (permission === 'default') {
        errorMessage += '⚠️ Permission request was dismissed.\n';
        errorMessage += 'Please try subscribing again and allow notifications when prompted.';
      } else {
        errorMessage += 'Check the browser console for detailed error information.';
      }
      
      alert(errorMessage);
      updatePermissionStatus(); // Update permission status after failure
    }
  } catch (error) {
    console.error('💥 Error during subscription process:', error);
    
    let errorMessage = '💥 Error subscribing to push notifications.\n\n';
    
    // Provide specific error guidance based on error type
    if (error.name === 'NotAllowedError') {
      errorMessage += '🚫 Permission denied. Please enable notifications in your browser settings.';
    } else if (error.name === 'NotSupportedError') {
      errorMessage += '🚫 Push notifications not supported on this device/browser.';
    } else if (error.message.includes('backend') || error.message.includes('server')) {
      errorMessage += '☁️ Server error. Please try again later.';
    } else {
      errorMessage += `Error: ${error.message}`;
    }
    
    alert(errorMessage);
    updatePermissionStatus(); // Update permission status after error
  } finally {
    subscribeBtn.disabled = false;
    subscribeBtn.textContent = `Subscribe to ${pushNotificationService.getTopicName()}`;
  }
});

// Unsubscribe from push notifications
unsubscribeBtn.addEventListener('click', async () => {
  try {
    const success = await pushNotificationService.unsubscribeFromPushNotifications();
    if (success) {
      updateSubscriptionUI();
      alert('Successfully unsubscribed from push notifications!');
    } else {
      alert('Failed to unsubscribe from push notifications.');
    }
  } catch (error) {
    console.error('Error unsubscribing:', error);
    alert('Error unsubscribing from push notifications.');
  }
});

// Send test notification using Web Push API
testNotificationBtn.addEventListener('click', async () => {
  try {
    const isSubscribed = await pushNotificationService.isSubscribed();
    if (!isSubscribed) {
      alert('Please subscribe to notifications first!');
      return;
    }

    console.log('📨 Sending test notification via Web Push API...');
    const result = await pushNotificationService.sendTestNotification(
      'Pulse Test 📱',
      `Hello from ${pushNotificationService.getTopicName()}! This is a test notification.`,
      {
        test: true,
        timestamp: new Date().toISOString(),
        topic: pushNotificationService.getTopicName(),
        action: 'open_app'
      }
    );

    alert(`Test notification sent successfully!\n\nSent to: ${result.sent_count} subscription(s)\nFailed: ${result.failed_count} subscription(s)\nTotal subscriptions: ${result.total_subscriptions}`);
  } catch (error) {
    console.error('Error sending test notification:', error);
    alert('Error sending test notification. Check console for details.');
  }
});

// Run diagnostics
debugBtn.addEventListener('click', async () => {
  try {
    debugBtn.disabled = true;
    debugBtn.textContent = 'Running diagnostics...';
    
    console.log('🔍 Running Pulse diagnostics...');
    const diagnostics = await pushNotificationService.logDiagnostics();
    
    alert(`📋 Diagnostics completed!\n\nCheck the browser console for detailed information.\n\nKey info:\n• Permission: ${diagnostics.notificationPermission}\n• iOS Device: ${diagnostics.isIOSDevice}\n• PWA Mode: ${diagnostics.isPWA}\n• Subscribed: ${diagnostics.localStorage.subscriptionId ? 'Yes' : 'No'}\n• VAPID Key: ${diagnostics.config.vapidKeyFetched ? 'Fetched' : 'Not fetched'}`);
  } catch (error) {
    console.error('Error running diagnostics:', error);
    alert('Error running diagnostics. Check console for details.');
  } finally {
    debugBtn.disabled = false;
    debugBtn.textContent = 'Run Diagnostics';
  }
});

// Initialize UI
updateSubscriptionUI();
