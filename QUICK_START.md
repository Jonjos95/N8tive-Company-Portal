# Quick Start: Deploy to AWS with GoDaddy Domain

## Prerequisites
- AWS Account ([sign up here](https://aws.amazon.com/))
- AWS CLI installed (`brew install awscli` on macOS)
- GoDaddy domain purchased
- Basic terminal/command line knowledge

---

## 🚀 Fastest Method: Use CloudFormation (Automated)

### 1. Install AWS CLI & Configure
```bash
# Install AWS CLI (macOS)
brew install awscli

# Configure AWS credentials
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output format: json
```

### 2. Request SSL Certificate
```bash
# Go to AWS Console > Certificate Manager (us-east-1 region)
# Request certificate for:
#   - n8tive.io
#   - www.n8tive.io
# Choose DNS validation
# Copy the CNAME records
```

### 3. Add DNS Validation Records to GoDaddy
```
Log in to GoDaddy > My Products > DNS
Add the CNAME records from AWS Certificate Manager
Wait for certificate to show "Issued" status (5-30 minutes)
```

### 4. Deploy with CloudFormation
```bash
# Get your certificate ARN from AWS Certificate Manager
CERT_ARN="arn:aws:acm:us-east-1:123456789:certificate/abc-123-xyz"

# Create the stack
aws cloudformation create-stack \
  --stack-name n8tive-website \
  --template-body file://aws-configs/cloudformation-template.yaml \
  --parameters ParameterKey=DomainName,ParameterValue=n8tive.io \
               ParameterKey=CertificateArn,ParameterValue=$CERT_ARN \
  --region us-east-1

# Wait for stack creation (5-10 minutes)
aws cloudformation wait stack-create-complete --stack-name n8tive-website --region us-east-1
```

### 5. Get Stack Outputs
```bash
# Get your CloudFront distribution ID and domain
aws cloudformation describe-stacks \
  --stack-name n8tive-website \
  --region us-east-1 \
  --query 'Stacks[0].Outputs'
```

### 6. Upload Your Website
```bash
# Get bucket name from outputs
BUCKET_NAME="n8tive.io"

# Upload files
aws s3 sync . s3://$BUCKET_NAME \
  --exclude ".git/*" --exclude "*.md" --exclude ".DS_Store"

# Get CloudFront Distribution ID from outputs
DISTRIBUTION_ID="E1234567890ABC"

# Invalidate cache
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

### 7. Update GoDaddy DNS

**Option A: Use Route 53 (Recommended)**
```bash
# Create hosted zone
aws route53 create-hosted-zone --name n8tive.io --caller-reference $(date +%s)

# Note the nameservers from output
# Go to GoDaddy > Domain Settings > Nameservers > Change to Custom
# Enter the 4 nameservers from Route 53

# Then create records in Route 53 (or use console):
# A record for n8tive.io → CloudFront (ALIAS)
# A record for www.n8tive.io → CloudFront (ALIAS)
```

**Option B: Update GoDaddy DNS Directly**
```
Go to GoDaddy > DNS Management
Add CNAME record:
  - Type: CNAME
  - Name: www
  - Value: d1234567890.cloudfront.net (your CloudFront domain)
  - TTL: 600

For root domain, you may need to use ALIAS or A record
Note: GoDaddy has limitations with root domain CNAMEs
```

### 8. Update Deploy Script
```bash
# Edit deploy.sh and add your distribution ID
nano deploy.sh
# Update DISTRIBUTION_ID="YOUR_ID_HERE"

# Make it executable
chmod +x deploy.sh

# Test deployment
./deploy.sh
```

---

## 📝 Manual Method: Step by Step

If you prefer manual setup, follow the **AWS_DEPLOYMENT_GUIDE.md** for detailed instructions.

---

## 🔄 Daily Workflow

After initial setup, deploying updates is simple:

```bash
# Make your changes to the website
# Then deploy:
./deploy.sh
```

Or manually:
```bash
aws s3 sync . s3://n8tive.io --exclude ".git/*"
aws cloudfront create-invalidation --distribution-id E1234567890ABC --paths "/*"
```

---

## 🎯 Testing Your Deployment

1. **S3 Website**: `http://n8tive.io.s3-website-us-east-1.amazonaws.com`
2. **CloudFront**: `https://d1234567890.cloudfront.net`
3. **Custom Domain**: `https://n8tive.io` (after DNS propagation)

Test with:
```bash
# Check DNS propagation
dig n8tive.io

# Check SSL certificate
curl -I https://n8tive.io

# Check website response
curl https://n8tive.io
```

---

## 🐛 Common Issues

### Certificate Validation Stuck
- Verify CNAME records in GoDaddy are correct (no typos)
- Wait up to 30 minutes
- Check ACM in us-east-1 region only

### 403 Forbidden Error
- Check S3 bucket policy allows public read
- Verify CloudFront origin points to S3 website endpoint
- Clear CloudFront cache

### Domain Not Resolving
- Check DNS propagation: https://whatsmydns.net
- Verify nameservers are correct (if using Route 53)
- Wait up to 48 hours for full propagation

### CSS/JS Files Not Loading
- Check file permissions in S3
- Clear browser cache
- Invalidate CloudFront cache

---

## 💰 Cost Estimate

- **S3**: ~$0.50/month
- **CloudFront**: $1-5/month (free tier available)
- **Route 53**: $0.50/month (optional)
- **Certificate**: FREE

**Total: $2-7/month**

---

## 📚 Next Steps

1. ✅ Complete deployment
2. Set up GitHub Actions for auto-deployment
3. Enable CloudWatch monitoring
4. Configure AWS WAF for security
5. Set up backup/disaster recovery

---

## 🆘 Need Help?

- AWS Support: https://console.aws.amazon.com/support
- GoDaddy Support: https://www.godaddy.com/help
- AWS Documentation: https://docs.aws.amazon.com
- Full Guide: See **AWS_DEPLOYMENT_GUIDE.md**

