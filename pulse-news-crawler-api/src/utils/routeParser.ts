import { PulseGenFunctionRoute, RouteInfo } from '../types/routes';

  export function parseRoute(path: string): RouteInfo {
    const pathSegments = path.split('/').filter(Boolean);
    
    if (pathSegments.length === 0) {
      throw new Error('Invalid path: empty path');
    }
    
  const route = pathSegments[0] as PulseGenFunctionRoute;

  
  // For other routes (news, schedule), no sub-route needed
  return {
    mainRoute: route,
    pathSegments
  };
}
