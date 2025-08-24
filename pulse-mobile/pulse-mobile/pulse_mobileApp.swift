//
//  pulse_mobileApp.swift
//  pulse-mobile
//
//  Created by Alan Johnson on 8/8/25.
//

import SwiftUI
import AWSSNS
import UserNotifications

extension Notification.Name {
    static let deviceRegistrationSuccess = Notification.Name("deviceRegistrationSuccess")
    static let deviceRegistrationFailed = Notification.Name("deviceRegistrationFailed")
}



@main
struct pulse_mobileApp: App {
    @UIApplicationDelegateAdaptor private var appDelegate: AppDelegate
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    /// The SNS Platform application ARN
    let SNSPlatformApplicationArn = "arn:aws:sns:us-east-1:717279706981:app/APNS_SANDBOX/pulse-mobile"
    
    /// The backend API URL for device registration
    let backendApiUrl = "https://orssnbg9nh.execute-api.us-east-1.amazonaws.com"

    var window: UIWindow?


    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        /// Setup AWS Cognito credentials
        let credentialsProvider = AWSCognitoCredentialsProvider(
            regionType: AWSRegionType.USEast1, identityPoolId: "us-east-1:bc0a2545-dec1-48d2-95e3-53cc14a0261a")

        let defaultServiceConfiguration = AWSServiceConfiguration(
            region: AWSRegionType.USEast1, credentialsProvider: credentialsProvider)

        AWSServiceManager.default().defaultServiceConfiguration = defaultServiceConfiguration

        registerForPushNotifications(application: application)

        return true
    }


    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        /// Attach the device token to the user defaults
        var token = ""
        for i in 0..<deviceToken.count {
            token = token + String(format: "%02.2hhx", arguments: [deviceToken[i]])
        }

        print("Device Token: \(token)")
        UserDefaults.standard.set(token, forKey: "deviceTokenForSNS")

        /// Create a platform endpoint. In this case, the endpoint is a
        /// device endpoint ARN
        let sns = AWSSNS.default()
        let request = AWSSNSCreatePlatformEndpointInput()
        request?.token = token
        request?.platformApplicationArn = SNSPlatformApplicationArn
        sns.createPlatformEndpoint(request!).continueWith(executor: AWSExecutor.mainThread(), block: { (task: AWSTask!) -> AnyObject? in
            if task.error != nil {
                print("SNS Error: \(String(describing: task.error))")
            } else {
                let createEndpointResponse = task.result! as AWSSNSCreateEndpointResponse

                if let endpointArnForSNS = createEndpointResponse.endpointArn {
                    print("SNS endpointArn: \(endpointArnForSNS)")
                    UserDefaults.standard.set(endpointArnForSNS, forKey: "endpointArnForSNS")
                }
            }

            return nil
        })
        
        /// Register device with backend API
        registerDeviceWithBackend(deviceToken: token)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Failed to register for remote notifications: \(error.localizedDescription)")
    }
    
    /// Register device with backend API
    private func registerDeviceWithBackend(deviceToken: String) {
        let url = URL(string: "\(backendApiUrl)/notifications/register-device")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let deviceData: [String: Any] = [
            "device_token": deviceToken,
            "user_id": "ios_user_\(UUID().uuidString)",
            "device_id": UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString,
            "bundle_id": Bundle.main.bundleIdentifier ?? "com.alanjohnson.pulse-mobile",
            "platform": "ios",
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: deviceData)
        } catch {
            print("Error creating JSON data: \(error)")
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("Backend registration error: \(error)")
                NotificationCenter.default.post(name: .deviceRegistrationFailed, object: error.localizedDescription)
                return
            }
            
            if let httpResponse = response as? HTTPURLResponse {
                print("Backend registration status: \(httpResponse.statusCode)")
                
                if let data = data, let responseString = String(data: data, encoding: .utf8) {
                    print("Backend registration response: \(responseString)")
                    
                    if httpResponse.statusCode == 200 {
                        NotificationCenter.default.post(name: .deviceRegistrationSuccess, object: responseString)
                    } else {
                        NotificationCenter.default.post(name: .deviceRegistrationFailed, object: "HTTP \(httpResponse.statusCode): \(responseString)")
                    }
                }
            }
        }.resume()
    }

    func registerForPushNotifications(application: UIApplication) {
        /// The notifications settings
        if #available(iOS 10.0, *) {
            UNUserNotificationCenter.current().delegate = self
            UNUserNotificationCenter.current().requestAuthorization(options: [.badge, .sound, .alert], completionHandler: {(granted, error) in
                if (granted)
                {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                else{
                    //Do stuff if unsuccessful...
                }
            })
        } else {
            let settings = UIUserNotificationSettings(types: [UIUserNotificationType.alert, UIUserNotificationType.badge, UIUserNotificationType.sound], categories: nil)
            application.registerUserNotificationSettings(settings)
            application.registerForRemoteNotifications()
        }
    }

    // Called when a notification is delivered to a foreground app.
    @available(iOS 10.0, *)
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        print("User Info = ",notification.request.content.userInfo)
        completionHandler([.alert, .badge, .sound])
    }

    // Called to let your app know which action was selected by the user for a given notification.
    @available(iOS 10.0, *)
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        print("User Info = ",response.notification.request.content.userInfo)

        completionHandler()
    }
}
