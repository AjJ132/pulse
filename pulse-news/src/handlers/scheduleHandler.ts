import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export const scheduleHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    body: JSON.stringify({
      message: 'Schedule handler response',
      data: {
        schedules: [
          {
            id: '1',
            title: 'Morning Meeting',
            time: '09:00 AM',
            duration: '30 minutes',
            participants: ['John Doe', 'Jane Smith']
          }
        ]
      }
    })
  };
};