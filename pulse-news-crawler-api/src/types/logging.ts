/**
 * Common types for logging in the Pulse News Crawler application
 */

export interface LogContext {
  requestId: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
}

export interface ApiRequestLog {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  queryParams?: Record<string, string>;
  pathParams?: Record<string, string>;
}

export interface ApiResponseLog {
  statusCode: number;
  responseTime?: number;
  body?: any;
  headers?: Record<string, string>;
}

export interface DatabaseOperationLog {
  operation: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'SCAN' | 'QUERY';
  table: string;
  key?: any;
  result?: any;
  duration?: number;
  itemCount?: number;
}

export interface ExternalServiceLog {
  serviceName: string;
  endpoint: string;
  method: string;
  statusCode?: number;
  duration?: number;
  requestBody?: any;
  responseBody?: any;
}

export interface MethodExecutionLog {
  methodName: string;
  parameters?: Record<string, any>;
  returnValue?: any;
  duration?: number;
  success: boolean;
}

export interface ErrorLog {
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  context?: Record<string, any>;
  recoverable: boolean;
}

// Environment-specific configurations
export interface LoggerEnvironmentConfig {
  serviceName: string;
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL' | 'SILENT';
  environment: 'development' | 'staging' | 'production';
  region: string;
  version: string;
  sampleRate: number;
}

// News-specific logging types
export interface NewsOperationLog {
  operation: 'FETCH' | 'PARSE' | 'VALIDATE' | 'STORE' | 'RETRIEVE';
  source: string;
  articleCount?: number;
  duration?: number;
  filters?: Record<string, any>;
}

export interface CrawlerLog {
  crawlerId: string;
  source: string;
  status: 'STARTED' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';
  articlesProcessed?: number;
  duration?: number;
  errors?: string[];
}
