import type { DetectionStatus, SignalEvidence } from '../src/types';

export interface IpIntelligenceOutput {
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
  ip_masked: string;
}

export interface IpIntelligenceProvider {
  name: string;
  isConfigured(): boolean;
  lookup(ip: string): Promise<IpIntelligenceOutput>;
}

function maskIp(ip: string): string {
  if (!ip) return 'Unknown';
  if (ip.includes(':')) {
    // IPv6
    const parts = ip.split(':');
    return parts.slice(0, 3).join(':') + ':****:****:****';
  }
  // IPv4
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return '***.***.***';
}

function isPrivateOrLocalIp(ip: string): boolean {
  return (
    !ip ||
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip.startsWith('::ffff:127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    (ip.startsWith('172.') && parseInt(ip.split('.')[1] || '0', 10) >= 16 && parseInt(ip.split('.')[1] || '0', 10) <= 31) ||
    ip === 'localhost'
  );
}

class BaseIntelligenceProvider implements IpIntelligenceProvider {
  name = 'Standard IP Intelligence';

  isConfigured(): boolean {
    return Boolean(process.env.IP_INTELLIGENCE_API_KEY);
  }

  async lookup(ip: string): Promise<IpIntelligenceOutput> {
    const apiKey = process.env.IP_INTELLIGENCE_API_KEY?.trim();
    const providerChoice = (process.env.IP_INTELLIGENCE_PROVIDER || 'ipinfo').toLowerCase();

    // Check for private / local addresses (e.g. testing in development container)
    if (isPrivateOrLocalIp(ip)) {
      return {
        country: 'Cloud Container / Local Environment',
        region: 'Internal Network',
        city: 'Local Host',
        network: 'Development Sandbox',
        isp: 'Internal Container Network',
        asn: 'AS-LOCAL',
        vpn_status: 'unknown',
        proxy_status: 'unknown',
        datacenter_status: 'not_detected',
        evidence: [
          {
            type: 'normal',
            category: 'connection',
            title: 'Internal Sandbox Connection',
            description: 'Connection verified through local development container interface.'
          }
        ],
        limitations: [
          'The client connected via local/internal loopback address. Detailed public ISP intelligence is not applicable for loopback addresses.',
          'VPN/Proxy detection is marked as Unknown as required when verified through local test environment.'
        ],
        ip_masked: maskIp(ip)
      };
    }

    // If an external API Key is provided, query the appropriate commercial intelligence API
    if (apiKey) {
      if (providerChoice === 'ipinfo') {
        try {
          const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}?token=${encodeURIComponent(apiKey)}`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(5000)
          });

          if (res.ok) {
            const data = await res.json();
            const privacy = data.privacy || {};
            const vpn: DetectionStatus = privacy.vpn !== undefined ? (privacy.vpn ? 'detected' : 'not_detected') : 'unknown';
            const proxy: DetectionStatus = privacy.proxy !== undefined ? (privacy.proxy ? 'detected' : 'not_detected') : 'unknown';
            const hosting: DetectionStatus = privacy.hosting !== undefined ? (privacy.hosting ? 'detected' : 'not_detected') : 'unknown';

            const evidence: SignalEvidence[] = [];
            if (data.country) {
              evidence.push({
                type: 'normal',
                category: 'connection',
                title: 'Connection Location Identified',
                description: `Connection appears to originate from ${data.city ? data.city + ', ' : ''}${data.country}.`
              });
            }
            if (vpn === 'detected') {
              evidence.push({
                type: 'attention',
                category: 'connection',
                title: 'VPN Detected',
                description: 'Commercial IP intelligence identified this connection as routing through a VPN service.'
              });
            }
            if (proxy === 'detected') {
              evidence.push({
                type: 'attention',
                category: 'connection',
                title: 'Proxy Detected',
                description: 'Network connection indicates an intermediate proxy layer.'
              });
            }
            if (hosting === 'detected') {
              evidence.push({
                type: 'attention',
                category: 'connection',
                title: 'Datacenter / Hosting IP Detected',
                description: 'Connection originates from a datacenter, cloud host, or colocation facility rather than a residential ISP.'
              });
            }

            return {
              country: data.country || 'Unknown',
              region: data.region || 'Unknown',
              city: data.city || 'Unknown',
              network: data.org || 'Unknown Network',
              isp: data.org || 'Unknown ISP',
              asn: data.org ? data.org.split(' ')[0] : 'Unknown ASN',
              vpn_status: vpn,
              proxy_status: proxy,
              datacenter_status: hosting,
              evidence,
              limitations: [
                'IP geolocation is approximate and reflects network routing, not a precise physical location.',
                'VPN and proxy detection relies on commercial databases and may occasionally report false positives or negatives.'
              ],
              ip_masked: maskIp(ip)
            };
          }
        } catch (err) {
          console.warn('[IP Intelligence] IPinfo API query failed, falling back to standard lookup:', err);
        }
      }

      if (providerChoice === 'proxycheck') {
        try {
          const res = await fetch(`https://proxycheck.io/v2/${encodeURIComponent(ip)}?key=${encodeURIComponent(apiKey)}&vpn=1&asn=1`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(5000)
          });
          if (res.ok) {
            const data = await res.json();
            const ipData = data[ip] || {};
            const isProxy = ipData.proxy === 'yes';
            const isVpn = ipData.type === 'VPN';

            const evidence: SignalEvidence[] = [
              {
                type: 'normal',
                category: 'connection',
                title: 'Connection Location Identified',
                description: `Connection appears to originate from ${ipData.city || ''} ${ipData.country || ''}.`
              }
            ];

            if (isVpn) {
              evidence.push({
                type: 'attention',
                category: 'connection',
                title: 'VPN Detected',
                description: 'ProxyCheck service indicated an active VPN connection.'
              });
            } else if (isProxy) {
              evidence.push({
                type: 'attention',
                category: 'connection',
                title: 'Proxy Detected',
                description: 'ProxyCheck service indicated an active proxy connection.'
              });
            }

            return {
              country: ipData.country || 'Unknown',
              region: ipData.region || 'Unknown',
              city: ipData.city || 'Unknown',
              network: ipData.organisation || 'Unknown',
              isp: ipData.provider || ipData.organisation || 'Unknown',
              asn: ipData.asn || 'Unknown',
              vpn_status: isVpn ? 'detected' : 'not_detected',
              proxy_status: isProxy ? 'detected' : 'not_detected',
              datacenter_status: 'unknown',
              evidence,
              limitations: [
                'IP geolocation is approximate and reflects network routing.',
                'ProxyCheck signals are indicators and not absolute proof of intent.'
              ],
              ip_masked: maskIp(ip)
            };
          }
        } catch (err) {
          console.warn('[IP Intelligence] ProxyCheck API query failed:', err);
        }
      }
    }

    // FALLBACK WHEN NO API KEY IS CONFIGURED:
    // Strictly follow rule:
    // "If a provider is not configured or cannot determine the result, display:
    //  VPN: Unknown, Proxy: Unknown, Datacenter: Unknown. Never manufacture results."
    let geoCountry = 'Unknown';
    let geoRegion = 'Unknown';
    let geoCity = 'Unknown';
    let geoIsp = 'Unknown ISP';
    let geoAsn = 'Unknown ASN';
    let geoOrg = 'Unknown Network';

    try {
      // Use public free geo lookup for approximate country/city/ASN without manufacturing VPN results
      const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city,isp,org,as`, {
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          geoCountry = data.country || 'Unknown';
          geoRegion = data.regionName || 'Unknown';
          geoCity = data.city || 'Unknown';
          geoIsp = data.isp || 'Unknown ISP';
          geoOrg = data.org || data.isp || 'Unknown Network';
          geoAsn = data.as ? data.as.split(' ')[0] : 'Unknown ASN';
        }
      }
    } catch {
      // network timeout or offline
    }

    const evidence: SignalEvidence[] = [];
    if (geoCountry !== 'Unknown') {
      evidence.push({
        type: 'normal',
        category: 'connection',
        title: 'Connection Location Identified',
        description: `Connection appears to originate from ${geoCity !== 'Unknown' ? geoCity + ', ' : ''}${geoCountry}.`
      });
    } else {
      evidence.push({
        type: 'unavailable',
        category: 'connection',
        title: 'Insufficient Connection Information',
        description: 'Unable to conclusively determine public network location for this IP.'
      });
    }

    evidence.push({
      type: 'unavailable',
      category: 'connection',
      title: 'VPN & Proxy Status Unknown',
      description: 'No commercial IP intelligence provider API key is configured in the environment. Results are strictly reported as Unknown.'
    });

    return {
      country: geoCountry,
      region: geoRegion,
      city: geoCity,
      network: geoOrg,
      isp: geoIsp,
      asn: geoAsn,
      vpn_status: 'unknown',
      proxy_status: 'unknown',
      datacenter_status: 'unknown',
      evidence,
      limitations: [
        'IP geolocation is approximate and reflects network routing rather than a physical address.',
        'VPN, Proxy, and Datacenter statuses are recorded as Unknown because IP_INTELLIGENCE_API_KEY is not configured in this environment.',
        'VerifyLink never manufactures or guesses security signals when data is unavailable.'
      ],
      ip_masked: maskIp(ip)
    };
  }
}

export const ipIntelligenceService = new BaseIntelligenceProvider();
