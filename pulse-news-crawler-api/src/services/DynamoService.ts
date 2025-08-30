import {
  DynamoDBClient,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';

export interface DynamoServiceConfig {
  region?: string;
}

export interface DynamoScanParams {
  TableName: string;
  Limit?: number;
  FilterExpression?: string;
  ExpressionAttributeValues?: { [key: string]: any };
}

export class DynamoDBService {
  private client: DynamoDBClient;

  constructor(config: DynamoServiceConfig) {
    const clientConfig: any = {
      region: config.region || process.env.AWS_REGION || 'us-east-1',
    };

    this.client = new DynamoDBClient(clientConfig);
  }

  public async scan(params: DynamoScanParams): Promise<any> {
    try {
      const scanCommand = new ScanCommand(params);
      const result = await this.client.send(scanCommand);
      return result;
    } catch (error) {
      console.error('Error scanning DynamoDB:', error);
      throw new Error('Error scanning DynamoDB');
    }
  }


}
