//
//  ContentView.swift
//  pulse-mobile
//
//  Created by Alan Johnson on 8/8/25.
//

import SwiftUI
import UserNotifications

struct ContentView: View {
    @State private var notificationStatus: UNAuthorizationStatus = .notDetermined
    @State private var deviceToken: String = ""
    @State private var registrationStatus: String = ""
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "globe")
                .imageScale(.large)
                .foregroundStyle(.tint)
            Text("Pulse Mobile")
                .font(.title)
                .fontWeight(.bold)
            
            // Notification permission button
            Button(action: {
                requestNotificationPermission()
            }) {
                HStack {
                    Image(systemName: "bell.fill")
                        .foregroundColor(.white)
                    Text("Enable Notifications")
                        .foregroundColor(.white)
                        .fontWeight(.semibold)
                }
                .padding()
                .background(Color.blue)
                .cornerRadius(10)
            }
            .disabled(notificationStatus == .authorized)
            .opacity(notificationStatus == .authorized ? 0.6 : 1.0)
            
            // Device token display
            if !deviceToken.isEmpty {
                VStack(alignment: .leading, spacing: 5) {
                    Text("Device Token:")
                        .font(.caption)
                        .fontWeight(.semibold)
                    Text(deviceToken)
                        .font(.caption2)
                        .foregroundColor(.gray)
                        .lineLimit(3)
                }
                .padding()
                .background(Color.gray.opacity(0.1))
                .cornerRadius(8)
            }
            
            // Registration status
            if !registrationStatus.isEmpty {
                Text(registrationStatus)
                    .font(.caption)
                    .foregroundColor(registrationStatus.contains("success") ? .green : .red)
                    .multilineTextAlignment(.center)
            }
            
            // Status text
            if notificationStatus == .authorized {
                Text("Notifications are enabled! ✅")
                    .foregroundColor(.green)
                    .font(.caption)
            } else if notificationStatus == .denied {
                Text("Notifications are disabled. Go to Settings to enable them.")
                    .foregroundColor(.red)
                    .font(.caption)
                    .multilineTextAlignment(.center)
            }
        }
        .padding()
        .onAppear {
            checkNotificationStatus()
            loadDeviceToken()
            setupNotificationObservers()
        }
        .onDisappear {
            removeNotificationObservers()
        }
    }
    
    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            DispatchQueue.main.async {
                if granted {
                    notificationStatus = .authorized
                    // Register for remote notifications
                    UIApplication.shared.registerForRemoteNotifications()
                } else {
                    notificationStatus = .denied
                }
            }
        }
    }
    
    private func checkNotificationStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async {
                notificationStatus = settings.authorizationStatus
            }
        }
    }
    
    private func loadDeviceToken() {
        if let token = UserDefaults.standard.string(forKey: "deviceTokenForSNS") {
            deviceToken = token
        }
    }
    
    private func updateRegistrationStatus(_ status: String) {
        DispatchQueue.main.async {
            registrationStatus = status
        }
    }
    
    private func setupNotificationObservers() {
        NotificationCenter.default.addObserver(
            forName: .deviceRegistrationSuccess,
            object: nil,
            queue: .main
        ) { notification in
            if let response = notification.object as? String {
                updateRegistrationStatus("✅ Device registered successfully!")
            }
        }
        
        NotificationCenter.default.addObserver(
            forName: .deviceRegistrationFailed,
            object: nil,
            queue: .main
        ) { notification in
            if let error = notification.object as? String {
                updateRegistrationStatus("❌ Registration failed: \(error)")
            }
        }
    }
    
    private func removeNotificationObservers() {
        NotificationCenter.default.removeObserver(self, name: .deviceRegistrationSuccess, object: nil)
        NotificationCenter.default.removeObserver(self, name: .deviceRegistrationFailed, object: nil)
    }
}

#Preview {
    ContentView()
}
