import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { newsHandler } from './handlers/newsHandler';
import { scheduleHandler } from './handlers/scheduleHandler';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));
    console.log('Context:', JSON.stringify(context, null, 2));

    const { httpMethod, path } = event;
    const pathSegments = path.split('/').filter(Boolean);

    // Route to appropriate handler based on path
    if (pathSegments[0] === 'news') {
      return await newsHandler(event, context);
    }

    if (pathSegments[0] === 'schedule') {
      return await scheduleHandler(event, context);
    }

    // Default response for unknown routes
    return {
      statusCode: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify({
        message: 'Route not found',
        path: path,
        method: httpMethod
      })
    };

  } catch (error) {
    console.error('Error in handler:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
