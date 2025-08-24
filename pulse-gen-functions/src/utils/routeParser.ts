import { PulseGenFunctionRoute, NotificationSubRoute, RouteInfo } from '../types/routes';

export function parseRoute(path: string): RouteInfo {
  const pathSegments = path.split('/').filter(Boolean);
  
  if (pathSegments.length === 0) {
    throw new Error('Invalid path: empty path');
  }
  
  const mainRoute = pathSegments[0] as PulseGenFunctionRoute;
  
  // Validate main route
  if (!Object.values(PulseGenFunctionRoute).includes(mainRoute)) {
    throw new Error(`Invalid route: ${mainRoute}`);
  }
  
  // For notification routes, parse sub-routes
  if (mainRoute === PulseGenFunctionRoute.NOTIFICATIONS || mainRoute === PulseGenFunctionRoute.SEND_NOTIFICATION) {
    const subRoute = pathSegments[1] as NotificationSubRoute;
    
    // If no sub-route is provided, default to 'send' for notifications
    if (!subRoute) {
      return {
        mainRoute: PulseGenFunctionRoute.NOTIFICATIONS,
        subRoute: NotificationSubRoute.SEND,
        pathSegments
      };
    }
    
    // Validate sub-route
    if (!Object.values(NotificationSubRoute).includes(subRoute)) {
      throw new Error(`Invalid notification sub-route: ${subRoute}`);
    }
    
    return {
      mainRoute: PulseGenFunctionRoute.NOTIFICATIONS,
      subRoute,
      pathSegments
    };
  }
  
  // For device routes, map to notification handler with device sub-route
  if (mainRoute === PulseGenFunctionRoute.DEVICES || mainRoute === PulseGenFunctionRoute.REGISTER_DEVICE) {
    return {
      mainRoute: PulseGenFunctionRoute.NOTIFICATIONS,
      subRoute: NotificationSubRoute.REGISTER_DEVICE,
      pathSegments
    };
  }
  
  // Handle list-devices route specifically
  if (mainRoute === PulseGenFunctionRoute.LIST_DEVICES) {
    return {
      mainRoute: PulseGenFunctionRoute.NOTIFICATIONS,
      subRoute: NotificationSubRoute.LIST_DEVICES,
      pathSegments
    };
  }
  
  // For other routes (news, schedule), no sub-route needed
  return {
    mainRoute,
    pathSegments
  };
}
