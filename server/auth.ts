import { Request, Response, NextFunction } from 'express';
import { db, StoredUser } from './db';
import type { Subscription } from '../src/types';

export interface AuthenticatedRequest extends Request {
  user?: StoredUser;
  subscription?: Subscription | null;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // Prioritize Authorization header for reliable session handling in iframe / cross-origin preview
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      token = req.cookies?.verifylink_session;
    }

    if (!token) {
      return next();
    }

    const session = db.getSession(token);
    if (!session) {
      return next();
    }

    const user = db.getUserById(session.user_id);
    if (!user) {
      return next();
    }

    if (user.suspended) {
      return res.status(403).json({
        error: 'Account Suspended',
        message: 'This account has been suspended by an administrator.'
      });
    }

    // Owner role enforcement guarantee
    if (user.email.toLowerCase().trim() === 'ulsolutions.business@gmail.com' && user.role !== 'owner') {
      user.role = 'owner';
    }

    req.user = user;
    req.subscription = db.getSubscriptionByUserId(user.id);
    next();
  } catch (err) {
    console.error('[Auth Middleware] Authentication error:', err);
    next();
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication Required',
      code: 'AUTH_REQUIRED',
      message: 'You must be signed in to access this resource.'
    });
  }
  next();
}

/**
 * The mandatory server-side authorization function: requireAccess()
 * IF authenticated user.role == owner -> ALLOW
 * ELSE IF authenticated user.role == admin -> ALLOW
 * ELSE IF authenticated user.subscription.status == active -> ALLOW
 * ELSE -> DENY
 */
export function requireAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication Required',
      code: 'AUTH_REQUIRED',
      message: 'You must be signed in to perform verifications.'
    });
  }

  if (req.user.suspended) {
    return res.status(403).json({
      error: 'Account Suspended',
      code: 'ACCOUNT_SUSPENDED',
      message: 'Your account has been suspended.'
    });
  }

  // 1. Owner has permanent free access to every feature
  if (req.user.role === 'owner') {
    return next();
  }

  // 2. Admin has permanent free access to all normal VerifyLink features
  if (req.user.role === 'admin') {
    return next();
  }

  // 3. Active subscriber
  if (req.subscription && req.subscription.status === 'active') {
    const expiryTime = new Date(req.subscription.expiry_date).getTime();
    if (expiryTime > Date.now()) {
      return next();
    } else {
      // Mark as expired in DB
      db.createOrUpdateSubscription({
        user_id: req.user.id,
        status: 'expired'
      });
    }
  }

  // Deny access
  return res.status(403).json({
    error: 'Active Subscription Required',
    code: 'SUBSCRIPTION_REQUIRED',
    message: 'An active paid subscription is required to access protected verification features.',
    userRole: req.user.role,
    subscriptionStatus: req.subscription?.status || 'none'
  });
}

export function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication Required' });
  }

  if (req.user.role !== 'owner') {
    return res.status(403).json({
      error: 'Access Denied',
      message: 'This administrative operation is restricted to the platform owner.'
    });
  }

  next();
}

export function requireAdminOrOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication Required' });
  }

  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Access Denied',
      message: 'Administrative privileges required.'
    });
  }

  next();
}
