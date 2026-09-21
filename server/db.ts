import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  User,
  Subscription,
  VerificationRequest,
  VerificationResult,
  CaseNote,
  VerificationChecklist,
  AuditLog,
  AppSettings,
  AdminStats,
  UserRole,
  SubscriptionStatus
} from '../src/types';

export interface StoredUser extends User {
  password_hash: string;
  salt: string;
}

export interface StoredSession {
  token: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface StoredPasswordReset {
  token: string;
  user_id: string;
  expires_at: string;
  used: boolean;
}

interface DatabaseSchema {
  users: StoredUser[];
  subscriptions: Subscription[];
  verification_requests: VerificationRequest[];
  verification_results: VerificationResult[];
  case_notes: CaseNote[];
  checklists: VerificationChecklist[];
  audit_logs: AuditLog[];
  settings: AppSettings;
  sessions: StoredSession[];
  password_resets: StoredPasswordReset[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'verifylink_db.json');

const DEFAULT_SETTINGS: AppSettings = {
  plan_price_ngn: 5000,
  plan_name: 'VerifyLink Pro',
  allow_new_signups: true,
  ip_intelligence_provider: process.env.IP_INTELLIGENCE_PROVIDER || 'ipinfo',
  rate_limit_per_hour: 60,
  maintenance_mode: false
};

class Database {
  private data: DatabaseSchema = {
    users: [],
    subscriptions: [],
    verification_requests: [],
    verification_results: [],
    case_notes: [],
    checklists: [],
    audit_logs: [],
    settings: DEFAULT_SETTINGS,
    sessions: [],
    password_resets: []
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          users: parsed.users || [],
          subscriptions: parsed.subscriptions || [],
          verification_requests: parsed.verification_requests || [],
          verification_results: parsed.verification_results || [],
          case_notes: parsed.case_notes || [],
          checklists: parsed.checklists || [],
          audit_logs: parsed.audit_logs || [],
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          sessions: parsed.sessions || [],
          password_resets: parsed.password_resets || []
        };
        this.ensureOwnerAccount();
      } else {
        this.ensureOwnerAccount();
      }
    } catch (err) {
      console.error('Error initializing database:', err);
      this.ensureOwnerAccount();
    }
  }

  public hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, s, 100000, 64, 'sha512').toString('hex');
    return { hash, salt: s };
  }

  public verifyPassword(password: string, hash: string, salt: string): boolean {
    const calculated = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(calculated));
  }

  public ensureOwnerAccount(): StoredUser {
    const ownerEmail = (process.env.ADMIN_INITIAL_EMAIL || 'ulsolutions.business@gmail.com').toLowerCase().trim();
    let owner = this.data.users.find(u => u.email.toLowerCase().trim() === ownerEmail);
    const now = new Date().toISOString();

    if (!owner) {
      const ownerPassword = process.env.ADMIN_INITIAL_PASSWORD || 'VerifyOwner2026!';
      const { hash, salt } = this.hashPassword(ownerPassword);
      owner = {
        id: 'user_owner_01',
        name: 'Primary Owner',
        email: ownerEmail,
        role: 'owner',
        created_at: now,
        updated_at: now,
        suspended: false,
        password_hash: hash,
        salt
      };
      this.data.users.push(owner);
      console.log(`[VerifyLink DB] Initialized primary owner account: ${ownerEmail}`);
    } else {
      let changed = false;
      if (owner.role !== 'owner') {
        owner.role = 'owner';
        changed = true;
      }
      if (owner.suspended) {
        owner.suspended = false;
        changed = true;
      }
      if (changed) {
        owner.updated_at = now;
        console.log(`[VerifyLink DB] Restored owner privileges for: ${ownerEmail}`);
      }
    }

    // Ensure owner has an active lifetime subscription record as well
    const ownerSub = this.data.subscriptions.find(s => s.user_id === owner!.id);
    if (!ownerSub) {
      this.data.subscriptions.push({
        id: `sub_owner_${owner.id}`,
        user_id: owner.id,
        provider: 'paystack',
        provider_customer_id: 'cus_owner_system',
        provider_subscription_id: 'sub_owner_system',
        plan: 'verifylink_pro',
        plan_name: 'VerifyLink Pro (Owner Lifetime)',
        amount: 0,
        currency: 'NGN',
        status: 'active',
        start_date: now,
        expiry_date: '2099-12-31T23:59:59.999Z',
        created_at: now,
        updated_at: now
      });
    } else if (ownerSub.status !== 'active') {
      ownerSub.status = 'active';
      ownerSub.expiry_date = '2099-12-31T23:59:59.999Z';
      ownerSub.updated_at = now;
    }

    this.save();
    return owner;
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpPath = `${DB_FILE}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpPath, DB_FILE);
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  // Users
  public getUserById(id: string): StoredUser | null {
    return this.data.users.find(u => u.id === id) || null;
  }

  public getUserByEmail(email: string): StoredUser | null {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
  }

  public createUser(userData: { name: string; email: string; password: string; role?: UserRole }): StoredUser {
    const existing = this.getUserByEmail(userData.email);
    if (existing) {
      throw new Error('An account with this email address already exists.');
    }

    const { hash, salt } = this.hashPassword(userData.password);
    const now = new Date().toISOString();
    const newUser: StoredUser = {
      id: `usr_${crypto.randomBytes(8).toString('hex')}`,
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
      role: userData.role || 'user',
      created_at: now,
      updated_at: now,
      suspended: false,
      password_hash: hash,
      salt
    };

    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<StoredUser>): StoredUser | null {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return null;

    this.data.users[idx] = {
      ...this.data.users[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.save();
    return this.data.users[idx];
  }

  public getAllUsers(): User[] {
    return this.data.users.map(({ password_hash, salt, ...rest }) => rest);
  }

  public deleteUser(id: string): boolean {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.data.users.splice(idx, 1);
    this.save();
    return true;
  }

  // Sessions
  public createSession(userId: string): StoredSession {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expires = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

    const session: StoredSession = {
      token,
      user_id: userId,
      created_at: now.toISOString(),
      expires_at: expires.toISOString()
    };

    this.data.sessions.push(session);
    this.save();
    return session;
  }

  public getSession(token: string): StoredSession | null {
    const session = this.data.sessions.find(s => s.token === token);
    if (!session) return null;
    if (new Date(session.expires_at).getTime() < Date.now()) {
      this.deleteSession(token);
      return null;
    }
    return session;
  }

  public deleteSession(token: string): void {
    this.data.sessions = this.data.sessions.filter(s => s.token !== token);
    this.save();
  }

  // Password Reset
  public createPasswordReset(userId: string): StoredPasswordReset {
    const token = crypto.randomBytes(24).toString('hex');
    const now = new Date();
    const expires = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hour

    const reset: StoredPasswordReset = {
      token,
      user_id: userId,
      expires_at: expires.toISOString(),
      used: false
    };

    this.data.password_resets.push(reset);
    this.save();
    return reset;
  }

  public getPasswordReset(token: string): StoredPasswordReset | null {
    const reset = this.data.password_resets.find(r => r.token === token && !r.used);
    if (!reset) return null;
    if (new Date(reset.expires_at).getTime() < Date.now()) {
      return null;
    }
    return reset;
  }

  public markPasswordResetUsed(token: string): void {
    const reset = this.data.password_resets.find(r => r.token === token);
    if (reset) {
      reset.used = true;
      this.save();
    }
  }

  // Subscriptions
  public getSubscriptionByUserId(userId: string): Subscription | null {
    // Return latest subscription
    const userSubs = this.data.subscriptions
      .filter(s => s.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return userSubs[0] || null;
  }

  public createOrUpdateSubscription(subData: {
    user_id: string;
    provider?: 'paystack';
    provider_customer_id?: string;
    provider_subscription_id?: string;
    plan?: string;
    plan_name?: string;
    amount?: number;
    currency?: string;
    status: SubscriptionStatus;
    start_date?: string;
    expiry_date?: string;
  }): Subscription {
    const now = new Date().toISOString();
    const existing = this.getSubscriptionByUserId(subData.user_id);

    if (existing) {
      const idx = this.data.subscriptions.findIndex(s => s.id === existing.id);
      const updated: Subscription = {
        ...existing,
        ...subData,
        updated_at: now
      };
      this.data.subscriptions[idx] = updated;

      // Also update user role if active subscription
      if (subData.status === 'active') {
        const user = this.getUserById(subData.user_id);
        if (user && user.role === 'user') {
          this.updateUser(user.id, { role: 'subscriber' });
        }
      }

      this.save();
      return updated;
    }

    const newSub: Subscription = {
      id: `sub_${crypto.randomBytes(8).toString('hex')}`,
      user_id: subData.user_id,
      provider: subData.provider || 'paystack',
      provider_customer_id: subData.provider_customer_id || `cust_${crypto.randomBytes(6).toString('hex')}`,
      provider_subscription_id: subData.provider_subscription_id || `subp_${crypto.randomBytes(6).toString('hex')}`,
      plan: subData.plan || 'verifylink_pro',
      plan_name: subData.plan_name || this.data.settings.plan_name,
      amount: subData.amount || this.data.settings.plan_price_ngn,
      currency: subData.currency || 'NGN',
      status: subData.status,
      start_date: subData.start_date || now,
      expiry_date: subData.expiry_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: now,
      updated_at: now
    };

    this.data.subscriptions.push(newSub);

    if (subData.status === 'active') {
      const user = this.getUserById(subData.user_id);
      if (user && user.role === 'user') {
        this.updateUser(user.id, { role: 'subscriber' });
      }
    }

    this.save();
    return newSub;
  }

  // Verification Requests
  public createVerificationRequest(data: {
    user_id: string;
    label?: string;
    profile_url?: string;
    recipient_name?: string;
    claimed_location?: string;
    purpose?: string;
    notes?: string;
    expiresInSeconds?: number;
  }): VerificationRequest {
    const token = crypto.randomBytes(6).toString('hex').toUpperCase(); // Clean 12-char token
    const now = new Date();
    const duration = data.expiresInSeconds || 24 * 60 * 60; // default 24h
    const expiresAt = new Date(now.getTime() + duration * 1000);

    let defaultLabel = `Verification Case #${token}`;
    if (data.recipient_name?.trim()) {
      defaultLabel = data.recipient_name.trim();
    } else if (data.claimed_location?.trim()) {
      defaultLabel = `Case (${data.claimed_location.trim()})`;
    } else if (data.profile_url?.trim()) {
      try {
        const u = new URL(data.profile_url.startsWith('http') ? data.profile_url : `https://${data.profile_url}`);
        defaultLabel = `${u.hostname.replace(/^www\./, '')} Profile`;
      } catch {
        defaultLabel = 'Profile Verification';
      }
    }

    const req: VerificationRequest = {
      id: `vreq_${crypto.randomBytes(8).toString('hex')}`,
      user_id: data.user_id,
      token,
      label: data.label?.trim() || defaultLabel,
      profile_url: data.profile_url?.trim() || undefined,
      recipient_name: data.recipient_name?.trim() || undefined,
      claimed_location: data.claimed_location?.trim() || undefined,
      purpose: data.purpose?.trim() || undefined,
      initial_notes: data.notes?.trim() || undefined,
      status: 'active',
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      verified_at: null,
      invalidated_at: null
    };

    this.data.verification_requests.push(req);

    // If user provided notes or purpose, automatically record as case note
    if (data.notes?.trim()) {
      this.createCaseNote({
        user_id: data.user_id,
        verification_request_id: req.id,
        note: data.notes.trim()
      });
    } else if (data.purpose?.trim()) {
      this.createCaseNote({
        user_id: data.user_id,
        verification_request_id: req.id,
        note: `Verification Purpose: ${data.purpose.trim()}`
      });
    }

    this.save();
    return req;
  }

  public getVerificationRequestByToken(token: string): VerificationRequest | null {
    const req = this.data.verification_requests.find(r => r.token.toUpperCase() === token.toUpperCase().trim());
    if (!req) return null;

    // Check expiration on read
    if (req.status === 'active' && new Date(req.expires_at).getTime() < Date.now()) {
      req.status = 'expired';
      this.save();
    }

    return req;
  }

  public getVerificationRequestById(id: string): VerificationRequest | null {
    const req = this.data.verification_requests.find(r => r.id === id);
    if (!req) return null;

    if (req.status === 'active' && new Date(req.expires_at).getTime() < Date.now()) {
      req.status = 'expired';
      this.save();
    }

    return req;
  }

  public getVerificationRequestsByUser(userId: string): VerificationRequest[] {
    const now = Date.now();
    return this.data.verification_requests
      .filter(r => r.user_id === userId)
      .map(r => {
        if (r.status === 'active' && new Date(r.expires_at).getTime() < now) {
          r.status = 'expired';
        }
        return r;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public updateVerificationRequest(id: string, updates: Partial<VerificationRequest>): VerificationRequest | null {
    const idx = this.data.verification_requests.findIndex(r => r.id === id);
    if (idx === -1) return null;

    this.data.verification_requests[idx] = {
      ...this.data.verification_requests[idx],
      ...updates
    };
    this.save();
    return this.data.verification_requests[idx];
  }

  public deleteVerificationRequest(id: string, userId: string): boolean {
    const idx = this.data.verification_requests.findIndex(r => r.id === id && r.user_id === userId);
    if (idx === -1) return false;

    // Cascade delete results, notes, checklist
    this.data.verification_requests.splice(idx, 1);
    this.data.verification_results = this.data.verification_results.filter(r => r.verification_request_id !== id);
    this.data.case_notes = this.data.case_notes.filter(n => n.verification_request_id !== id);
    this.data.checklists = this.data.checklists.filter(c => c.verification_request_id !== id);

    this.save();
    return true;
  }

  // Verification Results
  public createVerificationResult(result: Omit<VerificationResult, 'id' | 'created_at'>): VerificationResult {
    const newResult: VerificationResult = {
      id: `vres_${crypto.randomBytes(8).toString('hex')}`,
      ...result,
      created_at: new Date().toISOString()
    };

    // Remove existing if any for this request
    this.data.verification_results = this.data.verification_results.filter(
      r => r.verification_request_id !== result.verification_request_id
    );

    this.data.verification_results.push(newResult);
    this.save();
    return newResult;
  }

  public getVerificationResultByRequestId(requestId: string): VerificationResult | null {
    return this.data.verification_results.find(r => r.verification_request_id === requestId) || null;
  }

  // Case Notes
  public getCaseNotesByRequestId(requestId: string, userId: string): CaseNote[] {
    return this.data.case_notes
      .filter(n => n.verification_request_id === requestId && n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createCaseNote(data: { user_id: string; verification_request_id: string; note: string }): CaseNote {
    const now = new Date().toISOString();
    const newNote: CaseNote = {
      id: `note_${crypto.randomBytes(8).toString('hex')}`,
      user_id: data.user_id,
      verification_request_id: data.verification_request_id,
      note: data.note.trim(),
      created_at: now,
      updated_at: now
    };

    this.data.case_notes.push(newNote);
    this.save();
    return newNote;
  }

  public deleteCaseNote(noteId: string, userId: string): boolean {
    const idx = this.data.case_notes.findIndex(n => n.id === noteId && n.user_id === userId);
    if (idx === -1) return false;
    this.data.case_notes.splice(idx, 1);
    this.save();
    return true;
  }

  // Checklists
  public getChecklistByRequestId(requestId: string): VerificationChecklist {
    const existing = this.data.checklists.find(c => c.verification_request_id === requestId);
    if (existing) return existing;

    const defaultChecklist: VerificationChecklist = {
      verification_request_id: requestId,
      location_consistent: null,
      vpn_detected: null,
      proxy_detected: null,
      datacenter_detected: null,
      profile_available: null,
      profile_location_available: null,
      website_available: null,
      identity_consistent: null,
      money_requested: null,
      urgency_pressure_used: null,
      payment_details_matched: null,
      additional_verification_refused: null,
      updated_at: new Date().toISOString()
    };

    return defaultChecklist;
  }

  public saveChecklist(checklist: Partial<VerificationChecklist> & { verification_request_id: string }): VerificationChecklist {
    const idx = this.data.checklists.findIndex(c => c.verification_request_id === checklist.verification_request_id);
    const now = new Date().toISOString();

    if (idx >= 0) {
      this.data.checklists[idx] = {
        ...this.data.checklists[idx],
        ...checklist,
        updated_at: now
      };
      this.save();
      return this.data.checklists[idx];
    } else {
      const full: VerificationChecklist = {
        verification_request_id: checklist.verification_request_id,
        location_consistent: checklist.location_consistent ?? null,
        vpn_detected: checklist.vpn_detected ?? null,
        proxy_detected: checklist.proxy_detected ?? null,
        datacenter_detected: checklist.datacenter_detected ?? null,
        profile_available: checklist.profile_available ?? null,
        profile_location_available: checklist.profile_location_available ?? null,
        website_available: checklist.website_available ?? null,
        identity_consistent: checklist.identity_consistent ?? null,
        money_requested: checklist.money_requested ?? null,
        urgency_pressure_used: checklist.urgency_pressure_used ?? null,
        payment_details_matched: checklist.payment_details_matched ?? null,
        additional_verification_refused: checklist.additional_verification_refused ?? null,
        updated_at: now
      };
      this.data.checklists.push(full);
      this.save();
      return full;
    }
  }

  // Audit Logs
  public createAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const newLog: AuditLog = {
      id: `audit_${crypto.randomBytes(8).toString('hex')}`,
      ...log,
      created_at: new Date().toISOString()
    };

    this.data.audit_logs.unshift(newLog);
    if (this.data.audit_logs.length > 500) {
      this.data.audit_logs = this.data.audit_logs.slice(0, 500);
    }
    this.save();
    return newLog;
  }

  public getAuditLogs(limit = 100): AuditLog[] {
    return this.data.audit_logs.slice(0, limit);
  }

  // App Settings
  public getSettings(): AppSettings {
    return this.data.settings;
  }

  public updateSettings(settings: Partial<AppSettings>): AppSettings {
    this.data.settings = {
      ...this.data.settings,
      ...settings
    };
    this.save();
    return this.data.settings;
  }

  // Admin Stats
  public getAdminStats(): AdminStats {
    const now = Date.now();
    const activeSubs = this.data.subscriptions.filter(
      s => s.status === 'active' && new Date(s.expiry_date).getTime() > now
    ).length;

    const expiredSubs = this.data.subscriptions.filter(
      s => s.status === 'expired' || (s.status === 'active' && new Date(s.expiry_date).getTime() <= now)
    ).length;

    const completed = this.data.verification_requests.filter(r => r.status === 'completed').length;
    const declined = this.data.verification_requests.filter(r => r.status === 'declined').length;
    const expired = this.data.verification_requests.filter(
      r => r.status === 'expired' || (r.status === 'active' && new Date(r.expires_at).getTime() <= now)
    ).length;

    return {
      total_users: this.data.users.length,
      active_subscribers: activeSubs,
      expired_subscribers: expiredSubs,
      verification_requests: this.data.verification_requests.length,
      completed_verifications: completed,
      declined_verifications: declined,
      expired_links: expired,
      total_notes: this.data.case_notes.length
    };
  }
}

export const db = new Database();
