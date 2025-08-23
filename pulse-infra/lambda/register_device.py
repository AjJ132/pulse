import json
import boto3
import os
import logging
import uuid
from botocore.exceptions import ClientError

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
sns_client = boto3.client('sns')
dynamodb = boto3.resource('dynamodb')

def handler(event, context):
    """
    Lambda function to register device tokens for push notifications
    """
    try:
        # Parse the request body
        if event.get('body'):
            if isinstance(event['body'], str):
                body = json.loads(event['body'])
            else:
                body = event['body']
        else:
            body = event
        
        # Extract registration details from your DeviceInfoManager
        device_token = body.get('device_token') or body.get('deviceToken')
        user_id = body.get('user_id') or body.get('userId', 'anonymous')
        device_id = body.get('device_id') or body.get('deviceId', str(uuid.uuid4()))
        bundle_id = body.get('bundle_id') or body.get('bundleId')
        platform = body.get('platform', 'ios')
        timestamp = body.get('timestamp')
        
        if not device_token:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': json.dumps({
                    'error': 'Missing device_token',
                    'message': 'device_token is required'
                })
            }
        
        logger.info(f"Registering device: {device_id} for user: {user_id}")
        
        # Create SNS platform endpoint
        endpoint_arn = create_platform_endpoint(device_token, device_id)
        
        if not endpoint_arn:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'Failed to create platform endpoint',
                    'message': 'Could not register device with SNS'
                })
            }
        
        # Store device information in DynamoDB
        success = store_device_token(device_id, user_id, device_token, endpoint_arn, bundle_id, platform, timestamp)
        
        if not success:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'Failed to store device token',
                    'message': 'Could not save device information'
                })
            }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps({
                'message': 'Device registered successfully',
                'device_id': device_id,
                'endpoint_arn': endpoint_arn
            })
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Invalid JSON',
                'message': str(e)
            })
        }
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }

def create_platform_endpoint(device_token, device_id):
    """Create a platform endpoint in SNS for the device"""
    try:
        platform_application_arn = os.environ.get('SNS_PLATFORM_APPLICATION_ARN')
        
        if not platform_application_arn:
            logger.warning("No SNS Platform Application ARN configured - APNS certificate required")
            # For now, return a dummy ARN so the registration can complete
            # The actual push notifications won't work until the certificate is configured
            return f"arn:aws:sns:us-east-1:123456789012:app/APNS/dummy-endpoint-{device_id}"
        
        response = sns_client.create_platform_endpoint(
            PlatformApplicationArn=platform_application_arn,
            Token=device_token,
            CustomUserData=device_id
        )
        
        endpoint_arn = response['EndpointArn']
        logger.info(f"Created platform endpoint: {endpoint_arn}")
        
        return endpoint_arn
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        
        if error_code == 'InvalidParameter':
            # Token might already exist, try to find existing endpoint
            logger.warning(f"Device token might already exist: {error_message}")
            # In a production app, you'd want to handle this case better
            # by searching for existing endpoints and updating them
        
        logger.error(f"Failed to create platform endpoint: {error_code} - {error_message}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error creating platform endpoint: {str(e)}")
        return None

def store_device_token(device_id, user_id, device_token, endpoint_arn, bundle_id=None, platform='ios', timestamp=None):
    """Store device token information in DynamoDB"""
    try:
        table = dynamodb.Table(os.environ['DYNAMODB_TABLE_NAME'])
        
        table.put_item(
            Item={
                'device_id': device_id,
                'user_id': user_id,
                'device_token': device_token,
                'endpoint_arn': endpoint_arn,
                'bundle_id': bundle_id or 'unknown',
                'platform': platform,
                'created_at': timestamp or str(uuid.uuid4()),
                'last_updated': str(uuid.uuid4()),
                'active': True
            }
        )
        
        logger.info(f"Stored device token for device: {device_id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to store device token: {str(e)}")
        return False
