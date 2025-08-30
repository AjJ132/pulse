import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { logger } from '../utils/Logger';
import { NewsController } from '../controller/NewController';

export const dailyNewsHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // Initialize logger with Lambda context
    logger.initWithContext(context);

    // Add persistent attributes for this request
    logger.addPersistentLogAttributes({
      handler: 'dailyNewsHandler',
      requestId: event.requestContext.requestId,
    });

    logger.log('Daily news handler started', {}, 'dailyNewsHandler');

    //fetch required env vars
    const envVars = {
      awsRegion: process.env.AWS_REGION
    };

    //validate each env var
    if (!envVars.awsRegion) {
      logger.error('Missing environment variable: AWS_REGION', {}, 'dailyNewsHandler');
      throw new Error('Missing environment variable: AWS_REGION');
    }

    //create a new NewsController
    const controller: NewsController = new NewsController({
      awsRegion: envVars.awsRegion!
    });

    //begin search
    const searchResults = await controller.getDailyNews();

    logger.log('Daily news handler completed successfully', {}, 'dailyNewsHandler');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Daily news handler executed successfully',
        timestamp: new Date().toISOString(),
      }),
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