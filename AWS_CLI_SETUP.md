# AWS CLI Setup Steps

## Step 1: Get Your AWS Credentials

1. Log in to [AWS Console](https://console.aws.amazon.com)
2. Go to **IAM** → **Users** → Select your user (or create a new one)
3. Click **Security credentials** tab
4. Scroll to **Access keys** section
5. Click **Create access key**
6. Choose **Command Line Interface (CLI)** as use case
7. Click **Next** → **Create access key**
8. **IMPORTANT**: Copy both:
   - **Access Key ID** (e.g., `AKIAIOSFODNN7EXAMPLE`)
   - **Secret Access Key** (e.g., `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)
   
   ⚠️ You can only see the Secret Key once! Save it securely.

## Step 2: Configure AWS CLI

Run this command in your terminal:
```bash
aws configure
```

You'll be prompted for 4 things:

1. **AWS Access Key ID**: Paste your Access Key ID
2. **AWS Secret Access Key**: Paste your Secret Access Key
3. **Default region name**: Enter your AWS region (e.g., `us-east-1`)
4. **Default output format**: Enter `json` (or just press Enter)

## Step 3: Verify Configuration

Test that it works:
```bash
aws sts get-caller-identity
```

This should return your AWS account ID and user info.

## Step 4: Get Your S3 Bucket Name and CloudFront Distribution ID

1. **S3 Bucket Name**: 
   - Go to S3 in AWS Console
   - Find your bucket (likely `n8tive.io` or similar)
   - Note the exact bucket name

2. **CloudFront Distribution ID**:
   - Go to CloudFront in AWS Console
   - Find your distribution
   - Copy the Distribution ID (e.g., `E1234567890ABC`)

## Step 5: Update deploy.sh (Optional)

Edit `deploy.sh` and update:
- `BUCKET_NAME` - Your S3 bucket name
- `DISTRIBUTION_ID` - Your CloudFront Distribution ID

## Step 6: Deploy!

Run the deployment script:
```bash
./deploy.sh
```

Or deploy manually:
```bash
# Upload navbar.js with short cache
aws s3 cp components/navbar.js s3://YOUR-BUCKET-NAME/components/navbar.js \
  --cache-control "public, max-age=3600"

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR-DISTRIBUTION-ID \
  --paths "/components/navbar.js"
```

## Troubleshooting

If you get "Unable to locate credentials":
- Make sure you ran `aws configure` correctly
- Check `~/.aws/credentials` file exists

If you get permission errors:
- Your IAM user needs these permissions:
  - `s3:PutObject`
  - `s3:GetObject`
  - `cloudfront:CreateInvalidation`


