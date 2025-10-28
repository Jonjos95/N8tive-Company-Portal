#!/bin/bash

# N8tive.io AWS Deployment Script
# This script uploads your website to S3 and invalidates CloudFront cache

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - UPDATE THESE VALUES
BUCKET_NAME="n8tive.io"  # Your S3 bucket name
DISTRIBUTION_ID=""        # Your CloudFront distribution ID (get from AWS Console)
REGION="us-east-1"        # Your AWS region

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo "Install with: brew install awscli (macOS) or follow https://aws.amazon.com/cli/"
    exit 1
fi

# Check if AWS is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not configured${NC}"
    echo "Run: aws configure"
    exit 1
fi

# Check if DISTRIBUTION_ID is set
if [ -z "$DISTRIBUTION_ID" ]; then
    echo -e "${YELLOW}Warning: DISTRIBUTION_ID is not set${NC}"
    echo "CloudFront cache invalidation will be skipped"
    echo "To enable, edit deploy.sh and add your CloudFront distribution ID"
    SKIP_INVALIDATION=true
fi

echo -e "${GREEN}Starting deployment to AWS...${NC}"
echo ""

# Step 1: Sync files to S3
echo -e "${YELLOW}Step 1: Uploading files to S3 bucket: $BUCKET_NAME${NC}"
aws s3 sync . s3://$BUCKET_NAME \
  --region $REGION \
  --exclude ".git/*" \
  --exclude "node_modules/*" \
  --exclude ".DS_Store" \
  --exclude "*.md" \
  --exclude "deploy.sh" \
  --exclude ".gitignore" \
  --exclude "*.log" \
  --exclude ".env*" \
  --exclude "*.sh" \
  --delete \
  --cache-control "public, max-age=31536000" \
  --exclude "*.html" \
  --exclude "*.json"

# Upload HTML with shorter cache (for frequent updates)
aws s3 sync . s3://$BUCKET_NAME \
  --region $REGION \
  --exclude "*" \
  --include "*.html" \
  --cache-control "public, max-age=3600" \
  --delete

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Files uploaded successfully${NC}"
else
    echo -e "${RED}✗ Upload failed${NC}"
    exit 1
fi

echo ""

# Step 2: Invalidate CloudFront cache
if [ "$SKIP_INVALIDATION" != true ]; then
    echo -e "${YELLOW}Step 2: Invalidating CloudFront cache...${NC}"
    INVALIDATION_OUTPUT=$(aws cloudfront create-invalidation \
      --distribution-id $DISTRIBUTION_ID \
      --paths "/*" \
      --query 'Invalidation.Id' \
      --output text)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Cache invalidation created: $INVALIDATION_OUTPUT${NC}"
        echo "Note: Invalidation may take 5-15 minutes to complete"
    else
        echo -e "${RED}✗ Cache invalidation failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Step 2: Skipping CloudFront cache invalidation (not configured)${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Your website should be live at:"
echo "  • S3 Website: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
if [ "$SKIP_INVALIDATION" != true ]; then
    echo "  • CloudFront: Wait 5-15 minutes for cache invalidation"
fi
echo "  • Custom Domain: https://n8tive.io (after DNS propagation)"
echo ""

