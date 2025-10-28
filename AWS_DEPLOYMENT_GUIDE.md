# AWS Deployment Guide for n8tive.io

This guide will walk you through deploying your website to AWS and connecting your GoDaddy domain.

## Architecture Overview
We'll use **AWS S3 + CloudFront** for optimal performance and cost-efficiency:
- **S3**: Hosts your static website files
- **CloudFront**: CDN for fast global delivery
- **Route 53**: DNS management (optional, but recommended)
- **Certificate Manager**: Free SSL/TLS certificates
- **GoDaddy**: Domain registrar (DNS will point to AWS)

---

## Part 1: AWS S3 Setup

### Step 1: Create S3 Bucket

1. Go to AWS Console → S3
2. Click **Create bucket**
3. Bucket name: `n8tive.io` (use your actual domain)
4. Region: Choose closest to your users (e.g., `us-east-1`)
5. **Uncheck** "Block all public access"
6. Acknowledge the warning
7. Click **Create bucket**

### Step 2: Enable Static Website Hosting

1. Click on your bucket
2. Go to **Properties** tab
3. Scroll to **Static website hosting**
4. Click **Edit**
5. Enable: **Enable**
6. Index document: `index.html`
7. Error document: `index.html` (for SPA routing)
8. Click **Save changes**
9. **Note the endpoint URL** (e.g., `http://n8tive.io.s3-website-us-east-1.amazonaws.com`)

### Step 3: Set Bucket Policy

1. Go to **Permissions** tab
2. Scroll to **Bucket policy**
3. Click **Edit**
4. Paste the following policy (replace `YOUR-BUCKET-NAME`):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
        }
    ]
}
```

5. Click **Save changes**

### Step 4: Upload Your Website

You can use AWS CLI or the console. Using CLI:

```bash
# Install AWS CLI if not already installed
# brew install awscli  # macOS
# Configure AWS CLI
aws configure

# Upload all files
aws s3 sync . s3://n8tive.io --exclude ".git/*" --exclude "node_modules/*" --exclude ".DS_Store" --exclude "*.md"
```

Or manually:
1. Click **Upload**
2. Drag all your files (index.html, style.css, script.js, components/, assets/, etc.)
3. Click **Upload**

---

## Part 2: AWS Certificate Manager (SSL Certificate)

### Step 1: Request Certificate

1. Go to AWS Console → **Certificate Manager**
2. **IMPORTANT**: Switch region to `us-east-1` (required for CloudFront)
3. Click **Request certificate**
4. Choose **Request a public certificate**
5. Click **Next**
6. Add domain names:
   - `n8tive.io`
   - `www.n8tive.io`
7. Validation method: **DNS validation**
8. Click **Request**

### Step 2: Note Validation Records

1. Click on the certificate
2. You'll see CNAME records for validation
3. **Keep this page open** - you'll need these for GoDaddy DNS

---

## Part 3: CloudFront Distribution

### Step 1: Create Distribution

1. Go to AWS Console → **CloudFront**
2. Click **Create distribution**
3. Configure:

**Origin Settings:**
- Origin domain: Select your S3 website endpoint (NOT the bucket, use the website endpoint)
- Or manually enter: `n8tive.io.s3-website-us-east-1.amazonaws.com`
- Protocol: **HTTP only** (S3 website endpoints only support HTTP)
- Name: `n8tive-s3-origin`

**Default Cache Behavior:**
- Viewer protocol policy: **Redirect HTTP to HTTPS**
- Allowed HTTP methods: **GET, HEAD, OPTIONS**
- Cache policy: **CachingOptimized**

**Settings:**
- Alternate domain names (CNAMEs):
  - `n8tive.io`
  - `www.n8tive.io`
- Custom SSL certificate: Select your certificate from ACM
- Default root object: `index.html`

4. Click **Create distribution**
5. **Note the CloudFront domain** (e.g., `d1234abcd.cloudfront.net`)
6. Wait 5-15 minutes for deployment

### Step 2: Configure Error Pages (for SPA routing)

1. Click on your distribution
2. Go to **Error pages** tab
3. Click **Create custom error response**
4. Configure:
   - HTTP error code: `403`
   - Customize error response: **Yes**
   - Response page path: `/index.html`
   - HTTP response code: `200`
5. Click **Create custom error response**
6. Repeat for error code `404`

---

## Part 4: GoDaddy DNS Configuration

### Step 1: Validate SSL Certificate

1. Log in to **GoDaddy**
2. Go to **My Products** → **DNS**
3. Click **DNS** for your domain
4. Add the CNAME records from AWS Certificate Manager:
   - Type: **CNAME**
   - Name: (from ACM, e.g., `_abc123...`)
   - Value: (from ACM, e.g., `_xyz789....acm-validations.aws`)
   - TTL: **600 seconds**
5. Click **Save**
6. Wait 5-30 minutes for validation
7. Check ACM - certificate should show "Issued"

### Step 2: Point Domain to CloudFront

**For Root Domain (n8tive.io):**
1. In GoDaddy DNS settings
2. Add/Edit **A Record**:
   - Type: **A**
   - Name: **@**
   - Value: CloudFront IP (not ideal, see alternative below)
   - TTL: **600 seconds**

**BETTER OPTION - Use Route 53 (Recommended):**

GoDaddy doesn't support ALIAS records, so the best practice is:

1. Go to AWS **Route 53**
2. Create a **Hosted Zone** for `n8tive.io`
3. Note the **4 nameservers** (e.g., `ns-123.awsdns-12.com`)
4. Go back to **GoDaddy**
5. Click **Manage DNS** → **Nameservers** → **Change**
6. Select **Custom**
7. Enter all 4 Route 53 nameservers
8. Click **Save**

**Then in Route 53:**
1. Create **A Record** (ALIAS):
   - Name: (leave blank for root domain)
   - Type: **A**
   - Alias: **Yes**
   - Alias target: Select your CloudFront distribution
2. Create **A Record** for www:
   - Name: **www**
   - Type: **A**
   - Alias: **Yes**
   - Alias target: Select your CloudFront distribution

---

## Part 5: Deployment Script

Create a deployment script for easy updates:

```bash
#!/bin/bash
# deploy.sh - Upload changes to S3 and invalidate CloudFront cache

BUCKET_NAME="n8tive.io"
DISTRIBUTION_ID="YOUR_CLOUDFRONT_DISTRIBUTION_ID"  # Get from CloudFront console

echo "Uploading to S3..."
aws s3 sync . s3://$BUCKET_NAME \
  --exclude ".git/*" \
  --exclude "node_modules/*" \
  --exclude ".DS_Store" \
  --exclude "*.md" \
  --exclude "deploy.sh" \
  --delete

echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

echo "Deployment complete!"
```

---

## Alternative: AWS Amplify (Easier but Less Control)

If you want simpler deployment:

1. Go to AWS Console → **Amplify**
2. Click **New app** → **Host web app**
3. Connect to your GitHub repository
4. Configure build settings (use default for static sites)
5. Add custom domain in Amplify
6. Update GoDaddy DNS with Amplify's CNAME records
7. Amplify auto-deploys on git push

---

## Costs Estimate

**Monthly costs (typical traffic):**
- S3 Storage: ~$0.50/month (for ~1GB)
- S3 Requests: ~$0.10/month
- CloudFront: ~$1-5/month (first 1TB free tier for 12 months)
- Route 53: $0.50/month (hosted zone)
- Certificate Manager: **FREE**

**Total: ~$2-7/month** (very low for a production site)

---

## Monitoring & Maintenance

### CloudFront Cache Invalidation
After updates, invalidate the cache:
```bash
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### Update Content
```bash
aws s3 sync . s3://n8tive.io --exclude ".git/*" --delete
```

### Check Logs
- S3 Access Logs: Enable in S3 bucket settings
- CloudFront Logs: Enable in distribution settings

---

## Troubleshooting

**Issue: 403 Forbidden**
- Check S3 bucket policy is public
- Verify CloudFront origin is the S3 **website endpoint**, not bucket endpoint

**Issue: CSS/JS not loading**
- Check file permissions in S3 (should be public)
- Clear CloudFront cache
- Check browser console for CORS errors

**Issue: Domain not working**
- Verify DNS propagation: `dig n8tive.io` or use https://whatsmydns.net
- Check certificate is validated and attached to CloudFront
- Wait up to 48 hours for full DNS propagation

**Issue: SSL Certificate pending**
- Verify CNAME records in GoDaddy are correct
- Wait up to 30 minutes for validation

---

## Security Best Practices

1. **Enable CloudFront Security Headers:**
   - Use Lambda@Edge or CloudFront Functions to add security headers
   - X-Content-Type-Options, X-Frame-Options, CSP, etc.

2. **Enable WAF (Web Application Firewall):**
   - Attach AWS WAF to CloudFront (optional, adds cost)

3. **S3 Bucket Security:**
   - Only allow CloudFront to access S3 (use Origin Access Identity)
   - Block all direct S3 access

4. **Monitoring:**
   - Enable CloudWatch alarms for unusual traffic
   - Set up AWS CloudTrail for audit logs

---

## Next Steps

1. ✅ Create S3 bucket
2. ✅ Upload website files
3. ✅ Request SSL certificate
4. ✅ Create CloudFront distribution
5. ✅ Validate certificate in GoDaddy
6. ✅ Update GoDaddy nameservers to Route 53 (or add A records)
7. ✅ Test your domain
8. ✅ Set up deployment script

---

## Support

If you need help with any step, refer to:
- [AWS S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [AWS CloudFront Documentation](https://docs.aws.amazon.com/cloudfront/)
- [AWS Certificate Manager](https://docs.aws.amazon.com/acm/)
- [Route 53 Documentation](https://docs.aws.amazon.com/route53/)

