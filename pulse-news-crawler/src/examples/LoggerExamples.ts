import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { logger, Logger } from '../utils/Logger';

// Example 1: Simple usage with the generic log method
export const exampleHandler1 = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Initialize logger with Lambda context
  logger.initWithContext(context);

  // Add persistent attributes that will appear in all logs
  logger.addPersistentLogAttributes({
    userId: event.requestContext.accountId,
    requestId: event.requestContext.requestId,
  });

  try {
    // Simple logging with just a message
    logger.log('Processing daily news request');
    
    // Logging with data
    logger.log('Request details', {
      method: event.httpMethod,
      path: event.path,
      pathParameters: event.pathParameters,
    });

    // Logging with data and caller info
    logger.log('Starting processing', { stage: 'initial' }, 'exampleHandler1');

    // Different log levels
    logger.debug('Debug info', { step: 1 }, 'exampleHandler1');
    logger.info('Info message', { userId: 'user123' });
    logger.warn('Warning message', { issue: 'minor' });

    const result = { message: 'Daily news processed successfully' };
    
    logger.log('Processing completed', result, 'exampleHandler1');

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    // Error logging - can pass Error object or data object
    logger.error('Failed to process daily news', error as Error, 'exampleHandler1');
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

// Example 2: Creating a custom logger instance
export const exampleHandler2 = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Create a custom logger instance
  const customLogger = Logger.getInstance({
    serviceName: 'custom-news-service',
    logLevel: 'DEBUG',
    sampleRateValue: 0.1, // Sample 10% of requests
    persistentLogAttributes: {
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    },
  });

  customLogger.initWithContext(context);

  try {
    customLogger.log('Custom logger example started', {}, 'exampleHandler2');
    
    // Create a child logger with additional context
    const childLogger = customLogger.createChild({
      component: 'NewsProcessor',
      operation: 'fetchHeadlines',
    });

    // Use the child logger (it will include the additional context)
    childLogger.info('Fetching news headlines');
    
    customLogger.log('Process completed successfully', { status: 'success' }, 'exampleHandler2');
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Success' }),
    };
  } catch (error) {
    customLogger.error('Critical error occurred', error as Error, 'exampleHandler2');
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Fatal error' }),
    };
  }
};

// Example 3: Using logger in a service class
export class NewsService {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance({
      serviceName: 'NewsService',
      logLevel: 'INFO',
    });
  }

  public async fetchNews(): Promise<any[]> {
    this.logger.log('Starting news fetch operation', {}, 'NewsService.fetchNews');
    
    try {
      // Simulate API call
      this.logger.log('Calling external news API', { endpoint: '/v2/top-headlines' }, 'NewsService.fetchNews');
      
      const news: any[] = []; // Simulate fetched news
      
      this.logger.log('News fetched successfully', { count: news.length }, 'NewsService.fetchNews');
      
      return news;
    } catch (error) {
      this.logger.error('Failed to fetch news', error as Error, 'NewsService.fetchNews');
      throw error;
    }
  }

  public async saveNews(news: any[]): Promise<void> {
    this.logger.log('Starting news save operation', { newsCount: news.length }, 'NewsService.saveNews');
    
    try {
      for (const article of news) {
        this.logger.debug('Saving article', { id: article.id }, 'NewsService.saveNews');
      }
      
      this.logger.log('All news articles saved successfully', { count: news.length }, 'NewsService.saveNews');
    } catch (error) {
      this.logger.error('Failed to save news articles', error as Error, 'NewsService.saveNews');
      throw error;
    }
  }
}

// Example 4: Environment-based configuration
export const createEnvironmentLogger = (): Logger => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  return Logger.getInstance({
    serviceName: process.env.SERVICE_NAME || 'pulse-news-crawler',
    logLevel: isDevelopment ? 'DEBUG' : isProduction ? 'INFO' : 'WARN',
    sampleRateValue: isProduction ? 0.1 : 1.0, // Sample all logs in dev, 10% in prod
    persistentLogAttributes: {
      environment: process.env.NODE_ENV || 'development',
      version: process.env.SERVICE_VERSION || '1.0.0',
      region: process.env.AWS_REGION || 'us-east-1',
    },
  });
};
