import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { logger } from '../utils/Logger';

export const dailyNewsHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Initialize logger with Lambda context
  logger.initWithContext(context);

  // Add persistent attributes for this request
  logger.addPersistentLogAttributes({
    handler: 'dailyNewsHandler',
    requestId: event.requestContext.requestId,
  });

  try {
    logger.log('Daily news handler started', {}, 'dailyNewsHandler');
    
    // Log the incoming request
    logger.log('Processing request', {
      method: event.httpMethod,
      path: event.path,
      pathParameters: event.pathParameters,
      queryStringParameters: event.queryStringParameters,
    }, 'dailyNewsHandler');

    // Your business logic would go here
    logger.debug('Processing daily news request', { stage: 'processing' }, 'dailyNewsHandler');

    const result = {
      message: 'Daily news handler executed successfully',
      timestamp: new Date().toISOString(),
    };

    logger.log('Daily news handler completed successfully', result, 'dailyNewsHandler');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    logger.error('Daily news handler failed', error as Error, 'dailyNewsHandler');
    
    const errorResponse = {
      error: 'Internal server error',
      message: 'Failed to process daily news request',
    };

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(errorResponse),
    };
  } finally {
    // Clean up persistent attributes if needed
    logger.removePersistentLogAttributes(['handler', 'requestId']);
  }
};