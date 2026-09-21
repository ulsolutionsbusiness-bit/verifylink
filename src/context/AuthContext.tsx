import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Subscription } from '../types';
import { apiFetch, TOKEN_KEY } from '../utils/api';

const USER_KEY = 'verifylink_session_user';
const ACCESS_KEY = 'verifylink_has_access';
const OWNER_EMAIL = 'ulsolutions.business@gmail.com';

// Helper to process user and bypass subscription logic for the owner email
function processAuthResponse(rawUser: User | null, rawSubscription: Subscription | null, serverHasAccess?: boolean) {
  if (!rawUser) {
    return { user: null, subscription: null, hasAccess: false };
  }

  const isOwnerEmail = rawUser.email.toLowerCase().trim() === OWNER_EMAIL;
  const user: User = isOwnerEmail ? { ...rawUser, role: 'owner' } : { ...rawUser };

  // If email matches owner, set role to 'owner' and explicitly bypass all subscription logic
  let hasAccess = false;
  if (isOwnerEmail || user.role === 'owner') {
    hasAccess = true;
  } else if (user.role === 'admin') {
    hasAccess = true;
  } else {
    hasAccess = rawSubscription?.status === 'active' || Boolean(serverHasAccess);
  }

  return { user, subscription: rawSubscription, hasAccess };
}

interface AuthContextType {
  user: User | null;
  subscription: Subscription | null;
  hasAccess: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state from persisted session state if available
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) {
        const parsed: User = JSON.parse(stored);
        if (parsed.email?.toLowerCase().trim() === OWNER_EMAIL) {
          parsed.role = 'owner';
        }
        return parsed;
      }
    } catch {}
    return null;
  });

  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const [hasAccess, setHasAccess] = useState<boolean>(() => {
    try {
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedUser) {
        const parsed: User = JSON.parse(storedUser);
        if (parsed.email?.toLowerCase().trim() === OWNER_EMAIL || parsed.role === 'owner' || parsed.role === 'admin') {
          return true;
        }
      }
      return localStorage.getItem(ACCESS_KEY) === 'true';
    } catch {}
    return false;
  });

  const [loading, setLoading] = useState<boolean>(true);

  // Persist session state helper
  const persistSessionState = (authUser: User | null, access: boolean, token?: string) => {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      }
      if (authUser) {
        localStorage.setItem(USER_KEY, JSON.stringify(authUser));
        localStorage.setItem(ACCESS_KEY, access ? 'true' : 'false');
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(ACCESS_KEY);
      }
    } catch {
      // Fallback for restricted storage environments
    }
  };

  const refreshAuth = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          // Explicitly check for owner email, enforce role='owner', and bypass subscription logic
          const processed = processAuthResponse(data.user, data.subscription, data.hasAccess);
          setUser(processed.user);
          setSubscription(processed.subscription);
          setHasAccess(processed.hasAccess);
          persistSessionState(processed.user, processed.hasAccess);
        } else {
          persistSessionState(null, false);
          setUser(null);
          setSubscription(null);
          setHasAccess(false);
        }
      } else {
        persistSessionState(null, false);
        setUser(null);
        setSubscription(null);
        setHasAccess(false);
      }
    } catch (err) {
      console.error('Error checking auth state:', err);
      persistSessionState(null, false);
      setUser(null);
      setSubscription(null);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sign in');
    }

    // Process authentication response: check owner email, set role to owner, bypass subscription logic
    const processed = processAuthResponse(data.user, data.subscription, data.hasAccess);
    const finalUser = processed.user!;

    setUser(finalUser);
    setSubscription(processed.subscription);
    setHasAccess(processed.hasAccess);

    // Persist full status in session state
    persistSessionState(finalUser, processed.hasAccess, data.token);

    return finalUser;
  };

  const signup = async (name: string, email: string, password: string): Promise<User> => {
    const res = await apiFetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sign up');
    }

    // Process authentication response: check owner email, set role to owner, bypass subscription logic
    const processed = processAuthResponse(data.user, data.subscription, data.hasAccess);
    const finalUser = processed.user!;

    setUser(finalUser);
    setSubscription(processed.subscription);
    setHasAccess(processed.hasAccess);

    // Persist full status in session state
    persistSessionState(finalUser, processed.hasAccess, data.token);

    return finalUser;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      persistSessionState(null, false);
      setUser(null);
      setSubscription(null);
      setHasAccess(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        subscription,
        hasAccess,
        loading,
        login,
        signup,
        logout,
        refreshAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
