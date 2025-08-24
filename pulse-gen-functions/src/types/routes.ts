export enum PulseGenFunctionRoute {
  // News routes
  NEWS = 'news',
  
  // Schedule routes
  SCHEDULE = 'schedule',
  
  // Notification routes
  NOTIFICATIONS = 'notifications',
  SEND_NOTIFICATION = 'send-notification',
  
  // Device routes
  DEVICES = 'devices',
  REGISTER_DEVICE = 'register-device',
  LIST_DEVICES = 'list-devices'
}

export enum NotificationSubRoute {
  SEND = 'send',
  REGISTER_DEVICE = 'register-device',
  LIST_DEVICES = 'list-devices',
  DELETE_DEVICE = 'delete-device'
}

export interface RouteInfo {
  mainRoute: PulseGenFunctionRoute;
  subRoute?: NotificationSubRoute;
  pathSegments: string[];
}
