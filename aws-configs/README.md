# AWS Configuration Files

This directory contains all the configuration files needed for deploying to AWS.

## Files

### 📄 s3-bucket-policy.json
S3 bucket policy that allows public read access to your website files.

**Usage:**
1. Go to S3 → Your bucket → Permissions → Bucket Policy
2. Copy the contents of this file
3. Replace `n8tive.io` with your bucket name
4. Paste and save

---

### 📄 cloudformation-template.yaml
CloudFormation template that automatically creates:
- S3 bucket for hosting
- S3 bucket policy
- CloudFront distribution
- Origin Access Identity
- Custom error pages (for SPA routing)

**Usage:**
```bash
aws cloudformation create-stack \
  --stack-name n8tive-website \
  --template-body file://aws-configs/cloudformation-template.yaml \
  --parameters ParameterKey=DomainName,ParameterValue=n8tive.io \
               ParameterKey=CertificateArn,ParameterValue=YOUR_CERT_ARN \
  --region us-east-1
```

**Prerequisites:**
- SSL certificate created in AWS Certificate Manager (us-east-1)
- Certificate ARN from ACM

---

### 📄 GITHUB_SECRETS_SETUP.md
Instructions for configuring GitHub Secrets to enable automated deployment via GitHub Actions.

**Required Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `CLOUDFRONT_DISTRIBUTION_ID`

See the file for detailed setup instructions.

---

## Quick Reference

### Deploy manually:
```bash
./deploy.sh
```

### Deploy via AWS CLI:
```bash
aws s3 sync . s3://n8tive.io --exclude ".git/*" --delete
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### Deploy via CloudFormation:
See `cloudformation-template.yaml` or `QUICK_START.md`

### Deploy via GitHub Actions:
Push to main branch or trigger manually from Actions tab

---

## Support

For detailed instructions, see:
- **QUICK_START.md** - Fast deployment guide
- **AWS_DEPLOYMENT_GUIDE.md** - Comprehensive step-by-step guide
- **GITHUB_SECRETS_SETUP.md** - GitHub Actions setup

