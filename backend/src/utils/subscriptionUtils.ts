import supabase from './supabaseClient';

interface UserSubscription {
  status: string;
  plan: string;
  protection_mode?: string;
  features?: any;
}

/**
 * Get user subscription and protection mode by wallet address
 */
export async function getUserSubscription(walletAddress: string): Promise<UserSubscription | null> {
  try {
    // Get user by wallet address
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError || !users) {
      console.log(`[SubscriptionUtils] No user found for wallet ${walletAddress}`);
      return null;
    }

    // Get active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('status, plan, protection_mode, features')
      .eq('user_id', users.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError || !subscription) {
      console.log(`[SubscriptionUtils] No active subscription for wallet ${walletAddress}`);
      return null;
    }

    return subscription;
  } catch (error) {
    console.error('[SubscriptionUtils] Error getting user subscription:', error);
    return null;
  }
}

/**
 * Check if user has full protection mode enabled
 */
export async function hasFullProtectionMode(walletAddress: string): Promise<boolean> {
  try {
    const subscription = await getUserSubscription(walletAddress);
    
    if (!subscription) {
      console.log(`[SubscriptionUtils] No subscription found for ${walletAddress} - defaulting to watch-only`);
      return false;
    }

    // Check for explicit protection_mode field
    if (subscription.protection_mode) {
      const isFullMode = subscription.protection_mode === 'full';
      console.log(`[SubscriptionUtils] ${walletAddress} protection mode: ${subscription.protection_mode} (full: ${isFullMode})`);
      return isFullMode;
    }

    // Fallback: Check plan type for legacy support
    const premiumPlans = ['pro', 'enterprise', 'degen-mode'];
    const hasFullAccess = premiumPlans.includes(subscription.plan.toLowerCase());
    
    console.log(`[SubscriptionUtils] ${walletAddress} plan: ${subscription.plan} (full access: ${hasFullAccess})`);
    return hasFullAccess;
  } catch (error) {
    console.error('[SubscriptionUtils] Error checking protection mode:', error);
    return false; // Default to watch-only on error
  }
}

/**
 * Check if user can execute automatic swaps (has full protection)
 */
export async function canExecuteSwaps(walletAddress: string): Promise<boolean> {
  return await hasFullProtectionMode(walletAddress);
}

/**
 * Check if user can receive alerts and scans (all users can)
 */
export async function canReceiveAlerts(walletAddress: string): Promise<boolean> {
  // All users can receive alerts and scans, regardless of protection mode
  return true;
}

/**
 * Get protection capabilities for a user
 */
export async function getProtectionCapabilities(walletAddress: string): Promise<{
  canExecuteSwaps: boolean;
  canReceiveAlerts: boolean;
  protectionMode: 'full' | 'watch-only';
  plan: string;
}> {
  const subscription = await getUserSubscription(walletAddress);
  const hasFullMode = await hasFullProtectionMode(walletAddress);

  return {
    canExecuteSwaps: hasFullMode,
    canReceiveAlerts: true,
    protectionMode: hasFullMode ? 'full' : 'watch-only',
    plan: subscription?.plan || 'free'
  };
}
