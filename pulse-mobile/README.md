# Pulse Mobile PWA

A Progressive Web App (PWA) built with Vite and deployed to AWS using S3 and CloudFront.

## Features

- Progressive Web App (PWA) with service worker
- Responsive design for mobile devices
- Deployed on AWS S3 with CloudFront CDN
- Automated deployment with Terraform

## Prerequisites

Before deploying, make sure you have the following installed:

1. **Node.js** (v16 or higher)
2. **AWS CLI** - [Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
3. **Terraform** - [Installation Guide](https://developer.hashicorp.com/terraform/downloads)
4. **AWS Credentials** configured

### AWS Credentials Setup

Configure your AWS credentials using one of these methods:

```bash
# Method 1: AWS CLI configure
aws configure

# Method 2: Environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

## Development

### Install Dependencies

```bash
npm install
```

### Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

#### Quick Commit
```bash
npm run commit <type> "<message>"
```

#### Manual Commit
```bash
git commit
# This will open the commit template with conventional format
```

#### Commit Types
- `feat` - A new feature
- `fix` - A bug fix  
- `chore` - Maintenance tasks, dependencies, etc.
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `perf` - Performance improvements

#### Examples
```bash
npm run commit feat "add user authentication"
npm run commit fix "resolve mobile layout issues"
npm run commit chore "update dependencies"
npm run commit docs "update README with deployment instructions"
```

### Start Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

## Deployment

### Quick Deploy

To deploy the entire application (infrastructure + code):

```bash
npm run apply
```

This command will:
1. Initialize Terraform (if needed)
2. Deploy AWS infrastructure (S3 bucket + CloudFront distribution)
3. Build the PWA
4. Upload files to S3
5. Invalidate CloudFront cache
6. Provide you with the deployment URL

### Manual Deployment Steps

If you prefer to deploy manually:

1. **Deploy Infrastructure:**
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

2. **Build and Deploy Application:**
   ```bash
   npm run build
   aws s3 sync dist/ s3://your-bucket-name --delete
   aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
   ```

## Infrastructure

The Terraform configuration creates:

- **S3 Bucket**: Hosts the static files with public read access
- **CloudFront Distribution**: CDN for global content delivery
- **Origin Access Control**: Secure access between CloudFront and S3
- **Bucket Policy**: Allows public read access for web hosting

### Configuration

Edit `terraform/terraform.tfvars` to customize:

- AWS region
- Environment name
- S3 bucket name
- Custom domain (optional)

## Testing on Mobile

After deployment, you can test the PWA on your phone by:

1. Opening the CloudFront URL in your mobile browser
2. Adding the app to your home screen (iOS: Share → Add to Home Screen, Android: Add to Home Screen)
3. The app will work offline thanks to the service worker

## Project Structure

```
pulse-mobile/
├── src/                    # Source code
├── public/                 # Static assets
├── terraform/              # Infrastructure as Code
│   ├── main.tf            # Main Terraform configuration
│   ├── variables.tf       # Variable definitions
│   └── terraform.tfvars   # Variable values
├── scripts/               # Deployment scripts
│   └── deploy.sh         # Main deployment script
├── dist/                  # Build output (generated)
└── package.json          # Project configuration
```

## Troubleshooting

### Common Issues

1. **AWS Credentials Not Found**
   - Ensure AWS CLI is configured: `aws configure`
   - Check environment variables are set correctly

2. **Terraform State Lock**
   - If deployment fails due to state lock, wait a few minutes and retry
   - Or force unlock: `terraform force-unlock LOCK_ID`

3. **S3 Bucket Name Already Exists**
   - Update the bucket name in `terraform/terraform.tfvars`
   - S3 bucket names must be globally unique

4. **CloudFront Cache Issues**
   - The deployment script automatically invalidates the cache
   - Manual invalidation: `aws cloudfront create-invalidation --distribution-id ID --paths "/*"`

### Logs and Debugging

- Check Terraform logs: `terraform logs`
- Check AWS CloudTrail for API calls
- Monitor CloudFront metrics in AWS Console

## Security

- S3 bucket has public read access for web hosting
- CloudFront provides HTTPS by default
- Origin Access Control secures S3-CloudFront communication
- All resources are tagged for cost tracking and management

## Cost Optimization

- CloudFront Price Class 100 (US, Canada, Europe)
- S3 Standard storage class
- Consider enabling S3 lifecycle policies for cost optimization

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review AWS documentation for S3 and CloudFront
3. Check Terraform documentation for infrastructure issues 