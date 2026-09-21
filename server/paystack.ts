import crypto from 'crypto';
import { db } from './db';

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string; // "success", "failed", "abandoned"
    reference: string;
    amount: number; // in kobo
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string; // "NGN"
    ip_address: string;
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
    };
    metadata: any;
  };
}

class PaystackService {
  private getSecretKey(): string {
    return process.env.PAYSTACK_SECRET_KEY?.trim() || '';
  }

  public getPublicKey(): string {
    return process.env.PAYSTACK_PUBLIC_KEY?.trim() || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.getSecretKey());
  }

  public async initializeTransaction(params: {
    email: string;
    amountInKobo: number;
    reference: string;
    callbackUrl: string;
    metadata?: Record<string, any>;
  }): Promise<{ authorizationUrl: string; reference: string; accessCode?: string }> {
    const secretKey = this.getSecretKey();

    if (!secretKey) {
      // In development/test mode without API key, return sandbox redirect
      console.log('[Paystack] PAYSTACK_SECRET_KEY not set in environment. Using development checkout simulation.');
      return {
        authorizationUrl: `${params.callbackUrl}?reference=${encodeURIComponent(params.reference)}&dev_mock=true`,
        reference: params.reference,
        accessCode: `demo_acc_${params.reference}`
      };
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountInKobo,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata || {}
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[Paystack] Initialize transaction error:', errBody);
      throw new Error(`Paystack initialization failed: ${response.statusText}`);
    }

    const json: PaystackInitializeResponse = await response.json();
    if (!json.status || !json.data) {
      throw new Error(json.message || 'Payment initialization was rejected by Paystack');
    }

    return {
      authorizationUrl: json.data.authorization_url,
      reference: json.data.reference,
      accessCode: json.data.access_code
    };
  }

  public async verifyTransaction(reference: string): Promise<{
    verified: boolean;
    status: string;
    amount: number;
    email: string;
    paidAt: string;
    customerId?: string;
  }> {
    const secretKey = this.getSecretKey();

    if (!secretKey) {
      // In development mock mode
      console.log(`[Paystack] Development mock verification for reference: ${reference}`);
      return {
        verified: true,
        status: 'success',
        amount: 500000, // 5000 NGN
        email: 'subscriber@example.com',
        paidAt: new Date().toISOString(),
        customerId: `dev_cust_${reference}`
      };
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Paystack] Verification failed:', errText);
      throw new Error(`Payment verification failed: ${response.statusText}`);
    }

    const json: PaystackVerifyResponse = await response.json();
    if (!json.status || !json.data) {
      throw new Error(json.message || 'Verification could not be completed');
    }

    const data = json.data;
    const isSuccess = data.status === 'success';

    return {
      verified: isSuccess,
      status: data.status,
      amount: data.amount,
      email: data.customer?.email || '',
      paidAt: data.paid_at || new Date().toISOString(),
      customerId: data.customer?.customer_code || String(data.customer?.id || '')
    };
  }

  public verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string | undefined): boolean {
    const secretKey = this.getSecretKey();
    if (!secretKey || !signatureHeader) return false;

    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8'))
      .digest('hex');

    return hash === signatureHeader;
  }

  public async handleWebhookEvent(event: any): Promise<void> {
    const eventType = event.event;
    const data = event.data;

    console.log(`[Paystack Webhook] Received event: ${eventType}`);

    if (eventType === 'charge.success') {
      const email = data.customer?.email;
      const reference = data.reference;
      const user = email ? db.getUserByEmail(email) : null;

      if (user) {
        const settings = db.getSettings();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const now = new Date();
        const expiry = new Date(now.getTime() + thirtyDaysMs).toISOString();

        db.createOrUpdateSubscription({
          user_id: user.id,
          provider: 'paystack',
          provider_customer_id: data.customer?.customer_code || `cust_${data.customer?.id}`,
          provider_subscription_id: reference,
          plan: 'verifylink_pro',
          plan_name: settings.plan_name,
          amount: data.amount ? data.amount / 100 : settings.plan_price_ngn,
          currency: data.currency || 'NGN',
          status: 'active',
          start_date: now.toISOString(),
          expiry_date: expiry
        });

        db.createAuditLog({
          actor_user_id: user.id,
          actor_email: user.email,
          action: 'subscription.activated.webhook',
          details: `Paystack webhook charge.success processed for reference ${reference}`
        });
      }
    } else if (eventType === 'subscription.disable' || eventType === 'invoice.payment_failed') {
      const email = data.customer?.email;
      const user = email ? db.getUserByEmail(email) : null;
      if (user) {
        const existing = db.getSubscriptionByUserId(user.id);
        if (existing) {
          db.createOrUpdateSubscription({
            user_id: user.id,
            status: eventType === 'invoice.payment_failed' ? 'past_due' : 'cancelled'
          });
        }
      }
    }
  }
}

export const paystackService = new PaystackService();
