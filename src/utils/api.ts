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
    // Graceful fallback for restricted environments
  }

  options.headers = headers;
  options.credentials = options.credentials || 'include';

  return fetch(input, options);
}
