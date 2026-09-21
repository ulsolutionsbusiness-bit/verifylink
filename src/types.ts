export type UserRole = 'owner' | 'admin' | 'subscriber' | 'user';

export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'expired';

export type VerificationRequestStatus = 'active' | 'completed' | 'declined' | 'expired' | 'invalidated';

export type DetectionStatus = 'detected' | 'not_detected' | 'unknown';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  suspended: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  provider: 'paystack';
  provider_customer_id: string;
  provider_subscription_id: string;
  plan: string;
  plan_name: string;
  amount: number; // in NGN (e.g. 5000)
  currency: string;
  status: SubscriptionStatus;
  start_date: string;
  expiry_date: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  token: string;
  label: string;
  profile_url?: string;
  recipient_name?: string;
  claimed_location?: string;
  purpose?: string;
  initial_notes?: string;
  status: VerificationRequestStatus;
  created_at: string;
  expires_at: string;
  verified_at: string | null;
  invalidated_at: string | null;
  // Associated data if joined
  result?: VerificationResult | null;
  notes?: CaseNote[];
  checklist?: VerificationChecklist;
}

export interface VerificationResult {
  id: string;
  verification_request_id: string;
  country: string;
  region: string;
  city: string;
  network: string;
  isp: string;
  asn: string;
  vpn_status: DetectionStatus;
  proxy_status: DetectionStatus;
  datacenter_status: DetectionStatus;
  evidence: SignalEvidence[];
  limitations: string[];
  created_at: string;
  // Raw IP is NOT stored for privacy compliance, but hashed/masked summary is available
  ip_masked?: string;
  stated_location?: string;
  claimed_location?: string;
  location_consistency?: 'consistent' | 'inconsistent' | 'indeterminate';
  location_comparison?: 'consistent' | 'differ' | 'unable_to_compare';
  // Observed device / browser details (factual only)
  user_agent?: string;
  browser?: string;
  os?: string;
  device_type?: string;
  connection_type?: string;
}

export interface SignalEvidence {
  type: 'normal' | 'attention' | 'unavailable';
  title: string;
  description: string;
  category: 'connection' | 'profile' | 'behavior';
}

export interface CaseNote {
  id: string;
  user_id: string;
  verification_request_id: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationChecklist {
  id?: string;
  verification_request_id: string;
  // Connection
  location_consistent: boolean | null;
  vpn_detected: boolean | null;
  proxy_detected: boolean | null;
  datacenter_detected: boolean | null;
  // Public profile
  profile_available: boolean | null;
  profile_location_available: boolean | null;
  website_available: boolean | null;
  identity_consistent: boolean | null;
  // Transaction (user-provided)
  money_requested: boolean | null;
  urgency_pressure_used: boolean | null;
  payment_details_matched: boolean | null;
  additional_verification_refused: boolean | null;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_user_id: string;
  actor_email: string;
  action: string;
  target_user_id?: string;
  details: string;
  created_at: string;
}

export interface AppSettings {
  plan_price_ngn: number;
  plan_name: string;
  allow_new_signups: boolean;
  ip_intelligence_provider: string;
  rate_limit_per_hour: number;
  maintenance_mode: boolean;
}

export interface PublicProfileAnalysisResult {
  url: string;
  domain: string;
  accessible: boolean;
  limitation?: string;
  platform?: string;
  public_title?: string;
  public_name?: string;
  public_description?: string;
  public_location?: string;
  website?: string;
  public_metadata: Record<string, string>;
  signals: SignalEvidence[];
  analyzed_at: string;
}

export interface AdminStats {
  total_users: number;
  active_subscribers: number;
  expired_subscribers: number;
  verification_requests: number;
  completed_verifications: number;
  declined_verifications: number;
  expired_links: number;
  total_notes: number;
}
