import dns from 'dns';
import { promisify } from 'util';
import type { PublicProfileAnalysisResult, SignalEvidence } from '../src/types';

const lookupAsync = promisify(dns.lookup);

function isPrivateIp(ip: string): boolean {
  if (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '0.0.0.0' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('169.254.') || // Link-local and cloud metadata endpoint (169.254.169.254)
    ip.startsWith('fc00:') ||
    ip.startsWith('fe80:')
  ) {
    return true;
  }

  if (ip.startsWith('172.')) {
    const secondOctet = parseInt(ip.split('.')[1] || '0', 10);
    if (secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  return false;
}

export async function analyzePublicProfile(rawUrl: string): Promise<PublicProfileAnalysisResult> {
  let urlObj: URL;
  try {
    let cleanUrl = rawUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    urlObj = new URL(cleanUrl);
  } catch {
    return {
      url: rawUrl,
      domain: '',
      accessible: false,
      limitation: 'The URL provided is not a valid web address.',
      public_metadata: {},
      signals: [
        {
          type: 'unavailable',
          category: 'profile',
          title: 'Invalid URL Format',
          description: 'The supplied address could not be parsed as a valid HTTP or HTTPS URL.'
        }
      ],
      analyzed_at: new Date().toISOString()
    };
  }

  // Check Protocol (Strictly HTTP/HTTPS)
  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    return {
      url: rawUrl,
      domain: urlObj.hostname,
      accessible: false,
      limitation: 'Only HTTP and HTTPS protocols are permitted for public analysis.',
      public_metadata: {},
      signals: [
        {
          type: 'unavailable',
          category: 'profile',
          title: 'Unsupported Protocol',
          description: 'Non-web protocols are blocked for security reasons.'
        }
      ],
      analyzed_at: new Date().toISOString()
    };
  }

  const hostname = urlObj.hostname.toLowerCase();

  // SSRF Protection: Deny localhost and internal hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === 'metadata.google.internal'
  ) {
    return {
      url: rawUrl,
      domain: hostname,
      accessible: false,
      limitation: 'Unable to verify public information from this URL. The specified host is an internal or reserved network resource.',
      public_metadata: {},
      signals: [
        {
          type: 'unavailable',
          category: 'profile',
          title: 'Internal Resource Denied',
          description: 'Requests to internal hostnames are blocked to prevent SSRF vulnerabilities.'
        }
      ],
      analyzed_at: new Date().toISOString()
    };
  }

  // DNS resolution to ensure IP is not in private range
  try {
    const lookup = await lookupAsync(hostname);
    if (isPrivateIp(lookup.address)) {
      return {
        url: rawUrl,
        domain: hostname,
        accessible: false,
        limitation: 'Unable to verify public information from this URL. Target domain resolves to a restricted private or local IP address.',
        public_metadata: {},
        signals: [
          {
            type: 'unavailable',
            category: 'profile',
            title: 'Restricted IP Blocked',
            description: 'The domain resolves to a private or link-local address.'
          }
        ],
        analyzed_at: new Date().toISOString()
      };
    }
  } catch (dnsErr) {
    return {
      url: rawUrl,
      domain: hostname,
      accessible: false,
      limitation: `Unable to verify public information from this URL. Domain name could not be resolved: ${(dnsErr as Error).message}`,
      public_metadata: {},
      signals: [
        {
          type: 'unavailable',
          category: 'profile',
          title: 'Domain Lookup Failed',
          description: 'DNS lookup for this domain was unsuccessful or domain does not exist.'
        }
      ],
      analyzed_at: new Date().toISOString()
    };
  }

  // Detect platform
  let platform = 'Website';
  if (hostname.includes('facebook.com') || hostname.includes('fb.com')) platform = 'Facebook';
  else if (hostname.includes('instagram.com')) platform = 'Instagram';
  else if (hostname.includes('tiktok.com')) platform = 'TikTok';
  else if (hostname.includes('twitter.com') || hostname.includes('x.com')) platform = 'X (Twitter)';
  else if (hostname.includes('linkedin.com')) platform = 'LinkedIn';
  else if (hostname.includes('github.com')) platform = 'GitHub';
  else if (hostname.includes('youtube.com')) platform = 'YouTube';

  try {
    // Fetch public HTML with standard web crawler headers
    const res = await fetch(urlObj.href, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 VerifyLink-PublicAnalyzer/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(7000)
    });

    if (!res.ok) {
      const status = res.status;
      let limitationMsg = `Target page returned HTTP status ${status}.`;
      if (status === 401 || status === 403 || status === 999) {
        limitationMsg = 'Unable to verify public information from this URL. The platform requires user authentication or restricts non-authenticated visitors from viewing this profile.';
      } else if (status === 404) {
        limitationMsg = 'Unable to verify public information from this URL. The page was not found (404). It may have been deleted, renamed, or made private.';
      }

      return {
        url: rawUrl,
        domain: hostname,
        accessible: false,
        platform,
        limitation: limitationMsg,
        public_metadata: { http_status: String(status) },
        signals: [
          {
            type: 'unavailable',
            category: 'profile',
            title: 'Public Information Unavailable',
            description: limitationMsg
          }
        ],
        analyzed_at: new Date().toISOString()
      };
    }

    const html = await res.text();

    // Check if redirected to login page (common for private/gated profiles)
    const finalUrl = res.url.toLowerCase();
    if (
      finalUrl.includes('/login') ||
      finalUrl.includes('accounts/login') ||
      finalUrl.includes('auth') ||
      finalUrl.includes('checkpoint')
    ) {
      return {
        url: rawUrl,
        domain: hostname,
        accessible: false,
        platform,
        limitation: 'Unable to verify public information from this URL. The page redirected to a login requirement. VerifyLink adheres strictly to public access boundaries and does not bypass platform authentication.',
        public_metadata: { final_destination: res.url },
        signals: [
          {
            type: 'unavailable',
            category: 'profile',
            title: 'Login Required by Platform',
            description: 'The platform requires an active account session to view profile contents.'
          }
        ],
        analyzed_at: new Date().toISOString()
      };
    }

    // Extract legitimate public metadata tags (OpenGraph, Twitter card, Title, Description)
    const publicMetadata: Record<string, string> = {};

    const extractTag = (regex: RegExp): string | null => {
      const match = html.match(regex);
      return match && match[1] ? match[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim() : null;
    };

    const ogTitle = extractTag(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i) ||
                    extractTag(/<meta\s+content=["']([^"']*)["']\s+property=["']og:title["']/i);
    const ogDesc = extractTag(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i) ||
                   extractTag(/<meta\s+content=["']([^"']*)["']\s+property=["']og:description["']/i);
    const metaDesc = extractTag(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
                     extractTag(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
    const pageTitleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const pageTitle = pageTitleMatch && pageTitleMatch[1] ? pageTitleMatch[1].trim() : null;

    if (ogTitle) publicMetadata['og:title'] = ogTitle;
    if (ogDesc) publicMetadata['og:description'] = ogDesc;
    if (metaDesc) publicMetadata['description'] = metaDesc;
    if (pageTitle) publicMetadata['title'] = pageTitle;

    const titleResult = ogTitle || pageTitle || undefined;
    const descResult = ogDesc || metaDesc || undefined;

    // Search for public location strings in extracted metadata
    let publicLocation: string | undefined = undefined;
    const textCorpus = `${titleResult || ''} ${descResult || ''}`;
    
    // Look for common location patterns e.g. "Location: XYZ" or "Based in XYZ"
    const locMatch = textCorpus.match(/(?:based in|located in|location:?)\s*([A-Za-z\s,]{3,30})/i);
    if (locMatch && locMatch[1]) {
      publicLocation = locMatch[1].trim();
    }

    const signals: SignalEvidence[] = [];

    if (titleResult || descResult) {
      signals.push({
        type: 'normal',
        category: 'profile',
        title: 'Public Profile Information Extracted',
        description: `Successfully extracted publicly visible metadata from ${platform} (${hostname}).`
      });
    }

    if (publicLocation) {
      signals.push({
        type: 'normal',
        category: 'profile',
        title: 'Publicly Stated Location Identified',
        description: `Profile text indicates a claimed location of "${publicLocation}".`
      });
    } else {
      signals.push({
        type: 'unavailable',
        category: 'profile',
        title: 'No Stated Location Found in Public Bio',
        description: 'The public profile does not list an explicit location in visible metadata.'
      });
    }

    return {
      url: rawUrl,
      domain: hostname,
      accessible: true,
      platform,
      public_title: titleResult,
      public_name: titleResult,
      public_description: descResult,
      public_location: publicLocation,
      website: urlObj.origin,
      public_metadata: publicMetadata,
      signals,
      analyzed_at: new Date().toISOString()
    };
  } catch (err: any) {
    return {
      url: rawUrl,
      domain: hostname,
      accessible: false,
      platform,
      limitation: `Unable to verify public information from this URL. Network request timed out or was terminated: ${err.message || 'Unknown error'}`,
      public_metadata: {},
      signals: [
        {
          type: 'unavailable',
          category: 'profile',
          title: 'Public Request Timeout',
          description: 'The server could not be reached within the safety timeout window.'
        }
      ],
      analyzed_at: new Date().toISOString()
    };
  }
}
