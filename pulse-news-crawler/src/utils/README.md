# AWS Lambda Powertools Logger

This directory contains a reusable Logger class that implements AWS Lambda Powertools for structured logging in your Lambda functions.

## Features

- **Singleton Pattern**: Ensures consistent logging configuration across your application
- **AWS Lambda Powertools Integration**: Leverages the power of AWS Lambda Powertools for structured logging
- **Context-aware Logging**: Automatically includes Lambda context information
- **Persistent Attributes**: Set attributes that appear in all log messages
- **Simple Interface**: Clean, generic logging methods
- **Multiple Log Levels**: Support for DEBUG, INFO, WARN, ERROR levels
- **Child Loggers**: Create child loggers with additional context
- **Environment Configuration**: Configurable via environment variables

## Installation

The required dependencies are already installed:

```bash
npm install @aws-lambda-powertools/logger @aws-lambda-powertools/metrics @aws-lambda-powertools/tracer
```

## Basic Usage

### Import the Logger

```typescript
import { logger, Logger } from '../utils/Logger';
```

### Simple Logging

```typescript
// Basic logging
logger.log('Processing request');
logger.log('User login successful', { userId: '123' });
logger.log('Operation completed', { result: 'success' }, 'MyService.processData');

// Different log levels
logger.debug('Debug information', { step: 1 }, 'MyClass.methodName');
logger.info('Info message', { userId: 'user123' });
logger.warn('Warning message', { issue: 'minor' });
logger.error('Error occurred', new Error('Something went wrong'), 'MyService.processData');
```

### Lambda Handler Integration

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { logger } from '../utils/Logger';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Initialize logger with Lambda context
  logger.initWithContext(context);

  // Add persistent attributes
  logger.addPersistentLogAttributes({
    userId: event.requestContext.accountId,
    requestId: event.requestContext.requestId,
  });

  try {
    logger.log('Request processing started', {}, 'handler');
    
    // Your business logic here
    logger.log('Processing user data', { action: 'validate' }, 'handler');
    
    logger.log('Request processed successfully', { status: 'completed' }, 'handler');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success' }),
    };
  } catch (error) {
    logger.error('Request processing failed', error as Error, 'handler');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

## Advanced Usage

### Custom Logger Configuration

```typescript
import { Logger } from '../utils/Logger';

const customLogger = Logger.getInstance({
  serviceName: 'my-custom-service',
  logLevel: 'DEBUG',
  sampleRateValue: 0.1, // Sample 10% of requests
  persistentLogAttributes: {
    environment: 'production',
    version: '2.0.0',
  },
});
```

### Child Loggers

```typescript
const childLogger = logger.createChild({
  component: 'UserService',
  operation: 'createUser',
});

childLogger.info('Creating new user'); // Will include component and operation in the log
```

### Service Class Integration

```typescript
export class UserService {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance({
      serviceName: 'UserService',
      logLevel: 'INFO',
    });
  }

  async createUser(userData: any): Promise<any> {
    this.logger.log('Starting user creation', { userData }, 'UserService.createUser');
    
    try {
      this.logger.log('Validating user data', { step: 'validation' }, 'UserService.createUser');
      
      // Business logic here
      this.logger.log('Saving user to database', { table: 'Users' }, 'UserService.createUser');
      
      const user = { id: '123', ...userData };
      this.logger.log('User created successfully', { userId: user.id }, 'UserService.createUser');
      
      return user;
    } catch (error) {
      this.logger.error('Failed to create user', error as Error, 'UserService.createUser');
      throw error;
    }
  }
}
```

## Method Signatures

### Main Logging Method
```typescript
logger.log(message: string, data?: Record<string, any>, caller?: string): void
```

### Level-Specific Methods
```typescript
logger.debug(message: string, data?: Record<string, any>, caller?: string): void
logger.info(message: string, data?: Record<string, any>, caller?: string): void  
logger.warn(message: string, data?: Record<string, any>, caller?: string): void
logger.error(message: string, error?: Error | Record<string, any>, caller?: string): void
```

## Environment Variables

The logger can be configured using environment variables:

- `SERVICE_NAME`: Default service name for the logger
- `LOG_LEVEL`: Default log level (DEBUG, INFO, WARN, ERROR, CRITICAL, SILENT)
- `SAMPLE_RATE`: Sample rate for logs (0.0 to 1.0)
- `NODE_ENV`: Environment (development, production, etc.)

Example environment configuration:

```bash
export SERVICE_NAME="pulse-news-crawler"
export LOG_LEVEL="INFO"
export SAMPLE_RATE="0.1"
export NODE_ENV="production"
```

## Log Levels

- **DEBUG**: Detailed information for debugging
- **INFO**: General information about application flow (default)
- **WARN**: Warning messages that don't stop execution
- **ERROR**: Error messages for recoverable errors
- **CRITICAL**: Fatal errors that may cause the application to terminate
- **SILENT**: No logging

## Log Output Format

The logger produces structured JSON logs that are easily searchable in CloudWatch:

```json
{
  "cold_start": true,
  "function_arn": "arn:aws:lambda:us-east-1:123456789012:function:my-function",
  "function_memory_size": 128,
  "function_name": "my-function",
  "function_request_id": "52fdfc07-2182-154f-163f-5f0f9a621d72",
  "level": "INFO",
  "message": "Processing request",
  "service": "pulse-news-crawler",
  "timestamp": "2023-08-28T10:30:00.000Z",
  "userId": "user123",
  "caller": "MyService.processData"
}
```

## Best Practices

1. **Initialize with Context**: Always call `logger.initWithContext(context)` in your Lambda handlers
2. **Use Persistent Attributes**: Set common attributes like `userId`, `requestId` early in your handler
3. **Include Caller Information**: Use the third parameter to identify where logs are coming from
4. **Error Handling**: Always log errors with the full Error object for stack traces
5. **Performance**: Use sampling in production to reduce costs
6. **Security**: Never log sensitive information like passwords, tokens, or PII

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Make sure you're using the correct types and handling optional parameters
2. **Missing Context**: Remember to call `initWithContext()` in Lambda handlers
3. **Log Level**: Check your LOG_LEVEL environment variable if logs aren't appearing
4. **Sampling**: If logs are missing in production, check your SAMPLE_RATE setting

### Debug Mode

To enable debug logging temporarily:

```typescript
logger.setLogLevel('DEBUG');
```

## Usage Examples

```typescript
// Simple message
logger.log('Operation started');

// With data
logger.log('User authenticated', { userId: '123', method: 'oauth' });

// With data and caller
logger.log('Database query completed', { table: 'users', count: 5 }, 'UserService.getUsers');

// Error logging
logger.error('Database connection failed', new Error('Connection timeout'), 'DatabaseService.connect');

// Debug with context
logger.debug('Processing step', { step: 'validation', input: data }, 'ProcessingService.validate');
```
