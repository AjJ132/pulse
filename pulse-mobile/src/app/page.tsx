'use client';

import { useState } from 'react';
import Image from "next/image";
import NotificationComponent from '@/components/notification';

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

export default function Home() {
  const [isSubscribed, setIsSubscribed] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="text-center py-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Image
              src="/icon.svg"
              alt="Pulse Icon"
              width={64}
              height={64}
              className="rounded-lg"
            />
            <h1 className="text-4xl font-bold text-gray-800">Pulse</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Test message here
          </p>
        </header>

        {/* Main Content */}
        <main className="space-y-8">
          {/* PWA Installation Instructions */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              📱 PWA Installation
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* iOS Instructions */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">📱 iOS Safari</h3>
                <ol className="text-sm text-blue-700 space-y-1">
                  <li>1. Open this page in Safari</li>
                  <li>2. Tap the Share button (⬆️)</li>
                  <li>3. Select &quot;Add to Home Screen&quot;</li>
                  <li>4. Tap &quot;Add&quot; to install</li>
                  <li>5. Open from your home screen</li>
                </ol>
              </div>

              {/* Android Instructions */}
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">🤖 Android Chrome</h3>
                <ol className="text-sm text-green-700 space-y-1">
                  <li>1. Open this page in Chrome</li>
                  <li>2. Tap the menu (⋮)</li>
                  <li>3. Select &quot;Add to Home screen&quot;</li>
                  <li>4. Tap &quot;Add&quot; to install</li>
                  <li>5. Open from your home screen</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Notification Component */}
          <NotificationComponent 
            onSubscriptionChange={setIsSubscribed}
          />

          {/* Feature Overview */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              ✨ Features
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4">
                <div className="text-3xl mb-2">🎯</div>
                <h3 className="font-semibold">Daily Quests</h3>
                <p className="text-sm text-gray-600">Complete your daily habits and track progress</p>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl mb-2">🔔</div>
                <h3 className="font-semibold">Push Notifications</h3>
                <p className="text-sm text-gray-600">Get notified about quest completions and approvals</p>
              </div>
              <div className="text-center p-4">
                <div className="text-3xl mb-2">👥</div>
                <h3 className="font-semibold">Social Features</h3>
                <p className="text-sm text-gray-600">Share progress with friends and get motivation</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              📊 Status
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                <p className={`text-sm ${isSubscribed ? 'text-green-600' : 'text-gray-600'}`}>
                  {isSubscribed ? '✅ Enabled' : '⚠️ Not enabled'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800">PWA Status</h3>
                <p className="text-sm text-gray-600">
                  {typeof window !== 'undefined' && (
                    (window.navigator as NavigatorStandalone).standalone || 
                    window.matchMedia('(display-mode: standalone)').matches
                  ) ? '✅ Installed' : '⚠️ Not installed'}
                </p>
              </div>
            </div>
          </div>

          {/* Environment Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">🔧 Development Info</h3>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>Environment: {process.env.NODE_ENV}</p>
                <p>AWS API: {process.env.NEXT_PUBLIC_AWS_API_URL ? '✅ Configured' : '❌ Missing'}</p>
                <p>Service Worker: {typeof window !== 'undefined' && 'serviceWorker' in navigator ? '✅ Supported' : '❌ Not supported'}</p>
                <p>Push API: {typeof window !== 'undefined' && 'PushManager' in window ? '✅ Supported' : '❌ Not supported'}</p>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center py-8 text-gray-600">
          <p>&copy; 2024 Pulse - Daily Quest PWA. Built with Next.js and Web Push API.</p>
        </footer>
      </div>
    </div>
  );
}
