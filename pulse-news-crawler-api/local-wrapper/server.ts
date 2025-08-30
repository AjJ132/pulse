import express from 'express';
import { config } from 'dotenv';
import { handler } from '../src/pulse';

// Load environment variables from .env file
config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Convert Express request to simple Lambda event
const createSimpleEvent = (req: express.Request) => ({
  body: req.body ? JSON.stringify(req.body) : null,
  headers: req.headers as { [name: string]: string },
  httpMethod: req.method,
  path: req.path,
  queryStringParameters: req.query as { [name: string]: string } || null,
  pathParameters: req.params || null,
  isBase64Encoded: false,
  multiValueHeaders: {},
  multiValueQueryStringParameters: null,
  stageVariables: null,
  requestContext: {
    accountId: 'local',
    apiId: 'local',
    authorizer: {},
    httpMethod: req.method,
    identity: {
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
             sourceIp: req.ip || '127.0.0.1',
      user: null,
      userAgent: req.get('User-Agent') || null,
      userArn: null,
      clientCert: null
    },
    path: req.path,
    protocol: req.protocol,
    requestId: 'local-' + Date.now(),
    requestTime: new Date().toISOString(),
    requestTimeEpoch: Date.now(),
    resourceId: 'local',
    resourcePath: req.path,
    stage: 'local'
  },
  resource: req.path
});

// Simple Lambda context
const createSimpleContext = () => ({
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'local-handler',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:local-handler',
  memoryLimitInMB: '128',
  awsRequestId: 'local-' + Date.now(),
  logGroupName: '/aws/lambda/local-handler',
  logStreamName: '2023/01/01/[$LATEST]' + Date.now(),
  getRemainingTimeInMillis: () => 30000,
  done: () => {},
  fail: () => {},
  succeed: () => {}
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'pulse-news-lambda-local'
  });
});

// Route handler
app.all('*', async (req, res) => {
  try {
    console.log(`${req.method} ${req.path}`);
    
    const event = createSimpleEvent(req);
    const context = createSimpleContext();
    
    const lambdaResponse = await handler(event, context);
    
    res.status(lambdaResponse.statusCode || 200);
    
    if (lambdaResponse.headers) {
      Object.entries(lambdaResponse.headers).forEach(([key, value]) => {
        res.set(key, value as string);
      });
    }
    
    if (lambdaResponse.body) {
      res.send(lambdaResponse.body);
    } else {
      res.end();
    }
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Local server running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`📰 Available endpoints:`);
  console.log(`   GET    http://localhost:${PORT}/news`);
  console.log(`   GET    http://localhost:${PORT}/schedule`);
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});
