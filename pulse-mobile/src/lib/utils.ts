import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert VAPID public key from base64url to Uint8Array
 * Required for Web Push API subscription
 */
export function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

/**
 * Check if the current device is an iOS device
 */
export function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Check if the app is running in PWA mode (installed on home screen)
 */
interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

export function isPWA(): boolean {
  return (window.navigator as NavigatorStandalone).standalone === true || 
         window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * Check if the browser supports push notifications
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 
         'PushManager' in window && 
         'Notification' in window;
}

/**
 * Get the current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'not-supported' {
  if (!('Notification' in window)) {
    return 'not-supported';
  }
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notifications are blocked. Please enable them in browser settings.');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Generate a unique user ID for demo purposes
 * In production, this would come from your authentication system
 */
export function generateUserId(): string {
  return 'user_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Get or create a user ID from localStorage
 */
export function getUserId(): string {
  const storageKey = 'pulse_user_id';
  let userId = localStorage.getItem(storageKey);
  
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem(storageKey, userId);
  }
  
  return userId;
}

/**
 * Store push subscription data in localStorage
 */
export function storeSubscriptionData(subscriptionId: string, userId: string): void {
  localStorage.setItem('pulse_subscription_id', subscriptionId);
  localStorage.setItem('pulse_user_id', userId);
}

/**
 * Get stored subscription data from localStorage
 */
export function getStoredSubscriptionData(): { subscriptionId: string | null; userId: string | null } {
  return {
    subscriptionId: localStorage.getItem('pulse_subscription_id'),
    userId: localStorage.getItem('pulse_user_id')
  };
}

/**
 * Clear stored subscription data from localStorage
 */
export function clearSubscriptionData(): void {
  localStorage.removeItem('pulse_subscription_id');
  localStorage.removeItem('pulse_user_id');
}

/**
 * Format error messages for user display
 */
export function formatNotificationError(error: Error): string {
  if (error.name === 'NotAllowedError') {
    return 'Notifications are blocked. Please enable them in your browser settings.';
  }
  
  if (error.name === 'NotSupportedError') {
    return 'Push notifications are not supported on this device or browser.';
  }
  
  if (error.name === 'AbortError') {
    return 'Notification request was cancelled. Please try again.';
  }
  
  if (error.message.includes('backend') || error.message.includes('server')) {
    return 'Server error occurred. Please try again later.';
  }
  
  return `Error: ${error.message}`;
}

/**
 * Validate VAPID public key format
 */
export function isValidVapidKey(key: string): boolean {
  // VAPID public keys should be base64url encoded and 65 bytes long when decoded
  try {
    const decoded = urlB64ToUint8Array(key);
    return decoded.length === 65;
  } catch {
    return false;
  }
}

/**
 * Debug logging for development
 */
export function debugLog(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Pulse Debug] ${message}`, data || '');
  }
}

/**
 * Error logging
 */
export function errorLog(message: string, error?: Error): void {
  console.error(`[Pulse Error] ${message}`, error || '');
}
