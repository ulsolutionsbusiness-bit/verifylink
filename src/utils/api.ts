export const TOKEN_KEY = 'verifylink_session_token';

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const options: RequestInit = { ...init };
  const headers = new Headers(options.headers || {});

  try {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
  } catch {
    // Graceful fallback for restricted storage environments
  }

  options.headers = headers;
  options.credentials = options.credentials || 'include';

  let targetUrl = input;
  if (typeof window !== 'undefined' && typeof input === 'string' && input.startsWith('/')) {
    if (window.location.origin && window.location.origin !== 'null' && window.location.origin.startsWith('http')) {
      targetUrl = `${window.location.origin}${input}`;
    }
  }

  try {
    return await fetch(targetUrl, options);
  } catch (err: any) {
    console.error(`[VerifyLink API Error] Network request to ${String(input)} failed:`, err);
    throw err;
  }
}
