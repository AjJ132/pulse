import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

import { PulseGenFunctionRoute } from './types/routes';
import { parseRoute } from './utils/routeParser';
import { newsHandler } from './handlers/NewsHandler';


export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {

    const { httpMethod, path } = event;

    // Parse the route to determine the appropriate handler
    const routeInfo = parseRoute(path);
    
    // Route to appropriate handler based on parsed route
    switch (routeInfo.mainRoute) {
      case PulseGenFunctionRoute.NEWS:
        return await newsHandler(event, context);

      default:
        // This should not happen due to route validation, but handle gracefully
        break;
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
