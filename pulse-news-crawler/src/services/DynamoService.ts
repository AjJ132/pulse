import {
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';

export interface DynamoServiceConfig {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}


export class DynamoService {
  private client: DynamoDBClient;

  constructor(config: DynamoServiceConfig) {
    const clientConfig: any = {
      region: config.region || process.env.AWS_REGION || 'us-east-1',
    };

    // Only add credentials if provided (useful for local development)
    if (config.accessKeyId && config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      };
    }

    this.client = new DynamoDBClient(clientConfig);
  }


}
