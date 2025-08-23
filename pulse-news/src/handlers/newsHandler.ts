import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';

export const newsHandler = async (
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
        message: 'News handler response',
        data: {
          articles: [
            {
              id: '1',
              title: 'Sample News Article',
              content: 'This is a sample news article content.',
              author: 'John Doe',
              publishedAt: new Date().toISOString()
            }
          ]
        }
      })
    }
}