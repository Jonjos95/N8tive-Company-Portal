// Script to create a dev account for testing
// Run this in the browser console or as a Node.js script

async function createDevAccount(email, name = 'Dev Account') {
    try {
        const response = await fetch('/api/admin/create-dev-account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                name: name
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Dev account created successfully!');
            console.log('Account details:', result);
            return result;
        } else {
            console.error('❌ Failed to create dev account:', result.error);
            return result;
        }
    } catch (error) {
        console.error('❌ Error creating dev account:', error);
        throw error;
    }
}

async function toggleSubscriptionTier(email, tier) {
    // tier options: 'free', 'pro', 'business', 'enterprise'
    try {
        const response = await fetch('/api/admin/toggle-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                tier: tier
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ Subscription tier updated to: ${tier}`);
            return result;
        } else {
            console.error('❌ Failed to update tier:', result.error);
            return result;
        }
    } catch (error) {
        console.error('❌ Error updating tier:', error);
        throw error;
    }
}

async function getUserInfo(email) {
    try {
        const response = await fetch(`/api/admin/user-info?email=${encodeURIComponent(email)}`);
        const result = await response.json();
        
        if (result.success) {
            console.log('User info:', result.user);
            return result.user;
        } else {
            console.error('❌ Failed to get user info:', result.error);
            return null;
        }
    } catch (error) {
        console.error('❌ Error getting user info:', error);
        throw error;
    }
}

// Example usage:
// createDevAccount('your-email@example.com', 'Your Name')
// toggleSubscriptionTier('your-email@example.com', 'enterprise')
// getUserInfo('your-email@example.com')

// Make functions available globally
if (typeof window !== 'undefined') {
    window.createDevAccount = createDevAccount;
    window.toggleSubscriptionTier = toggleSubscriptionTier;
    window.getUserInfo = getUserInfo;
    console.log('Dev account functions loaded!');
    console.log('Usage:');
    console.log('  createDevAccount("your-email@example.com", "Your Name")');
    console.log('  toggleSubscriptionTier("your-email@example.com", "enterprise")');
    console.log('  getUserInfo("your-email@example.com")');
}

