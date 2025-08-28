import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';



export const newsHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
    return {
        statusCode: 200,
        body: JSON.stringify({ message: "News Handler Response" }),
    }
    
}