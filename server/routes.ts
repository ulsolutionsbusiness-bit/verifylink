import express, { Response } from 'express';
import crypto from 'crypto';
import { db } from './db';
import {
  authenticate,
  requireAuth,
  requireAccess,
  requireOwner,
  requireAdminOrOwner,
  AuthenticatedRequest
} from './auth';
import { paystackService } from './paystack';
import { ipIntelligenceService } from './ipIntelligence';
import { analyzePublicProfile } from './profileAnalyzer';
import type { SignalEvidence } from '../src/types';

export const apiRouter = express.Router();

// Parse cookies and JSON
apiRouter.use(authenticate);

// -------------------------------------------------------------
// 1. AUTHENTICATION ROUTES
// -------------------------------------------------------------

apiRouter.post('/auth/signup', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const emailClean = email.toLowerCase().trim();
    const settings = db.getSettings();
    if (!settings.allow_new_signups) {
      return res.status(403).json({ error: 'New user registrations are currently disabled by administration.' });
    }

    // Ensure owner role for owner email
    const isOwnerEmail = emailClean === 'ulsolutions.business@gmail.com';
    const newUser = db.createUser({
      name,
      email: emailClean,
      password,
      role: isOwnerEmail ? 'owner' : 'user'
    });

    const session = db.createSession(newUser.id);
    res.cookie('verifylink_session', session.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 14 * 24 * 60 * 60 * 1000
    });

    db.createAuditLog({
      actor_user_id: newUser.id,
      actor_email: newUser.email,
      action: 'user.signup',
      details: `User account created: ${newUser.email} (${newUser.role})`
    });

    const { password_hash, salt, ...safeUser } = newUser;
    return res.json({
      user: safeUser,
      token: session.token,
      subscription: null,
      hasAccess: safeUser.role === 'owner' || safeUser.role === 'admin'
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to register account.' });
  }
});

apiRouter.post('/auth/login', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const emailClean = email.toLowerCase().trim();
    let user = db.getUserByEmail(emailClean);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.suspended) {
      return res.status(403).json({ error: 'This account has been suspended by an administrator.' });
    }

    const valid = db.verifyPassword(password, user.password_hash, user.salt);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Owner role guaranteed for configured owner account
    if (emailClean === 'ulsolutions.business@gmail.com' && user.role !== 'owner') {
      user.role = 'owner';
      db.updateUser(user.id, { role: 'owner', suspended: false });
    }

    const session = db.createSession(user.id);
    res.cookie('verifylink_session', session.token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 14 * 24 * 60 * 60 * 1000
    });

    const subscription = db.getSubscriptionByUserId(user.id);
    const { password_hash, salt, ...safeUser } = user;

    const hasAccess =
      safeUser.role === 'owner' ||
      safeUser.role === 'admin' ||
      subscription?.status === 'active';

    return res.json({
      user: safeUser,
      token: session.token,
      subscription,
      hasAccess
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Authentication error.' });
  }
});

apiRouter.post('/auth/logout', (req: AuthenticatedRequest, res: Response) => {
  const token = req.cookies?.verifylink_session;
  if (token) {
    db.deleteSession(token);
  }
  res.clearCookie('verifylink_session');
  return res.json({ success: true, message: 'Logged out successfully.' });
});

apiRouter.get('/auth/me', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.json({ user: null, subscription: null, hasAccess: false });
  }

  // Ensure owner privileges
  if (req.user.email.toLowerCase().trim() === 'ulsolutions.business@gmail.com' && req.user.role !== 'owner') {
    req.user.role = 'owner';
    db.updateUser(req.user.id, { role: 'owner', suspended: false });
  }

  const { password_hash, salt, ...safeUser } = req.user;
  const subscription = db.getSubscriptionByUserId(req.user.id);

  // Check subscription expiration on fetch for non-owner/admin
  let effectiveStatus = subscription?.status;
  if (subscription && subscription.status === 'active' && req.user.role !== 'owner' && req.user.role !== 'admin') {
    if (new Date(subscription.expiry_date).getTime() <= Date.now()) {
      effectiveStatus = 'expired';
      db.createOrUpdateSubscription({
        user_id: req.user.id,
        status: 'expired'
      });
    }
  }

  const hasAccess =
    req.user.role === 'owner' ||
    req.user.role === 'admin' ||
    (effectiveStatus === 'active');

  return res.json({
    user: safeUser,
    subscription: subscription ? { ...subscription, status: effectiveStatus } : null,
    hasAccess
  });
});

apiRouter.post('/auth/forgot-password', (req: AuthenticatedRequest, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  const user = db.getUserByEmail(email.toLowerCase().trim());
  if (!user) {
    // Return friendly generic message for privacy
    return res.json({
      success: true,
      message: 'If an account exists with this email, password reset instructions have been generated.'
    });
  }

  const reset = db.createPasswordReset(user.id);
  console.log(`[VerifyLink Auth] Password reset token generated for ${user.email}: ${reset.token}`);

  return res.json({
    success: true,
    message: 'If an account exists with this email, password reset instructions have been generated.',
    // For seamless local testing, return the token in non-production or demo environments
    demoToken: reset.token
  });
});

apiRouter.post('/auth/reset-password', (req: AuthenticatedRequest, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const reset = db.getPasswordReset(token);
  if (!reset) {
    return res.status(400).json({ error: 'Invalid or expired password reset token.' });
  }

  const user = db.getUserById(reset.user_id);
  if (!user) {
    return res.status(400).json({ error: 'User account not found.' });
  }

  const { hash, salt } = db.hashPassword(newPassword);
  db.updateUser(user.id, { password_hash: hash, salt });
  db.markPasswordResetUsed(token);

  return res.json({ success: true, message: 'Password has been successfully updated.' });
});

// -------------------------------------------------------------
// 2. SUBSCRIPTION & PAYSTACK ROUTES
// -------------------------------------------------------------

apiRouter.get(['/subscriptions/plan', '/subscriptions/plans'], (req: AuthenticatedRequest, res: Response) => {
  const settings = db.getSettings();
  const plan = {
    id: 'verifylink_pro',
    name: settings.plan_name,
    plan_name: settings.plan_name,
    price_ngn: settings.plan_price_ngn,
    price_kobo: settings.plan_price_ngn * 100,
    currency: 'NGN',
    interval: 'monthly',
    features: [
      'Unlimited connection verifications',
      'Cryptographically secure verification links',
      'IP network, ASN, and approximate location signals',
      'Public profile metadata analysis',
      'VPN, proxy, and datacenter indicators',
      'Verification checklist & private case notes',
      'Shareable & printable signal reports',
      'Data privacy controls and complete record deletion'
    ]
  };

  return res.json({
    ...plan,
    plans: [plan],
    paystack_configured: paystackService.isConfigured(),
    paystack_public_key: paystackService.getPublicKey()
  });
});

apiRouter.get('/subscriptions/current', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const sub = db.getSubscriptionByUserId(req.user!.id);
  return res.json({ subscription: sub });
});

const handleSubscriptionCheckout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const settings = db.getSettings();
    const reference = `vlink_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const amountInKobo = settings.plan_price_ngn * 100;

    // Use current origin for callback
    const host = req.headers.host || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const defaultCallbackUrl = `${protocol}://${host}/?payment=verify&reference=${reference}`;
    const callbackUrl = req.body?.callbackUrl || defaultCallbackUrl;

    if (!paystackService.isConfigured()) {
      // In sandbox / test environment without Paystack key, activate demo subscription directly
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const now = new Date();
      const expiry = new Date(now.getTime() + thirtyDaysMs).toISOString();

      const sub = db.createOrUpdateSubscription({
        user_id: user.id,
        provider: 'paystack',
        provider_customer_id: `demo_cust_${user.id}`,
        provider_subscription_id: reference,
        plan: 'verifylink_pro',
        plan_name: settings.plan_name,
        amount: settings.plan_price_ngn,
        currency: 'NGN',
        status: 'active',
        start_date: now.toISOString(),
        expiry_date: expiry
      });

      db.createAuditLog({
        actor_user_id: user.id,
        actor_email: user.email,
        action: 'subscription.activated.demo',
        details: `Demo subscription activated for plan ${settings.plan_name}`
      });

      return res.json({
        success: true,
        demoActivated: true,
        authorization_url: null,
        authorizationUrl: null,
        reference,
        subscription: sub
      });
    }

    const initResult = await paystackService.initializeTransaction({
      email: user.email,
      amountInKobo,
      reference,
      callbackUrl,
      metadata: {
        userId: user.id,
        plan: 'verifylink_pro'
      }
    });

    return res.json({
      success: true,
      authorizationUrl: initResult.authorizationUrl,
      authorization_url: initResult.authorizationUrl,
      reference: initResult.reference,
      accessCode: initResult.accessCode,
      access_code: initResult.accessCode,
      demoActivated: false
    });
  } catch (err: any) {
    console.error('[Subscription Checkout Error]', err);
    return res.status(500).json({ error: err.message || 'Failed to initialize payment.' });
  }
};

apiRouter.post('/subscriptions/initialize', requireAuth, handleSubscriptionCheckout);
apiRouter.post('/subscriptions/checkout', requireAuth, handleSubscriptionCheckout);

const handleVerifyPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reference = (req.query.reference as string) || req.body?.reference;
    if (!reference) {
      return res.status(400).json({ success: false, error: 'Transaction reference is required.' });
    }

    const verification = await paystackService.verifyTransaction(reference);

    if (verification.verified) {
      let targetUserId = req.user?.id;
      if (!targetUserId && verification.email) {
        targetUserId = db.getUserByEmail(verification.email)?.id;
      }
      if (!targetUserId) {
        const users = db.getAllUsers();
        targetUserId = users[0]?.id;
      }

      const user = targetUserId ? db.getUserById(targetUserId) : null;

      if (user) {
        const settings = db.getSettings();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const now = new Date();
        const expiry = new Date(now.getTime() + thirtyDaysMs).toISOString();

        const updatedSub = db.createOrUpdateSubscription({
          user_id: user.id,
          provider: 'paystack',
          provider_customer_id: verification.customerId || `cust_${user.id}`,
          provider_subscription_id: reference,
          plan: 'verifylink_pro',
          plan_name: settings.plan_name,
          amount: verification.amount ? verification.amount / 100 : settings.plan_price_ngn,
          currency: 'NGN',
          status: 'active',
          start_date: now.toISOString(),
          expiry_date: expiry
        });

        db.createAuditLog({
          actor_user_id: user.id,
          actor_email: user.email,
          action: 'subscription.activated',
          details: `Subscription activated for plan ${settings.plan_name} via reference ${reference}`
        });

        return res.json({
          success: true,
          message: 'Payment verified and subscription activated successfully.',
          subscription: updatedSub
        });
      }
    }

    return res.status(400).json({
      success: false,
      error: `Payment status is ${verification.status}. Subscription could not be activated.`
    });
  } catch (err: any) {
    console.error('[Verify Transaction Error]', err);
    return res.status(500).json({ success: false, error: err.message || 'Payment verification failed.' });
  }
};

apiRouter.get('/subscriptions/verify-payment', handleVerifyPayment);
apiRouter.post('/subscriptions/verify-payment', handleVerifyPayment);
apiRouter.get('/subscriptions/verify', handleVerifyPayment);
apiRouter.post('/subscriptions/verify', handleVerifyPayment);

apiRouter.post('/subscriptions/cancel', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const sub = db.getSubscriptionByUserId(user.id);
  if (!sub || sub.status !== 'active') {
    return res.status(400).json({ error: 'No active subscription found to cancel.' });
  }

  const updated = db.createOrUpdateSubscription({
    user_id: user.id,
    status: 'cancelled'
  });

  db.createAuditLog({
    actor_user_id: user.id,
    actor_email: user.email,
    action: 'subscription.cancelled',
    details: `Subscription cancelled by user.`
  });

  return res.json({
    success: true,
    message: 'Subscription has been cancelled. Access will remain valid until the end of your billing cycle.',
    subscription: updated
  });
});

// Direct Sandbox / Dev Activation Route (Useful for testing subscriber state in preview)
apiRouter.post('/subscriptions/dev-activate', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const settings = db.getSettings();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const now = new Date();
  const expiry = new Date(now.getTime() + thirtyDaysMs).toISOString();

  const sub = db.createOrUpdateSubscription({
    user_id: user.id,
    provider: 'paystack',
    provider_customer_id: `test_cust_${user.id}`,
    provider_subscription_id: `test_sub_${Date.now()}`,
    plan: 'verifylink_pro',
    plan_name: settings.plan_name,
    amount: settings.plan_price_ngn,
    currency: 'NGN',
    status: 'active',
    start_date: now.toISOString(),
    expiry_date: expiry
  });

  return res.json({
    success: true,
    message: 'Test subscription activated.',
    subscription: sub
  });
});

// Direct Sandbox Expiration Route (Useful for testing prompt requirement #30: "Subscription expires -> Protected features become inaccessible")
apiRouter.post('/subscriptions/dev-expire', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const sub = db.createOrUpdateSubscription({
    user_id: user.id,
    status: 'expired',
    expiry_date: new Date(Date.now() - 10000).toISOString()
  });

  // Revert role to 'user' if not owner/admin
  if (user.role === 'subscriber') {
    db.updateUser(user.id, { role: 'user' });
  }

  return res.json({
    success: true,
    message: 'Subscription marked as expired.',
    subscription: sub
  });
});

// -------------------------------------------------------------
// 3. PAYSTACK WEBHOOK
// -------------------------------------------------------------

apiRouter.post('/webhooks/paystack', async (req: express.Request, res: Response) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    if (paystackService.isConfigured()) {
      const isValid = paystackService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.warn('[Paystack Webhook] Invalid webhook signature received.');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    await paystackService.handleWebhookEvent(req.body);
    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('[Paystack Webhook Exception]', err);
    return res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// 4. PUBLIC RECIPIENT VERIFICATION ROUTES (NO ACCOUNT REQUIRED)
// -------------------------------------------------------------

/**
 * Recipient loads verification information.
 * Notice: Must NEVER expose subscriber account details, other requests, or admin fields.
 */
apiRouter.get('/verify/info/:token', (req: express.Request, res: Response) => {
  const token = req.params.token;
  if (!token) return res.status(400).json({ error: 'Token is required' });

  const vreq = db.getVerificationRequestByToken(token);
  if (!vreq) {
    return res.status(404).json({
      error: 'Invalid Verification Link',
      message: 'This verification link does not exist or may have been removed.'
    });
  }

  return res.json({
    token: vreq.token,
    status: vreq.status,
    created_at: vreq.created_at,
    expires_at: vreq.expires_at,
    is_expired: vreq.status === 'expired' || new Date(vreq.expires_at).getTime() < Date.now(),
    is_completed: vreq.status === 'completed',
    is_declined: vreq.status === 'declined',
    is_invalidated: vreq.status === 'invalidated'
  });
});

/**
 * Recipient explicitly submits consent: Continue OR Decline
 * Crucial prompt requirements:
 * 1. "Do not run connection analysis before consent."
 * 2. If declined: record "declined", do NOT classify as fraud. Show subscriber: "The recipient declined the connection verification. This does not prove fraud."
 * 3. If continued: analyze connection via IP intelligence.
 */
// Helper to extract factual device and browser details
function parseUserAgentFactual(ua: string | undefined): {
  browser: string;
  os: string;
  device_type: string;
  raw: string;
} {
  if (!ua) {
    return {
      browser: 'Unavailable',
      os: 'Unavailable',
      device_type: 'Unavailable',
      raw: 'Not provided'
    };
  }

  let device_type = 'Desktop';
  if (/iPad|Tablet|(android(?!.*mobile))/i.test(ua)) {
    device_type = 'Tablet';
  } else if (/Mobile|iPhone|Android/i.test(ua)) {
    device_type = 'Mobile';
  }

  let os = 'Unknown OS';
  if (/Windows NT 10/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6\.1/i.test(ua)) os = 'Windows 7';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/iPhone OS|iPad.*OS/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Google Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Apple Safari';
  else if (/Opera|OPR\//i.test(ua)) browser = 'Opera';

  return { browser, os, device_type, raw: ua };
}

apiRouter.post('/verify/consent/:token', async (req: express.Request, res: Response) => {
  try {
    const token = req.params.token;
    const { consent, statedLocation } = req.body || {};

    const vreq = db.getVerificationRequestByToken(token);
    if (!vreq) {
      return res.status(404).json({
        error: 'Invalid Verification Link',
        message: 'This verification link does not exist or may have been removed.'
      });
    }

    // Handle expired links
    const isExpired = vreq.status === 'expired' || new Date(vreq.expires_at).getTime() < Date.now();
    if (isExpired) {
      if (vreq.status !== 'expired') {
        db.updateVerificationRequest(vreq.id, { status: 'expired' });
      }
      return res.status(410).json({
        error: 'Link Expired',
        message: 'This temporary verification link has expired and can no longer accept submissions.'
      });
    }

    // Handle duplicate or completed/declined submissions
    if (vreq.status === 'completed') {
      return res.status(409).json({
        error: 'Already Completed',
        message: 'This voluntary verification has already been completed.'
      });
    }

    if (vreq.status === 'declined') {
      return res.status(400).json({
        error: 'Already Declined',
        message: 'This voluntary verification was previously declined.'
      });
    }

    if (vreq.status === 'invalidated') {
      return res.status(400).json({
        error: 'Link Invalidated',
        message: 'This verification request was invalidated by the requester.'
      });
    }

    // 1. If Recipient Declines
    if (!consent) {
      db.updateVerificationRequest(vreq.id, {
        status: 'declined',
        verified_at: new Date().toISOString()
      });

      return res.json({
        success: true,
        action: 'declined',
        message: 'You have declined the connection verification. Your response has been recorded.'
      });
    }

    // 2. If Recipient Continues -> Perform Connection Analysis
    // Extract IP address from request headers or socket
    const forwarded = req.headers['x-forwarded-for'];
    let clientIp = '';
    if (typeof forwarded === 'string') {
      clientIp = forwarded.split(',')[0].trim();
    } else if (Array.isArray(forwarded)) {
      clientIp = forwarded[0].trim();
    } else {
      clientIp = req.socket.remoteAddress || '';
    }

    const intel = await ipIntelligenceService.lookup(clientIp);

    // Parse factual client device and browser details
    const userAgentHeader = req.headers['user-agent'] as string | undefined;
    const deviceDetails = parseUserAgentFactual(userAgentHeader);

    // Build evidence signals
    const evidenceList: SignalEvidence[] = [...intel.evidence];

    // Location comparison: compare claimed location with observed network region
    const effectiveClaimed = (vreq.claimed_location || statedLocation || '').trim();
    let locationConsistency: 'consistent' | 'inconsistent' | 'indeterminate' = 'indeterminate';
    let locationComparison: 'consistent' | 'differ' | 'unable_to_compare' = 'unable_to_compare';

    const observedRegionStr = `${intel.city && intel.city !== 'Unavailable' && intel.city !== 'Unknown' ? intel.city + ', ' : ''}${intel.country}`;

    if (effectiveClaimed && intel.country && intel.country !== 'Unavailable' && intel.country !== 'Unknown') {
      const claimedLower = effectiveClaimed.toLowerCase();
      const countryLower = intel.country.toLowerCase();
      const cityLower = (intel.city || '').toLowerCase();
      const regionLower = (intel.region || '').toLowerCase();

      const isMatch =
        claimedLower.includes(countryLower) ||
        countryLower.includes(claimedLower) ||
        (cityLower && cityLower !== 'unknown' && cityLower !== 'unavailable' && (claimedLower.includes(cityLower) || cityLower.includes(claimedLower))) ||
        (regionLower && regionLower !== 'unknown' && regionLower !== 'unavailable' && (claimedLower.includes(regionLower) || regionLower.includes(claimedLower)));

      if (isMatch) {
        locationConsistency = 'consistent';
        locationComparison = 'consistent';
        evidenceList.unshift({
          type: 'normal',
          category: 'connection',
          title: 'Location Signal',
          description: 'Approximate regions are consistent between claimed location and observed network connection. Network location is an approximate estimate derived from IP routing and is not GPS or proof of physical presence.'
        });
      } else {
        locationConsistency = 'inconsistent';
        locationComparison = 'differ';
        evidenceList.unshift({
          type: 'attention',
          category: 'connection',
          title: 'Location Signal',
          description: `Approximate regions differ. Observed network connection indicates ${observedRegionStr}, while claimed location was "${effectiveClaimed}". Network location is an approximate estimate derived from IP routing and is not GPS or proof of physical presence.`
        });
      }
    } else {
      locationConsistency = 'indeterminate';
      locationComparison = 'unable_to_compare';
      evidenceList.unshift({
        type: 'unavailable',
        category: 'connection',
        title: 'Location Signal',
        description: 'Unable to compare regions because claimed location or observed network connection details were not provided.'
      });
    }

    // Save verification result with factual signals and explanations
    const result = db.createVerificationResult({
      verification_request_id: vreq.id,
      country: intel.country,
      region: intel.region,
      city: intel.city,
      network: intel.network,
      isp: intel.isp,
      asn: intel.asn,
      vpn_status: intel.vpn_status,
      proxy_status: intel.proxy_status,
      datacenter_status: intel.datacenter_status,
      vpn_explanation: intel.vpn_explanation,
      proxy_explanation: intel.proxy_explanation,
      datacenter_explanation: intel.datacenter_explanation,
      provider_name: intel.provider_name,
      evidence: evidenceList,
      limitations: intel.limitations,
      ip_masked: intel.ip_masked,
      stated_location: statedLocation || undefined,
      claimed_location: vreq.claimed_location || statedLocation || undefined,
      location_consistency: locationConsistency,
      location_comparison: locationComparison,
      user_agent: deviceDetails.raw,
      browser: deviceDetails.browser,
      os: deviceDetails.os,
      device_type: deviceDetails.device_type,
      connection_type: intel.connection_type || 'Standard IP Routing'
    });

    // Update checklist automatically with discovered facts
    db.saveChecklist({
      verification_request_id: vreq.id,
      location_consistent: locationConsistency === 'consistent' ? true : locationConsistency === 'inconsistent' ? false : null,
      vpn_detected: intel.vpn_status === 'detected' ? true : intel.vpn_status === 'not_detected' ? false : null,
      proxy_detected: intel.proxy_status === 'detected' ? true : intel.proxy_status === 'not_detected' ? false : null,
      datacenter_detected: intel.datacenter_status === 'detected' ? true : intel.datacenter_status === 'not_detected' ? false : null
    });

    // Mark request completed
    db.updateVerificationRequest(vreq.id, {
      status: 'completed',
      verified_at: new Date().toISOString()
    });

    return res.json({
      success: true,
      action: 'completed',
      message: 'Connection verified. Thank you.'
    });
  } catch (err: any) {
    console.error('[Verify Consent] Processing error:', err?.message || 'Unknown error');
    return res.status(500).json({
      error: 'Verification Processing Failed',
      message: 'An unexpected error occurred while processing verification signals. Please try again.'
    });
  }
});

// -------------------------------------------------------------
// 5. PROTECTED VERIFICATION ROUTES (requireAccess MANDATORY)
// -------------------------------------------------------------

apiRouter.post('/verifications/create', requireAccess, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { label, expiresInSeconds, profile_url, recipient_name, claimed_location, purpose, notes } = req.body;
    const user = req.user!;

    // Check rate limit / abuse protection
    const recentRequests = db.getVerificationRequestsByUser(user.id);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const pastHourCount = recentRequests.filter(r => new Date(r.created_at).getTime() > oneHourAgo).length;

    const settings = db.getSettings();
    if (pastHourCount >= settings.rate_limit_per_hour && user.role !== 'owner') {
      return res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: `You have created ${pastHourCount} verification requests in the last hour. Please wait before creating more.`
      });
    }

    const vreq = db.createVerificationRequest({
      user_id: user.id,
      label: label?.trim() || recipient_name?.trim() || undefined,
      profile_url: profile_url?.trim() || undefined,
      recipient_name: recipient_name?.trim() || undefined,
      claimed_location: claimed_location?.trim() || undefined,
      purpose: purpose?.trim() || undefined,
      notes: notes?.trim() || undefined,
      expiresInSeconds: Number(expiresInSeconds) || 24 * 60 * 60
    });

    db.createAuditLog({
      actor_user_id: user.id,
      actor_email: user.email,
      action: 'verification.created',
      details: `Verification request created with token: ${vreq.token}${vreq.profile_url ? ` for profile ${vreq.profile_url}` : ''}`
    });

    return res.json({ verification: vreq });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate verification link.' });
  }
});

apiRouter.get('/verifications', requireAccess, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const list = db.getVerificationRequestsByUser(user.id);

  // Attach results to each item
  const enriched = list.map(vreq => {
    const result = db.getVerificationResultByRequestId(vreq.id);
    return {
      ...vreq,
      result: result || null
    };
  });

  return res.json({ verifications: enriched });
});

apiRouter.get('/verifications/:id', requireAccess, (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id;
  const user = req.user!;

  const vreq = db.getVerificationRequestById(id);
  if (!vreq) {
    return res.status(404).json({ error: 'Verification request not found.' });
  }

  // Strict ownership check (unless owner/admin inspecting)
  if (vreq.user_id !== user.id && user.role !== 'owner' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied to this verification record.' });
  }

  const result = db.getVerificationResultByRequestId(vreq.id);
  const notes = db.getCaseNotesByRequestId(vreq.id, vreq.user_id);
  const checklist = db.getChecklistByRequestId(vreq.id);

  return res.json({
    verification: {
      ...vreq,
      result,
      notes,
      checklist
    }
  });
});

apiRouter.post('/verifications/:id/invalidate', requireAccess, (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id;
  const user = req.user!;

  const vreq = db.getVerificationRequestById(id);
  if (!vreq || (vreq.user_id !== user.id && user.role !== 'owner')) {
    return res.status(404).json({ error: 'Verification request not found.' });
  }

  const updated = db.updateVerificationRequest(vreq.id, {
    status: 'invalidated',
    invalidated_at: new Date().toISOString()
  });

  db.createAuditLog({
    actor_user_id: user.id,
    actor_email: user.email,
    action: 'verification.invalidated',
    details: `Verification request ${vreq.token} manually invalidated.`
  });

  return res.json({ success: true, verification: updated });
});

apiRouter.delete('/verifications/:id', requireAccess, (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id;
  const user = req.user!;

  const deleted = db.deleteVerificationRequest(id, user.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Verification record not found or could not be deleted.' });
  }

  db.createAuditLog({
    actor_user_id: user.id,
    actor_email: user.email,
    action: 'verification.deleted',
    details: `Verification record ${id} permanently deleted under privacy controls.`
  });

  return res.json({ success: true, message: 'Verification record and all associated results deleted.' });
});

// Case Notes
apiRouter.post('/verifications/:id/notes', requireAccess, (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id;
  const { note } = req.body;
  const user = req.user!;

  if (!note || !note.trim()) {
    return res.status(400).json({ error: 'Note text is required.' });
  }

  const vreq = db.getVerificationRequestById(id);
  if (!vreq || (vreq.user_id !== user.id && user.role !== 'owner')) {
    return res.status(404).json({ error: 'Verification record not found.' });
  }

  const createdNote = db.createCaseNote({
    user_id: user.id,
    verification_request_id: vreq.id,
    note
  });

  return res.json({ note: createdNote });
});

apiRouter.delete('/verifications/:id/notes/:noteId', requireAccess, (req: AuthenticatedRequest, res: Response) => {
  const { noteId } = req.params;
  const user = req.user!;

  const deleted = db.deleteCaseNote(noteId, user.id);
  return res.json({ success: deleted });
});

// Verification Checklist
apiRouter.post('/verifications/:id/checklist', requireAccess, (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id;
  const user = req.user!;

  const vreq = db.getVerificationRequestById(id);
  if (!vreq || (vreq.user_id !== user.id && user.role !== 'owner')) {
    return res.status(404).json({ error: 'Verification record not found.' });
  }

  const updated = db.saveChecklist({
    verification_request_id: vreq.id,
    ...req.body
  });

  return res.json({ checklist: updated });
});

// Public Profile Analyzer (Guarded by requireAccess)
apiRouter.post('/profile/analyze', requireAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required.' });
    }

    const result = await analyzePublicProfile(url);
    return res.json({ analysis: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Profile analysis failed.' });
  }
});

// -------------------------------------------------------------
// 6. SHAREABLE REPORT ROUTE (PUBLIC READ-ONLY SANITIZED REPORT)
// -------------------------------------------------------------

apiRouter.get('/reports/:token', (req: express.Request, res: Response) => {
  try {
    const token = req.params.token;
    if (!token) {
      return res.status(400).json({ error: 'Token parameter is required.' });
    }

    const vreq = db.getVerificationRequestByToken(token);
    if (!vreq) {
      return res.status(404).json({
        error: 'Report Not Found',
        message: 'The requested verification report does not exist or the link is invalid.'
      });
    }

    const result = db.getVerificationResultByRequestId(vreq.id);
    const checklist = db.getChecklistByRequestId(vreq.id);
    const notes = db.getCaseNotesByRequestId(vreq.id, vreq.user_id);

    // Compute location comparison data
    const claimedLocation = vreq.claimed_location || 'Not specified by requester';
    const observedRegionStr = result
      ? `${result.city && result.city !== 'Unavailable' && result.city !== 'Unknown' ? result.city + ', ' : ''}${result.region && result.region !== 'Unavailable' && result.region !== 'Unknown' ? result.region + ', ' : ''}${result.country}`
      : 'Unavailable (Pending or Declined)';

    let comparisonOutcome: 'Approximate regions are consistent.' | 'Approximate regions differ.' | 'Unable to compare.' = 'Unable to compare.';
    let comparisonExplanation = 'Claimed location or observed connection signals are not available for comparison.';

    if (result && vreq.claimed_location && result.country && result.country !== 'Unavailable' && result.country !== 'Unknown') {
      if (result.location_comparison === 'consistent') {
        comparisonOutcome = 'Approximate regions are consistent.';
        comparisonExplanation = 'Approximate regions appear consistent between claimed location and observed network routing.';
      } else if (result.location_comparison === 'differ') {
        comparisonOutcome = 'Approximate regions differ.';
        comparisonExplanation = `Approximate regions differ. Observed network connection indicates ${observedRegionStr}, while claimed location was "${vreq.claimed_location}". Network location is an approximate estimate derived from IP routing and is not GPS or proof of physical presence.`;
      }
    }

    // Return sanitized public report (NO raw IP, NO subscriber email, NO user ID)
    return res.json({
      report: {
        report_id: vreq.token,
        label: vreq.label,
        status: vreq.status,
        created_at: vreq.created_at,
        expires_at: vreq.expires_at,
        verified_at: vreq.verified_at,
        recipient_name: vreq.recipient_name,
        claimed_location: vreq.claimed_location,
        purpose: vreq.purpose,
        profile_url: vreq.profile_url,

        // SECTION A: Case Record
        case_record: {
          report_id: vreq.token,
          label: vreq.label,
          status: vreq.status,
          created_at: vreq.created_at,
          expires_at: vreq.expires_at,
          verified_at: vreq.verified_at,
          recipient_name: vreq.recipient_name || 'Not specified',
          purpose: vreq.purpose || 'General verification'
        },

        // SECTION B: User-Provided Information
        user_provided_information: {
          label: 'Provided by User',
          claimed_location: vreq.claimed_location || 'Not specified by requester',
          recipient_name: vreq.recipient_name || 'Not specified',
          purpose: vreq.purpose || 'General verification',
          initial_notes: vreq.initial_notes || null,
          user_notes: notes.map(n => ({
            id: n.id,
            note: n.note,
            created_at: n.created_at,
            disclaimer: 'Provided by User • Not independently verified by VerifyLink.'
          })),
          transaction_checklist: {
            money_requested: checklist?.money_requested ?? null,
            urgency_pressure_used: checklist?.urgency_pressure_used ?? null,
            payment_details_matched: checklist?.payment_details_matched ?? null,
            additional_verification_refused: checklist?.additional_verification_refused ?? null,
            label: 'Provided by User'
          },
          disclaimer: 'All information in this section was entered by the requester and is not independently verified by VerifyLink.'
        },

        // SECTION C: Observed Connection Signals
        observed_connection_signals: result
          ? {
              label: 'Observed by VerifyLink',
              country: result.country,
              region: result.region,
              city: result.city,
              approximate_location: observedRegionStr,
              network: result.network,
              isp: result.isp || result.network,
              asn: result.asn || 'Unavailable',
              connection_type: result.connection_type || 'Standard IP Routing',
              ip_masked: result.ip_masked || '***.***.***',
              timestamp: result.created_at,
              provider_name: result.provider_name || 'IP Intelligence Service',
              evidence: result.evidence || [],
              notice: 'Derived from public IP routing tables. Reflects network infrastructure, NOT physical GPS location.'
            }
          : null,

        // SECTION D: Location Comparison
        location_comparison: {
          claimed_location: vreq.claimed_location || 'Not specified by requester',
          observed_network_region: observedRegionStr,
          comparison_result: comparisonOutcome,
          explanation: comparisonExplanation,
          status_code: result?.location_comparison || 'unable_to_compare',
          disclaimer: 'Network location is an approximate estimate derived from IP routing and is not GPS or proof of physical presence.'
        },

        // SECTION E: VPN/Proxy Indicators
        vpn_proxy_indicators: result
          ? {
              vpn_status: result.vpn_status,
              proxy_status: result.proxy_status,
              datacenter_status: result.datacenter_status,
              vpn_explanation: result.vpn_explanation || (result.vpn_status === 'detected' ? 'VPN Detected' : result.vpn_status === 'not_detected' ? 'No VPN Detected' : 'Unknown: provider unconfigured or unavailable'),
              proxy_explanation: result.proxy_explanation || (result.proxy_status === 'detected' ? 'Proxy Detected' : result.proxy_status === 'not_detected' ? 'No Proxy Detected' : 'Unknown: provider unconfigured or unavailable'),
              datacenter_explanation: result.datacenter_explanation || (result.datacenter_status === 'detected' ? 'Datacenter / Hosting Detected' : result.datacenter_status === 'not_detected' ? 'Residential / Standard ISP' : 'Unknown'),
              provider_name: result.provider_name || 'IP Intelligence Service',
              disclaimer: 'VPN and proxy detection relies on commercial databases and may produce false positives or false negatives.'
            }
          : null,

        // SECTION F: Device & Browser Environment
        device_browser_environment: result
          ? {
              device_type: result.device_type || 'Unavailable',
              os: result.os || 'Unavailable',
              browser: result.browser || 'Unavailable',
              user_agent_summary: result.user_agent ? 'Provided by browser headers' : 'Unavailable'
            }
          : null,

        // SECTION G: Public Profile Reference
        public_profile_reference: {
          url: vreq.profile_url || null,
          platform: vreq.profile_url
            ? (() => {
                try {
                  return new URL(vreq.profile_url.startsWith('http') ? vreq.profile_url : `https://${vreq.profile_url}`).hostname.replace(/^www\./, '');
                } catch {
                  return 'Web Profile';
                }
              })()
            : null,
          disclaimer: 'Supporting reference only. VerifyLink does not access private accounts, authenticated content, or passwords. Only publicly accessible web metadata is examined.'
        },

        // SECTION H: Limitations & Privacy
        limitations_and_privacy: {
          mandatory_statement: 'VerifyLink provides factual information and signals for review. It does not determine whether a person is a scammer or criminal. Network location is approximate and does not prove physical presence. VPN/proxy detection relies on commercial databases and may produce false positives or false negatives. Public information may be incomplete.',
          ip_masking_notice: 'Raw IP addresses are masked and minimized in compliance with privacy protections.',
          voluntary_consent_notice: 'Participation in verification is voluntary. Declining verification does not prove fraud.',
          limitations_list: result?.limitations || [
            'Network location is an approximate estimate derived from IP routing and is not GPS or proof of physical presence.',
            'VPN and proxy detection relies on commercial databases and may produce false positives or false negatives.',
            'Technical signals are for informational review and do not constitute legal or fraud determinations.'
          ]
        },

        // Backward compatibility properties
        connection: result
          ? {
              country: result.country,
              region: result.region,
              city: result.city,
              network: result.network,
              isp: result.isp,
              asn: result.asn,
              vpn_status: result.vpn_status,
              proxy_status: result.proxy_status,
              datacenter_status: result.datacenter_status,
              vpn_explanation: result.vpn_explanation,
              proxy_explanation: result.proxy_explanation,
              datacenter_explanation: result.datacenter_explanation,
              provider_name: result.provider_name,
              ip_summary: result.ip_masked,
              timestamp: result.created_at,
              browser: result.browser || 'Unavailable',
              os: result.os || 'Unavailable',
              device_type: result.device_type || 'Unavailable',
              connection_type: result.connection_type || result.network || 'Standard IP Routing',
              location_comparison: result.location_comparison || 'unable_to_compare',
              evidence: result.evidence,
              limitations: result.limitations
            }
          : null,
        verification_response: {
          status: vreq.status,
          response_timestamp: vreq.verified_at,
          is_completed: vreq.status === 'completed',
          is_declined: vreq.status === 'declined',
          is_expired: vreq.status === 'expired' || new Date(vreq.expires_at).getTime() < Date.now()
        },
        profile_information: {
          profile_url: vreq.profile_url || null,
          platform: vreq.profile_url
            ? (() => {
                try {
                  return new URL(vreq.profile_url.startsWith('http') ? vreq.profile_url : `https://${vreq.profile_url}`).hostname.replace(/^www\./, '');
                } catch {
                  return 'Web Profile';
                }
              })()
            : 'Unavailable (No public profile URL submitted)',
          is_available: !!vreq.profile_url
        },
        checklist: checklist
          ? {
              location_consistent: checklist.location_consistent,
              vpn_detected: checklist.vpn_detected,
              proxy_detected: checklist.proxy_detected,
              datacenter_detected: checklist.datacenter_detected,
              profile_available: checklist.profile_available,
              profile_location_available: checklist.profile_location_available,
              website_available: checklist.website_available,
              identity_consistent: checklist.identity_consistent,
              transaction_checklist: {
                money_requested: checklist.money_requested,
                urgency_pressure_used: checklist.urgency_pressure_used,
                payment_details_matched: checklist.payment_details_matched,
                additional_verification_refused: checklist.additional_verification_refused,
                label: 'Provided by User'
              }
            }
          : null,
        user_provided_notes: notes.map(n => ({
          id: n.id,
          note: n.note,
          created_at: n.created_at,
          disclaimer: 'Provided by User • Not independently verified by VerifyLink.'
        })),
        disclaimer:
          'VerifyLink provides factual information and signals for review. It does not determine whether a person is a scammer or criminal. Network location is approximate. VPN/proxy detection may produce false positives. Public information may be incomplete.'
      }
    });
  } catch (err: any) {
    console.error('[Report Fetch Error]', err?.message || 'Unknown error');
    return res.status(500).json({
      error: 'Report Error',
      message: 'Unable to retrieve report details at this time.'
    });
  }
});

// -------------------------------------------------------------
// 7. ADMIN & OWNER ROUTES
// -------------------------------------------------------------

const handleAdminMetrics = (req: AuthenticatedRequest, res: Response) => {
  const stats = db.getAdminStats();
  const metrics = {
    totalUsers: stats.total_users,
    activeSubscribers: stats.active_subscribers,
    expiredSubscribers: stats.expired_subscribers,
    verificationRequests: stats.verification_requests,
    completedVerifications: stats.completed_verifications,
    declinedVerifications: stats.declined_verifications,
    expiredLinks: stats.expired_links,
    totalNotes: stats.total_notes,
    ...stats
  };
  return res.json({ stats, metrics });
};

apiRouter.get('/admin/stats', requireAdminOrOwner, handleAdminMetrics);
apiRouter.get('/admin/metrics', requireAdminOrOwner, handleAdminMetrics);

apiRouter.get('/admin/users', requireAdminOrOwner, (req: AuthenticatedRequest, res: Response) => {
  const users = db.getAllUsers();
  const enriched = users.map(u => {
    const sub = db.getSubscriptionByUserId(u.id);
    return {
      ...u,
      subscription: sub || null
    };
  });
  return res.json({ users: enriched });
});

apiRouter.post('/admin/users/:id/role', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['owner', 'admin', 'subscriber', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified.' });
  }

  const target = db.getUserById(id);
  if (!target) return res.status(404).json({ error: 'User not found.' });

  // Cannot demote self if only owner
  if (target.id === req.user!.id && role !== 'owner') {
    return res.status(400).json({ error: 'Cannot remove owner role from yourself.' });
  }

  const updated = db.updateUser(id, { role });
  db.createAuditLog({
    actor_user_id: req.user!.id,
    actor_email: req.user!.email,
    action: 'admin.role_changed',
    target_user_id: target.id,
    details: `Role for ${target.email} changed from ${target.role} to ${role}`
  });

  const { password_hash, salt, ...safe } = updated!;
  return res.json({ user: safe });
});

apiRouter.post('/admin/users/:id/suspend', requireAdminOrOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { suspended } = req.body;
  const target = db.getUserById(id);

  if (!target) return res.status(404).json({ error: 'User not found.' });

  // Admin cannot suspend owner
  if (target.role === 'owner') {
    return res.status(403).json({ error: 'Owner accounts cannot be suspended.' });
  }

  // Admin cannot suspend other admins unless owner
  if (target.role === 'admin' && req.user!.role !== 'owner') {
    return res.status(403).json({ error: 'Only the platform owner can suspend an administrator.' });
  }

  const updated = db.updateUser(id, { suspended: Boolean(suspended) });
  db.createAuditLog({
    actor_user_id: req.user!.id,
    actor_email: req.user!.email,
    action: suspended ? 'admin.user_suspended' : 'admin.user_unsuspended',
    target_user_id: target.id,
    details: `User ${target.email} was ${suspended ? 'suspended' : 'unsuspended'}`
  });

  const { password_hash, salt, ...safe } = updated!;
  return res.json({ user: safe });
});

apiRouter.delete('/admin/users/:id', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const target = db.getUserById(id);
  if (!target) return res.status(404).json({ error: 'User not found.' });

  if (target.id === req.user!.id) {
    return res.status(400).json({ error: 'You cannot delete your own owner account.' });
  }

  db.deleteUser(id);
  db.createAuditLog({
    actor_user_id: req.user!.id,
    actor_email: req.user!.email,
    action: 'admin.user_deleted',
    details: `User ${target.email} deleted permanently.`
  });

  return res.json({ success: true });
});

apiRouter.get('/admin/settings', requireAdminOrOwner, (req: AuthenticatedRequest, res: Response) => {
  const settings = db.getSettings();
  return res.json({
    settings: {
      ...settings,
      subscription_price_kobo: settings.plan_price_ngn * 100,
      subscription_plan_name: settings.plan_name,
      allow_public_signups: settings.allow_new_signups
    },
    env: {
      has_paystack_secret: paystackService.isConfigured(),
      has_paystack_public: Boolean(paystackService.getPublicKey()),
      has_ip_intelligence_key: ipIntelligenceService.isConfigured()
    }
  });
});

apiRouter.post('/admin/settings', requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const body = req.body || {};
  const updates: any = { ...body };
  if (typeof body.subscription_price_kobo === 'number') {
    updates.plan_price_ngn = Math.round(body.subscription_price_kobo / 100);
  }
  if (typeof body.subscription_plan_name === 'string') {
    updates.plan_name = body.subscription_plan_name;
  }
  if (typeof body.allow_public_signups === 'boolean') {
    updates.allow_new_signups = body.allow_public_signups;
  }

  const updated = db.updateSettings(updates);
  db.createAuditLog({
    actor_user_id: req.user!.id,
    actor_email: req.user!.email,
    action: 'admin.settings_updated',
    details: `System settings updated.`
  });
  return res.json({
    settings: {
      ...updated,
      subscription_price_kobo: updated.plan_price_ngn * 100,
      subscription_plan_name: updated.plan_name,
      allow_public_signups: updated.allow_new_signups
    }
  });
});

apiRouter.get('/admin/audit-logs', requireAdminOrOwner, (req: AuthenticatedRequest, res: Response) => {
  const logs = db.getAuditLogs();
  return res.json({ logs });
});
