export enum PulseGenFunctionRoute {
  // News routes
  NEWS = 'news'
}


export interface RouteInfo {
  mainRoute: PulseGenFunctionRoute;
  pathSegments: string[];
}
