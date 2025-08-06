# Pulse - Daily Quest PWA

A Progressive Web Application for daily quest completion with push notifications. Built with Next.js, TypeScript, and the Web Push API.

## Features

- 🎯 **Daily Quest Management**: Track and complete daily habits
- 🔔 **Push Notifications**: Real-time notifications for quest completions and approvals
- 📱 **Progressive Web App**: Install on any device with full offline support
- 👥 **Social Features**: Share progress and get notified about friend activities
- 🔒 **Secure**: Uses VAPID authentication for web push
- 🎨 **Modern UI**: Beautiful, responsive interface with Tailwind CSS

## Architecture

This application implements a comprehensive PWA push notification system with the following components:

### Core Components

1. **Client-Side Service Worker** (`/public/worker/index.js`)
2. **Notification Management Component** (`/components/notification.tsx`)
3. **Server-Side Push Service** (`/actions/notification.ts`)
4. **API Routes** (`/app/api/push/*`)
5. **PWA Configuration** (`next-pwa` plugin)

### Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **PWA**: next-pwa with Workbox
- **Push Notifications**: Web Push API with VAPID
- **Server**: Next.js API Routes
- **Build Tool**: Next.js built-in bundler

## Quick Start

### 1. Clone and Install

```bash
cd pulse-mobile
npm install
```

### 2. Environment Setup

Copy the example environment file and configure your VAPID keys:

```bash
cp env.example .env.local
```

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Update `.env.local` with your generated keys:

```bash
NEXT_PUBLIC_VAPID_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_EMAIL=your-email@example.com
```

### 3. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. PWA Installation

#### iOS Safari
1. Open the app in Safari
2. Tap the Share button (⬆️)
3. Select "Add to Home Screen"
4. Tap "Add" to install
5. Open from your home screen

#### Android Chrome
1. Open the app in Chrome
2. Tap the menu (⋮)
3. Select "Add to Home screen"
4. Tap "Add" to install
5. Open from your home screen

## Push Notification Setup

### 1. VAPID Configuration

VAPID (Voluntary Application Server Identification) keys are required for web push notifications:

```typescript
// Server-side configuration
const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
};

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);
```

### 2. Client-Side Subscription

```typescript
// Subscribe to push notifications
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlB64ToUint8Array(vapidPublicKey)
});
```

### 3. Server-Side Sending

```typescript
// Send notification to user
await webpush.sendNotification(
  userSubscription,
  JSON.stringify({
    message: "Quest completed!",
    body: "John just completed their daily exercise quest",
    icon: "/icon.svg"
  })
);
```

## API Routes

### Subscribe to Notifications
```
POST /api/push/subscribe
Content-Type: application/json

{
  "user_id": "user_123",
  "subscription": {
    "endpoint": "https://...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

### Unsubscribe from Notifications
```
DELETE /api/push/unsubscribe
Content-Type: application/json

{
  "user_id": "user_123"
}
```

### Send Test Notification
```
POST /api/push/test
Content-Type: application/json

{
  "user_id": "user_123",
  "message": "Test notification message",
  "title": "Test Title"
}
```

## Server Actions

Use server actions for sending notifications from your application:

```typescript
import { sendNotification, sendQuestCompletionNotification } from '@/actions/notification';

// Send custom notification
await sendNotification(
  "Quest completed!",
  "reviewer_user_id",
  "/icon.svg",
  "Quest Alert"
);

// Send quest completion notification
await sendQuestCompletionNotification(
  "completer_user_id",
  "reviewer_user_id", 
  "Daily Exercise",
  "John Doe"
);
```

## Component Usage

### Notification Component

```tsx
import NotificationComponent from '@/components/notification';

export default function App() {
  const [isSubscribed, setIsSubscribed] = useState(false);

  return (
    <NotificationComponent 
      vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_KEY}
      onSubscriptionChange={setIsSubscribed}
    />
  );
}
```

## Service Worker

The service worker handles push events and notification clicks:

```javascript
// Handle push notifications
self.addEventListener("push", async (event) => {
  const data = JSON.parse(event.data.text());
  event.waitUntil(
    self.registration.showNotification(data.message, {
      body: data.body,
      icon: data.icon,
      // ... other options
    })
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow("/")
  );
});
```

## Utility Functions

### VAPID Key Conversion
```typescript
import { urlB64ToUint8Array } from '@/lib/utils';

const applicationServerKey = urlB64ToUint8Array(vapidPublicKey);
```

### Permission Management
```typescript
import { 
  requestNotificationPermission,
  getNotificationPermission,
  isPushNotificationSupported 
} from '@/lib/utils';

if (isPushNotificationSupported()) {
  const permission = await requestNotificationPermission();
}
```

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 42+ | ✅ Full | Complete support |
| Firefox 44+ | ✅ Full | Complete support |
| Safari 16+ | ⚠️ Limited | iOS 16.4+ PWA only |
| Edge 17+ | ✅ Full | Complete support |

## Security Considerations

1. **VAPID Keys**: Keep private keys secure and never expose them client-side
2. **User Consent**: Always request explicit permission before subscribing
3. **Data Privacy**: Don't send sensitive data in push payloads
4. **Subscription Management**: Provide clear opt-out mechanisms

## Troubleshooting

### Common Issues

1. **Notifications not appearing**
   - Check browser notification permissions
   - Verify service worker registration
   - Validate VAPID key configuration

2. **Service worker registration failures**
   - Ensure HTTPS connection (required for service workers)
   - Check for JavaScript errors in browser console

3. **Push subscription errors**
   - Validate VAPID key format
   - Check browser support for Push API

### Debug Mode

Enable debug logging in development:

```typescript
import { debugLog } from '@/lib/utils';

debugLog('Subscription created', subscription);
```

## Production Deployment

### 1. Environment Variables

Set up production environment variables:

```bash
NEXT_PUBLIC_VAPID_KEY=your_production_public_key
VAPID_PRIVATE_KEY=your_production_private_key
VAPID_EMAIL=your-production-email@example.com
```

### 2. Database Integration

Replace in-memory storage with a proper database:

```typescript
// Replace Map storage with database operations
const subscriptions = new Map(); // Remove this

// Use your preferred database (PostgreSQL, MongoDB, etc.)
import { db } from './db';

// Store subscription
await db.subscription.create({
  data: {
    userId,
    subscription: JSON.stringify(subscription),
  }
});
```

### 3. HTTPS Requirement

Ensure your production deployment uses HTTPS as it's required for:
- Service Workers
- Push API
- Geolocation
- Other PWA features

## Integration with Backend Services

### AWS Lambda Integration

The original Pulse system uses AWS Lambda functions. You can integrate this Next.js PWA with your existing backend:

```typescript
// Call existing AWS Lambda functions
const response = await fetch('https://your-api-gateway-url/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(notificationData)
});
```

### Database Schema Example

```sql
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  subscription_json TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the troubleshooting section above
- Review browser console for error messages

---

Built with ❤️ using Next.js and the Web Push API