/**
 * Utility to resolve the public-facing URL for external recipients.
 *
 * In Google AI Studio Build:
 * - Development preview runs at https://ais-dev-*.run.app (requires Google IAM / developer cookies)
 * - Public shared deployment runs at https://ais-pre-*.run.app (publicly accessible to any recipient)
 *
 * If links are generated using ais-dev-*, external mobile browsers (like Opera Mini)
 * or recipients without Google developer access get blocked by Google's authentication wall (__cookie_check.html).
 */

export function getPublicBaseUrl(): string {
  if (typeof window === 'undefined') return '';

  // 1. Check user-configured override in localStorage
  try {
    const saved = localStorage.getItem('verifylink_custom_public_url');
    if (saved && saved.trim().startsWith('http')) {
      return saved.trim().replace(/\/+$/, '');
    }
  } catch {
    // Graceful fallback
  }

  const origin = window.location.origin || '';

  // 2. If running inside AI Studio Development container, automatically convert to public shared preview URL
  if (origin.includes('ais-dev-')) {
    return origin.replace('ais-dev-', 'ais-pre-');
  }

  return origin;
}

export function getPublicVerificationUrl(token: string): string {
  const base = getPublicBaseUrl();
  return `${base}/verify/${encodeURIComponent(token)}`;
}

export function getPublicReportUrl(token: string): string {
  const base = getPublicBaseUrl();
  return `${base}/report/${encodeURIComponent(token)}`;
}

export function isDevelopmentPreviewOrigin(): boolean {
  if (typeof window === 'undefined') return false;
  return (window.location.origin || '').includes('ais-dev-');
}
