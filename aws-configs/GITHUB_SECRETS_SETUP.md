# GitHub Secrets Setup for Automated Deployment

To enable automatic deployment when you push to GitHub, you need to configure GitHub Secrets.

## Required Secrets

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### 1. AWS_ACCESS_KEY_ID
Your AWS access key for programmatic access.

**How to get it:**
1. Go to AWS Console → IAM → Users
2. Create a new user (e.g., `github-deployer`) or use existing
3. Attach policies:
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
   - Or create custom policy (recommended - see below)
4. Go to **Security credentials** tab
5. Click **Create access key** → Choose "Command Line Interface (CLI)"
6. Copy the **Access key ID**
7. In GitHub, create secret named: `AWS_ACCESS_KEY_ID`

### 2. AWS_SECRET_ACCESS_KEY
Your AWS secret access key (shown only once when creating access key).

**How to get it:**
- From step 6 above, copy the **Secret access key**
- In GitHub, create secret named: `AWS_SECRET_ACCESS_KEY`
- ⚠️ **Important**: Save this securely - AWS shows it only once

### 3. S3_BUCKET_NAME
Your S3 bucket name.

**Value:**
```
n8tive.io
```
(or whatever your bucket name is)

In GitHub, create secret named: `S3_BUCKET_NAME`

### 4. CLOUDFRONT_DISTRIBUTION_ID
Your CloudFront distribution ID.

**How to get it:**
1. Go to AWS Console → CloudFront
2. Find your distribution
3. Copy the **Distribution ID** (e.g., `E1234567890ABC`)
4. In GitHub, create secret named: `CLOUDFRONT_DISTRIBUTION_ID`

---

## Custom IAM Policy (Recommended for Security)

Instead of using `AmazonS3FullAccess`, create a custom policy with minimal permissions:

### Policy Name: `GitHubDeployerPolicy`

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "S3Upload",
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:PutObjectAcl",
                "s3:GetObject",
                "s3:ListBucket",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::n8tive.io",
                "arn:aws:s3:::n8tive.io/*"
            ]
        },
        {
            "Sid": "CloudFrontInvalidation",
            "Effect": "Allow",
            "Action": [
                "cloudfront:CreateInvalidation",
                "cloudfront:GetInvalidation",
                "cloudfront:ListInvalidations"
            ],
            "Resource": "*"
        }
    ]
}
```

**How to apply:**
1. Go to AWS Console → IAM → Policies
2. Click **Create policy** → JSON tab
3. Paste the policy above
4. Replace `n8tive.io` with your bucket name
5. Name it: `GitHubDeployerPolicy`
6. Go to your IAM user
7. Attach this policy instead of the full access policies

---

## Testing Automated Deployment

Once secrets are configured:

1. Make any change to your website
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Test automated deployment"
   git push github main
   ```
3. Go to GitHub → **Actions** tab
4. Watch the workflow run
5. After 5-15 minutes, check your website

---

## Manual Trigger

You can also trigger deployment manually without pushing code:

1. Go to GitHub → **Actions** tab
2. Select **Deploy to AWS S3 + CloudFront** workflow
3. Click **Run workflow** → **Run workflow**

---

## Security Best Practices

1. **Never commit AWS credentials to Git**
   - Always use GitHub Secrets
   - Never hardcode credentials in code

2. **Use IAM roles with minimal permissions**
   - Follow principle of least privilege
   - Create separate users for different purposes

3. **Rotate access keys regularly**
   - Every 90 days is recommended
   - Delete unused access keys

4. **Enable MFA on AWS account**
   - Adds extra security layer
   - Recommended for production accounts

5. **Monitor CloudTrail logs**
   - Track all API calls
   - Set up alerts for suspicious activity

---

## Troubleshooting

### Workflow fails with "Access Denied"
- Check IAM user has correct permissions
- Verify secrets are correctly named
- Check bucket name is correct

### Workflow succeeds but website not updated
- CloudFront cache may take 5-15 minutes to invalidate
- Check S3 files were actually uploaded
- Clear browser cache and test

### InvalidAccessKeyId error
- Verify `AWS_ACCESS_KEY_ID` secret is correct
- Check access key is still active in IAM
- Ensure no extra spaces in secret value

---

## Alternative: Use OIDC (More Secure)

Instead of long-lived access keys, you can use OpenID Connect:

See: [GitHub Actions OIDC with AWS](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)

This eliminates the need to store AWS credentials in GitHub.

