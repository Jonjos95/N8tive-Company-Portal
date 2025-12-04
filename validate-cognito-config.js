#!/usr/bin/env node
/**
 * Validation script for Cognito Configuration
 * Checks that all required values are set and properly formatted
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Cognito Configuration...\n');

// Read cognito-config.js
const configPath = path.join(__dirname, 'cognito-config.js');
if (!fs.existsSync(configPath)) {
    console.error('❌ cognito-config.js not found!');
    process.exit(1);
}

const configContent = fs.readFileSync(configPath, 'utf8');

// Extract configuration values using regex
const userPoolIdMatch = configContent.match(/userPoolId:\s*['"]([^'"]+)['"]/);
const clientIdMatch = configContent.match(/clientId:\s*['"]([^'"]+)['"]/);
const oauthDomainMatch = configContent.match(/oauthDomain:\s*['"]([^'"]+)['"]/);
const regionMatch = configContent.match(/region:\s*['"]([^'"]+)['"]/);

const userPoolId = userPoolIdMatch ? userPoolIdMatch[1] : null;
const clientId = clientIdMatch ? clientIdMatch[1] : null;
const oauthDomain = oauthDomainMatch ? oauthDomainMatch[1] : null;
const region = regionMatch ? regionMatch[1] : null;

let isValid = true;
const errors = [];
const warnings = [];

// Validate User Pool ID
if (!userPoolId || userPoolId === 'YOUR_USER_POOL_ID') {
    errors.push('❌ User Pool ID is missing or contains placeholder');
    isValid = false;
} else if (!/^[a-z0-9_-]+_[a-zA-Z0-9]+$/.test(userPoolId)) {
    warnings.push('⚠️  User Pool ID format may be incorrect (expected: region_XXXXXXXXX)');
} else {
    console.log('✅ User Pool ID:', userPoolId);
}

// Validate Client ID
if (!clientId || clientId === 'YOUR_APP_CLIENT_ID') {
    errors.push('❌ Client ID is missing or contains placeholder');
    isValid = false;
} else if (clientId.length < 10) {
    warnings.push('⚠️  Client ID seems too short');
} else {
    console.log('✅ Client ID:', clientId);
}

// Validate OAuth Domain
if (!oauthDomain || oauthDomain === 'YOUR_DOMAIN.auth.us-east-1.amazoncognito.com') {
    errors.push('❌ OAuth Domain is missing or contains placeholder');
    isValid = false;
} else if (!oauthDomain.includes('.auth.') || !oauthDomain.includes('.amazoncognito.com')) {
    errors.push('❌ OAuth Domain format is incorrect (expected: *.auth.*.amazoncognito.com)');
    isValid = false;
} else {
    console.log('✅ OAuth Domain:', oauthDomain);
}

// Validate Region
if (!region) {
    errors.push('❌ Region is missing');
    isValid = false;
} else {
    console.log('✅ Region:', region);
}

// Check if OAuth Domain matches region
if (oauthDomain && region) {
    const domainRegion = oauthDomain.match(/\.auth\.([^.]+)\.amazoncognito\.com/);
    if (domainRegion && domainRegion[1] !== region) {
        warnings.push(`⚠️  OAuth Domain region (${domainRegion[1]}) doesn't match config region (${region})`);
    }
}

// Check if file is referenced in login.html
const loginHtmlPath = path.join(__dirname, 'login.html');
if (fs.existsSync(loginHtmlPath)) {
    const loginHtml = fs.readFileSync(loginHtmlPath, 'utf8');
    if (loginHtml.includes('cognito-config.js')) {
        console.log('✅ cognito-config.js is referenced in login.html');
    } else {
        warnings.push('⚠️  cognito-config.js may not be loaded in login.html');
    }
} else {
    warnings.push('⚠️  login.html not found');
}

console.log('\n');

// Print warnings
if (warnings.length > 0) {
    warnings.forEach(w => console.log(w));
    console.log('');
}

// Print errors and exit
if (errors.length > 0) {
    errors.forEach(e => console.error(e));
    console.error('\n❌ Configuration validation failed!');
    process.exit(1);
}

if (isValid) {
    console.log('✅ All validations passed!');
    console.log('\n📋 Configuration Summary:');
    console.log(`   Region: ${region}`);
    console.log(`   User Pool: ${userPoolId}`);
    console.log(`   Client ID: ${clientId}`);
    console.log(`   OAuth Domain: ${oauthDomain}`);
    console.log('\n🚀 Configuration is ready for deployment!');
    process.exit(0);
}

