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
    Lambda function to send push notifications to registered devices
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
        
        # Extract notification details - support both formats
        message = body.get('message', 'Hello from Pulse!')
        title = body.get('title', 'Pulse Notification')
        user_id = body.get('user_id') or body.get('userId')
        device_id = body.get('device_id') or body.get('deviceId')
        device_token = body.get('device_token') or body.get('deviceToken')  # Direct device token support
        
        logger.info(f"Sending notification: {title} - {message}")
        
        # Get device tokens to send to
        device_tokens = []
        
        if device_token:
            # Direct device token provided - create temporary endpoint for testing
            device_tokens = [{'device_token': device_token, 'device_id': 'direct-token'}]
        elif device_id:
            # Send to specific device
            device_tokens = get_device_token(device_id)
        elif user_id:
            # Send to all devices for a user
            device_tokens = get_user_device_tokens(user_id)
        else:
            # Send to all registered devices (for testing)
            device_tokens = get_all_device_tokens()
        
        if not device_tokens:
            return {
                'statusCode': 404,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': json.dumps({
                    'error': 'No device tokens found',
                    'message': 'No registered devices found for the specified criteria'
                })
            }
        
        # Send notifications
        results = []
        for token_info in device_tokens:
            if 'endpoint_arn' in token_info:
                # Regular registered device
                result = send_notification_to_device(
                    token_info['endpoint_arn'],
                    title,
                    message,
                    token_info.get('device_id')
                )
            elif 'device_token' in token_info:
                # Direct device token - create temporary endpoint
                result = send_notification_to_direct_token(
                    token_info['device_token'],
                    title,
                    message,
                    token_info.get('device_id', 'direct-token')
                )
            else:
                result = {
                    'success': False,
                    'error': 'Invalid token info format'
                }
            results.append(result)
        
        successful_sends = [r for r in results if r['success']]
        failed_sends = [r for r in results if not r['success']]
        
        response_body = {
            'message': 'Notifications sent',
            'total_devices': len(device_tokens),
            'successful': len(successful_sends),
            'failed': len(failed_sends),
            'results': results
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps(response_body)
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

def get_device_token(device_id):
    """Get device token for a specific device"""
    try:
        table = dynamodb.Table(os.environ['DYNAMODB_TABLE_NAME'])
        response = table.get_item(Key={'device_id': device_id})
        
        if 'Item' in response:
            return [response['Item']]
        return []
    except Exception as e:
        logger.error(f"Error getting device token: {str(e)}")
        return []

def get_user_device_tokens(user_id):
    """Get all device tokens for a specific user"""
    try:
        table = dynamodb.Table(os.environ['DYNAMODB_TABLE_NAME'])
        response = table.query(
            IndexName='user-id-index',
            KeyConditionExpression='user_id = :user_id',
            ExpressionAttributeValues={':user_id': user_id}
        )
        
        return response.get('Items', [])
    except Exception as e:
        logger.error(f"Error getting user device tokens: {str(e)}")
        return []

def get_all_device_tokens():
    """Get all registered device tokens (for testing purposes)"""
    try:
        table = dynamodb.Table(os.environ['DYNAMODB_TABLE_NAME'])
        response = table.scan()
        
        return response.get('Items', [])
    except Exception as e:
        logger.error(f"Error getting all device tokens: {str(e)}")
        return []

def send_notification_to_direct_token(device_token, title, message, device_id=None):
    """Send notification to a device token directly (for testing)"""
    try:
        platform_application_arn = os.environ.get('SNS_PLATFORM_APPLICATION_ARN')
        
        if not platform_application_arn:
            logger.warning("No SNS Platform Application ARN configured - APNS certificate required")
            return {
                'success': False,
                'device_id': device_id,
                'device_token': device_token,
                'error': 'SNS Platform Application not configured - APNS certificate required'
            }
        
        # Create temporary endpoint
        response = sns_client.create_platform_endpoint(
            PlatformApplicationArn=platform_application_arn,
            Token=device_token,
            CustomUserData=device_id or 'direct-token'
        )
        
        endpoint_arn = response['EndpointArn']
        
        # Send notification
        result = send_notification_to_device(endpoint_arn, title, message, device_id)
        
        # Clean up temporary endpoint (optional - SNS will handle duplicates)
        try:
            sns_client.delete_endpoint(EndpointArn=endpoint_arn)
        except:
            pass  # Ignore cleanup errors
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to send notification to direct token: {str(e)}")
        return {
            'success': False,
            'device_id': device_id,
            'device_token': device_token,
            'error': str(e)
        }

def send_notification_to_device(endpoint_arn, title, message, device_id=None):
    """Send notification to a specific device endpoint"""
    try:
        # Create the payload for iOS APNS
        payload = {
            'APNS': json.dumps({
                'aps': {
                    'alert': {
                        'title': title,
                        'body': message
                    },
                    'sound': 'default',
                    'badge': 1
                },
                'custom_data': {
                    'timestamp': str(uuid.uuid4())
                }
            })
        }
        
        # Send the notification
        response = sns_client.publish(
            TargetArn=endpoint_arn,
            Message=json.dumps(payload),
            MessageStructure='json'
        )
        
        logger.info(f"Notification sent successfully to {device_id or endpoint_arn}: {response['MessageId']}")
        
        return {
            'success': True,
            'device_id': device_id,
            'endpoint_arn': endpoint_arn,
            'message_id': response['MessageId']
        }
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        error_message = e.response['Error']['Message']
        logger.error(f"Failed to send notification to {device_id or endpoint_arn}: {error_code} - {error_message}")
        
        # Check if endpoint is disabled or invalid
        if error_code in ['EndpointDisabled', 'InvalidParameter']:
            # TODO: Could implement logic to remove invalid endpoints from DynamoDB
            pass
        
        return {
            'success': False,
            'device_id': device_id,
            'endpoint_arn': endpoint_arn,
            'error': f"{error_code}: {error_message}"
        }
    except Exception as e:
        logger.error(f"Unexpected error sending notification to {device_id or endpoint_arn}: {str(e)}")
        return {
            'success': False,
            'device_id': device_id,
            'endpoint_arn': endpoint_arn,
            'error': str(e)
        }
