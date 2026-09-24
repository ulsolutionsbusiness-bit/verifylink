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
  vpn_explanation?: string;
  proxy_explanation?: string;
  datacenter_explanation?: string;
  provider_name: string;
  connection_type?: string;
  evidence: SignalEvidence[];
  limitations: string[];
  ip_masked: string;
}

export interface IpIntelligenceProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  lookup(ip: string): Promise<IpIntelligenceOutput>;
}

export function maskIp(ip: string): string {
  if (!ip) return 'Unknown';
  const cleanIp = ip.replace(/^::ffff:/, '').trim();
  if (cleanIp.includes(':')) {
    // IPv6
    const parts = cleanIp.split(':');
    return parts.slice(0, 3).join(':') + ':****:****:****';
  }
  // IPv4
  const parts = cleanIp.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return '***.***.***';
}

export function formatCountryName(codeOrName?: string): string {
  if (!codeOrName || codeOrName === 'Unavailable' || codeOrName === 'Unknown') return 'Unavailable';
  const trimmed = codeOrName.trim();
  if (trimmed.length === 2) {
    try {
      const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
      const fullName = regionNames.of(trimmed.toUpperCase());
      if (fullName) return fullName;
    } catch {
      // fallback if Intl lookup fails
    }
  }
  return trimmed;
}

export function parseAsnAndIsp(org?: string): { asn: string; isp: string; network: string } {
  if (!org || org === 'Unavailable' || org === 'Unknown') {
    return { asn: 'Unavailable', isp: 'Unavailable', network: 'Unavailable' };
  }
  const clean = org.trim();
  const match = clean.match(/^(AS\d+)\s*(.*)$/i);
  if (match) {
    const asn = match[1].toUpperCase();
    const cleanIsp = match[2].trim() || clean;
    return { asn, isp: cleanIsp, network: cleanIsp };
  }
  return { asn: 'Unavailable', isp: clean, network: clean };
}

export function extractCleanIp(rawIp: string): string {
  if (!rawIp) return '';
  let ip = rawIp.trim();
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }
  ip = ip.replace(/^::ffff:/i, '').trim();
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(ip)) {
    ip = ip.split(':')[0].trim();
  } else if (/^\[([a-fA-F0-9:]+)\]:\d+$/.test(ip)) {
    const match = ip.match(/^\[([a-fA-F0-9:]+)\]:\d+$/);
    if (match) ip = match[1];
  }
  return ip;
}

function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return true;
  const clean = extractCleanIp(ip);
  return (
    clean === '::1' ||
    clean === '127.0.0.1' ||
    clean === '0.0.0.0' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    clean.startsWith('169.254.') ||
    clean.startsWith('fc00:') ||
    clean.startsWith('fe80:') ||
    clean === 'localhost' ||
    (clean.startsWith('172.') &&
      parseInt(clean.split('.')[1] || '0', 10) >= 16 &&
      parseInt(clean.split('.')[1] || '0', 10) <= 31)
  );
}

// -------------------------------------------------------------
// Provider: IPinfo (https://ipinfo.io)
// -------------------------------------------------------------
class IpinfoProvider implements IpIntelligenceProvider {
  readonly id = 'ipinfo';
  readonly name = 'IPinfo Commercial Intelligence';

  isConfigured(): boolean {
    const key = process.env.IP_INTELLIGENCE_API_KEY?.trim();
    return Boolean(key);
  }

  async lookup(ip: string): Promise<IpIntelligenceOutput> {
    const key = process.env.IP_INTELLIGENCE_API_KEY!.trim();
    const cleanIp = extractCleanIp(ip);
    const url = `https://ipinfo.io/${encodeURIComponent(cleanIp)}?token=${encodeURIComponent(key)}`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      throw new Error(`IPinfo returned HTTP status ${res.status}`);
    }

    const data = await res.json();
    const privacy = data.privacy || {};

    const vpn: DetectionStatus =
      privacy.vpn !== undefined ? (privacy.vpn ? 'detected' : 'not_detected') : 'unknown';
    const proxy: DetectionStatus =
      privacy.proxy !== undefined ? (privacy.proxy ? 'detected' : 'not_detected') : 'unknown';
    const datacenter: DetectionStatus =
      privacy.hosting !== undefined ? (privacy.hosting ? 'detected' : 'not_detected') : 'unknown';

    let connType = 'Standard IP Routing';
    if (datacenter === 'detected') connType = 'Datacenter / Hosting Infrastructure';
    else if (privacy.relay) connType = 'Relay Network';
    else if (privacy.tor) connType = 'Tor Exit Node';

    const evidence: SignalEvidence[] = [];

    const country = formatCountryName(data.country);
    const region = data.region || 'Unavailable';
    const city = data.city || 'Unavailable';
    const { asn, isp, network } = parseAsnAndIsp(data.org);

    if (country && country !== 'Unavailable') {
      const locationParts: string[] = [];
      if (city && city !== 'Unavailable' && city !== 'Unknown') locationParts.push(city);
      if (region && region !== 'Unavailable' && region !== 'Unknown' && region !== city) locationParts.push(region);
      if (country && country !== 'Unavailable' && country !== 'Unknown') locationParts.push(country);
      const approxLocation = locationParts.length > 0 ? locationParts.join(', ') : country;

      evidence.push({
        type: 'normal',
        category: 'connection',
        title: 'Approximate Network Location',
        description: `Connection independently observed from ${approxLocation}. Approximate network routing estimate only. IP-derived location does not represent GPS or physical presence.`
      });
    }

    if (vpn === 'detected') {
      evidence.push({
        type: 'attention',
        category: 'connection',
        title: 'VPN Indicator Detected',
        description: 'IP intelligence provider identified this connection address as belonging to an active commercial VPN service.'
      });
    }

    if (proxy === 'detected') {
      evidence.push({
        type: 'attention',
        category: 'connection',
        title: 'Proxy Indicator Detected',
        description: 'Network connection indicates an intermediate proxy routing layer.'
      });
    }

    if (datacenter === 'detected') {
      evidence.push({
        type: 'attention',
        category: 'connection',
        title: 'Datacenter / Hosting IP Detected',
        description: 'Connection originates from a cloud host, datacenter, or colocation facility rather than a residential ISP.'
      });
    }

    return {
      country,
      region,
      city,
      network,
      isp,
      asn,
      vpn_status: vpn,
      proxy_status: proxy,
      datacenter_status: datacenter,
      vpn_explanation:
        vpn === 'detected'
          ? 'Commercial VPN provider infrastructure detected by IPinfo.'
          : vpn === 'not_detected'
          ? 'No commercial VPN signatures detected for this IP address.'
          : 'VPN status could not be conclusively determined.',
      proxy_explanation:
        proxy === 'detected'
          ? 'Proxy server detected by IPinfo.'
          : proxy === 'not_detected'
          ? 'No proxy signatures detected.'
          : 'Proxy status could not be determined.',
      datacenter_explanation:
        datacenter === 'detected'
          ? 'Datacenter / hosting IP detected by IPinfo.'
          : datacenter === 'not_detected'
          ? 'Residential or standard ISP connection.'
          : 'Hosting status unknown.',
      provider_name: this.name,
      connection_type: connType,
      evidence,
      limitations: [
        'VPN and proxy detection relies on commercial databases and may produce false positives or false negatives.'
      ],
      ip_masked: maskIp(cleanIp)
    };
  }
}

// -------------------------------------------------------------
// Provider: ProxyCheck.io (https://proxycheck.io)
// -------------------------------------------------------------
class ProxyCheckProvider implements IpIntelligenceProvider {
  readonly id = 'proxycheck';
  readonly name = 'ProxyCheck.io Intelligence';

  isConfigured(): boolean {
    const key = process.env.IP_INTELLIGENCE_API_KEY?.trim();
    return Boolean(key);
  }

  async lookup(ip: string): Promise<IpIntelligenceOutput> {
    const key = process.env.IP_INTELLIGENCE_API_KEY!.trim();
    const res = await fetch(`https://proxycheck.io/v2/${encodeURIComponent(ip)}?key=${encodeURIComponent(key)}&vpn=1&asn=1`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      throw new Error(`ProxyCheck returned HTTP status ${res.status}`);
    }

    const data = await res.json();
    const ipData = data[ip] || {};
    const isProxy = ipData.proxy === 'yes';
    const isVpn = ipData.type === 'VPN';

    const evidence: SignalEvidence[] = [
      {
        type: 'normal',
        category: 'connection',
        title: 'Observed Network Region',
        description: `Connection observed from ${ipData.city ? ipData.city + ', ' : ''}${ipData.country || 'Unavailable'}. Approximate network routing estimate only.`
      }
    ];

    if (isVpn) {
      evidence.push({
        type: 'attention',
        category: 'connection',
        title: 'VPN Indicator Detected',
        description: 'ProxyCheck service indicated an active commercial VPN connection.'
      });
    }

    if (isProxy) {
      evidence.push({
        type: 'attention',
        category: 'connection',
        title: 'Proxy Indicator Detected',
        description: 'ProxyCheck service indicated an active proxy connection.'
      });
    }

    return {
      country: formatCountryName(ipData.country),
      region: ipData.region || 'Unavailable',
      city: ipData.city || 'Unavailable',
      network: ipData.organisation || 'Unavailable',
      isp: ipData.provider || ipData.organisation || 'Unavailable',
      asn: ipData.asn || 'Unavailable',
      vpn_status: isVpn ? 'detected' : 'not_detected',
      proxy_status: isProxy ? 'detected' : 'not_detected',
      datacenter_status: 'unknown',
      vpn_explanation: isVpn
        ? 'VPN service detected by ProxyCheck.io.'
        : 'No VPN detected by ProxyCheck.io.',
      proxy_explanation: isProxy
        ? 'Proxy detected by ProxyCheck.io.'
        : 'No proxy detected by ProxyCheck.io.',
      datacenter_explanation: 'Datacenter classification not evaluated by ProxyCheck.io standard tier.',
      provider_name: this.name,
      connection_type: isVpn ? 'VPN Connection' : isProxy ? 'Proxy Connection' : 'Standard IP Routing',
      evidence,
      limitations: [
        'Network location is an approximate estimate derived from IP routing and is not GPS or proof of physical presence.',
        'ProxyCheck signals are technical indicators and not proof of criminal intent.'
      ],
      ip_masked: maskIp(ip)
    };
  }
}

// -------------------------------------------------------------
// Provider: IPData (https://ipdata.co)
// -------------------------------------------------------------
class IpdataProvider implements IpIntelligenceProvider {
  readonly id = 'ipdata';
  readonly name = 'IPData Intelligence';

  isConfigured(): boolean {
    const key = process.env.IP_INTELLIGENCE_API_KEY?.trim();
    return Boolean(key);
  }

  async lookup(ip: string): Promise<IpIntelligenceOutput> {
    const key = process.env.IP_INTELLIGENCE_API_KEY!.trim();
    const res = await fetch(`https://api.ipdata.co/${encodeURIComponent(ip)}?api-key=${encodeURIComponent(key)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      throw new Error(`IPData returned HTTP status ${res.status}`);
    }

    const data = await res.json();
    const threat = data.threat || {};
    const vpn: DetectionStatus = threat.is_vpn !== undefined ? (threat.is_vpn ? 'detected' : 'not_detected') : 'unknown';
    const proxy: DetectionStatus = threat.is_proxy !== undefined ? (threat.is_proxy ? 'detected' : 'not_detected') : 'unknown';
    const datacenter: DetectionStatus = threat.is_datacenter !== undefined ? (threat.is_datacenter ? 'detected' : 'not_detected') : 'unknown';

    const evidence: SignalEvidence[] = [
      {
        type: 'normal',
        category: 'connection',
        title: 'Observed Network Region',
        description: `Connection observed from ${data.city ? data.city + ', ' : ''}${data.region ? data.region + ', ' : ''}${data.country_name || 'Unavailable'}. Approximate network routing estimate only.`
      }
    ];

    if (vpn === 'detected') {
      evidence.push({
        type: 'attention',
        category: 'connection',
        title: 'VPN Indicator Detected',
        description: 'IPData threat feed identified this address as an active VPN.'
      });
    }

    if (proxy === 'detected') {
      evidence.push({
        type: 'attention',
        category: 'connection',
        title: 'Proxy Indicator Detected',
        description: 'IPData threat feed identified this address as an active proxy.'
      });
    }

    return {
      country: data.country_name || 'Unavailable',
      region: data.region || 'Unavailable',
      city: data.city || 'Unavailable',
      network: data.asn?.name || data.organisation || 'Unavailable',
      isp: data.asn?.name || data.organisation || 'Unavailable',
      asn: data.asn?.asn ? `AS${data.asn.asn}` : 'Unavailable',
      vpn_status: vpn,
      proxy_status: proxy,
      datacenter_status: datacenter,
      vpn_explanation: vpn === 'detected' ? 'VPN detected by IPData threat feed.' : 'No VPN detected by IPData.',
      proxy_explanation: proxy === 'detected' ? 'Proxy detected by IPData threat feed.' : 'No proxy detected by IPData.',
      datacenter_explanation: datacenter === 'detected' ? 'Datacenter host identified by IPData.' : 'Residential/Standard ISP.',
      provider_name: this.name,
      connection_type: datacenter === 'detected' ? 'Datacenter / Hosting' : 'Standard IP Routing',
      evidence,
      limitations: [
        'Network location is an approximate estimate derived from IP routing and is not GPS or proof of physical presence.',
        'VPN/Proxy detection is based on commercial IP database heuristics and may yield false positives or false negatives.'
      ],
      ip_masked: maskIp(ip)
    };
  }
}

// -------------------------------------------------------------
// Provider: IPQualityScore (https://ipqualityscore.com)
// -------------------------------------------------------------
class IpQualityScoreProvider implements IpIntelligenceProvider {
  readonly id = 'ipqualityscore';
  readonly name = 'IPQualityScore Intelligence';

  isConfigured(): boolean {
    const key = process.env.IP_INTELLIGENCE_API_KEY?.trim();
    return Boolean(key);
  }

  async lookup(ip: string): Promise<IpIntelligenceOutput> {
    const key = process.env.IP_INTELLIGENCE_API_KEY!.trim();
    const res = await fetch(`https://ipqualityscore.com/api/json/ip/${encodeURIComponent(key)}/${encodeURIComponent(ip)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) {
      throw new Error(`IPQualityScore returned HTTP status ${res.status}`);
    }

    const data = await res.json();
    if (data.success === false) {
      throw new Error(`IPQualityScore error: ${data.message || 'API error'}`);
    }

    const vpn: DetectionStatus = data.vpn !== undefined ? (data.vpn ? 'detected' : 'not_detected') : 'unknown';
    const proxy: DetectionStatus = data.proxy !== undefined ? (data.proxy ? 'detected' : 'not_detected') : 'unknown';
    const datacenter: DetectionStatus = data.active_vpn !== undefined && data.is_crawler ? 'detected' : 'unknown';

    const evidence: SignalEvidence[] = [
      {
        type: 'normal',
        category: 'connection',
        title: 'Observed Network Region',
        description: `Connection observed from ${data.city ? data.city + ', ' : ''}${data.region ? data.region + ', ' : ''}${data.country_code || 'Unavailable'}. Approximate network routing estimate only.`
      }
    ];

    if (vpn === 'detected') {
      evidence.push({
        type: 'attention',
        category: 'connection',
        title: 'VPN Indicator Detected',
        description: 'IPQualityScore identified this IP as an active VPN service.'
      });
    }

    if (proxy === 'detected') {
      evidence.push({
        type: 'attention',
        category: 'connection',
        title: 'Proxy Indicator Detected',
        description: 'IPQualityScore identified this IP as an active proxy.'
      });
    }

    return {
      country: formatCountryName(data.country_code),
      region: data.region || 'Unavailable',
      city: data.city || 'Unavailable',
      network: data.organization || data.ISP || 'Unavailable',
      isp: data.ISP || data.organization || 'Unavailable',
      asn: data.ASN ? `AS${data.ASN}` : 'Unavailable',
      vpn_status: vpn,
      proxy_status: proxy,
      datacenter_status: datacenter,
      vpn_explanation: vpn === 'detected' ? 'VPN detected by IPQualityScore.' : 'No VPN detected by IPQualityScore.',
      proxy_explanation: proxy === 'detected' ? 'Proxy detected by IPQualityScore.' : 'No proxy detected by IPQualityScore.',
      datacenter_explanation: 'Datacenter status unknown or unclassified.',
      provider_name: this.name,
      connection_type: data.connection_type || 'Standard IP Routing',
      evidence,
      limitations: [
        'Network location is an approximate estimate derived from IP routing and is not GPS or proof of physical presence.',
        'Technical signals are for informational review and do not constitute legal or fraud determinations.'
      ],
      ip_masked: maskIp(ip)
    };
  }
}

// -------------------------------------------------------------
// Composite IP Intelligence Service
// -------------------------------------------------------------
export class CompositeIpIntelligenceService {
  private providers: Map<string, IpIntelligenceProvider> = new Map();

  constructor() {
    this.registerProvider(new IpinfoProvider());
    this.registerProvider(new ProxyCheckProvider());
    this.registerProvider(new IpdataProvider());
    this.registerProvider(new IpQualityScoreProvider());
  }

  public registerProvider(provider: IpIntelligenceProvider) {
    this.providers.set(provider.id.toLowerCase(), provider);
  }

  public isConfigured(): boolean {
    const activeId = (process.env.IP_INTELLIGENCE_PROVIDER || 'ipinfo').toLowerCase();
    const provider = this.providers.get(activeId) || this.providers.get('ipinfo');
    return provider ? provider.isConfigured() : false;
  }

  public getActiveProviderName(): string {
    const activeId = (process.env.IP_INTELLIGENCE_PROVIDER || 'ipinfo').toLowerCase();
    const provider = this.providers.get(activeId) || this.providers.get('ipinfo');
    return provider ? provider.name : 'Unconfigured Provider';
  }

  public async lookup(ip: string): Promise<IpIntelligenceOutput> {
    const cleanIp = extractCleanIp(ip);

    // 1. Private / Loopback addresses (development sandbox, local testing)
    if (isPrivateOrLocalIp(cleanIp)) {
      return {
        country: 'Cloud Container / Local Network',
        region: 'Internal Network',
        city: 'Local Host',
        network: 'Development Sandbox',
        isp: 'Internal Container Network',
        asn: 'AS-LOCAL',
        vpn_status: 'unknown',
        proxy_status: 'unknown',
        datacenter_status: 'not_detected',
        vpn_explanation: 'VPN status is Unknown. Connection originated from an internal/local container network.',
        proxy_explanation: 'Proxy status is Unknown for internal loopback/sandbox traffic.',
        datacenter_explanation: 'Internal sandbox environment.',
        provider_name: 'Local Container Diagnostic',
        connection_type: 'Internal Loopback / Container Sandbox',
        evidence: [
          {
            type: 'normal',
            category: 'connection',
            title: 'Internal Sandbox Connection',
            description: 'Connection verified through local development container interface.'
          }
        ],
        limitations: [
          'The client connected via a local or internal loopback address. Detailed public ISP intelligence is not applicable for loopback addresses.',
          'VPN and proxy detection statuses are reported as Unknown for local/internal test traffic.',
          'Network location is an approximate estimate derived from IP routing and is not GPS or proof of physical presence.'
        ],
        ip_masked: maskIp(cleanIp)
      };
    }

    // 2. Commercial Provider Selection (when configured)
    const activeId = (process.env.IP_INTELLIGENCE_PROVIDER || 'ipinfo').toLowerCase();
    const provider = this.providers.get(activeId) || this.providers.get('ipinfo');

    if (provider && provider.isConfigured()) {
      try {
        return await provider.lookup(cleanIp);
      } catch (err: any) {
        console.warn(`[IP Intelligence] Active provider (${provider.name}) failed, falling back to public network lookup:`, err.message || err);
      }
    }

    // 3. Fallback when active provider failed or was not configured:
    // Performs network lookup solely for approximate location, ISP, and ASN
    // Security statuses (VPN/Proxy/Datacenter) strictly remain 'unknown' with clear, honest explanations
    let geoCountry = 'Unavailable';
    let geoRegion = 'Unavailable';
    let geoCity = 'Unavailable';
    let geoIsp = 'Unavailable';
    let geoAsn = 'Unavailable';
    let geoOrg = 'Unavailable';

    // Tier 1 Fallback: ipwho.is (HTTPS, cloud-compatible, rich ISP & ASN details)
    try {
      const res = await fetch(`https://ipwho.is/${encodeURIComponent(cleanIp)}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success !== false && (data.country || data.country_code)) {
          geoCountry = formatCountryName(data.country || data.country_code);
          geoRegion = data.region || 'Unavailable';
          geoCity = data.city || 'Unavailable';
          geoIsp = data.connection?.org || data.connection?.isp || 'Unavailable';
          geoOrg = data.connection?.org || data.connection?.isp || 'Unavailable';
          if (data.connection?.asn) {
            const rawAsn = String(data.connection.asn).trim();
            geoAsn = rawAsn.toUpperCase().startsWith('AS') ? rawAsn.toUpperCase() : `AS${rawAsn}`;
          }
        }
      }
    } catch {
      // ipwho.is timed out or offline, try next fallback
    }

    // Tier 2 Fallback: ipapi.co (HTTPS fallback)
    if (geoCountry === 'Unavailable') {
      try {
        const res = await fetch(`https://ipapi.co/${encodeURIComponent(cleanIp)}/json/`, {
          headers: { 'User-Agent': 'nodejs-ip-lookup', Accept: 'application/json' },
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          const data = await res.json();
          if ((data.country_name || data.country_code) && !data.error) {
            geoCountry = formatCountryName(data.country_name || data.country_code);
            geoRegion = data.region || 'Unavailable';
            geoCity = data.city || 'Unavailable';
            geoIsp = data.org || data.asn || 'Unavailable';
            geoOrg = data.org || 'Unavailable';
            if (data.asn) {
              const rawAsn = String(data.asn).trim();
              geoAsn = rawAsn.toUpperCase().startsWith('AS') ? rawAsn.toUpperCase() : `AS${rawAsn}`;
            }
          }
        }
      } catch {
        // ipapi.co timed out or offline, try next fallback
      }
    }

    // Tier 3 Fallback: ip-api.com (HTTP fallback)
    if (geoCountry === 'Unavailable') {
      try {
        const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(cleanIp)}?fields=status,message,country,regionName,city,isp,org,as`, {
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            geoCountry = formatCountryName(data.country);
            geoRegion = data.regionName || 'Unavailable';
            geoCity = data.city || 'Unavailable';
            geoIsp = data.org || data.isp || 'Unavailable';
            geoOrg = data.org || data.isp || 'Unavailable';
            geoAsn = data.as ? data.as.split(' ')[0] : 'Unavailable';
          }
        }
      } catch {
        // network timeout or offline
      }
    }

    const evidence: SignalEvidence[] = [];

    if (geoCountry !== 'Unavailable') {
      const locationParts: string[] = [];
      if (geoCity && geoCity !== 'Unavailable' && geoCity !== 'Unknown') {
        locationParts.push(geoCity);
      }
      if (geoRegion && geoRegion !== 'Unavailable' && geoRegion !== 'Unknown' && geoRegion !== geoCity) {
        locationParts.push(geoRegion);
      }
      if (geoCountry && geoCountry !== 'Unavailable' && geoCountry !== 'Unknown') {
        locationParts.push(geoCountry);
      }
      const approxLocation = locationParts.length > 0 ? locationParts.join(', ') : geoCountry;

      evidence.push({
        type: 'normal',
        category: 'connection',
        title: 'Approximate Network Location',
        description: `Connection observed from ${approxLocation}. Approximate network routing estimate only. IP-derived location does not represent GPS, a physical street address, or exact physical presence.`
      });
    } else {
      evidence.push({
        type: 'unavailable',
        category: 'connection',
        title: 'Approximate Network Location Unavailable',
        description: 'Unable to conclusively determine public network location for this connection.'
      });
    }

    // Explicit explanation that VPN/Proxy detection is Unknown because no provider API key is configured
    evidence.push({
      type: 'unavailable',
      category: 'connection',
      title: 'VPN & Proxy Status: Unknown',
      description: 'No commercial IP intelligence provider API key (e.g. IPinfo, ProxyCheck, IPData, IPQualityScore) is configured. VerifyLink does not guess or fake security signals.'
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
      vpn_explanation: 'VPN status is Unknown. An external IP intelligence provider API key is not configured in this deployment.',
      proxy_explanation: 'Proxy status is Unknown. No commercial IP intelligence provider is configured.',
      datacenter_explanation: 'Datacenter status is Unknown. No commercial IP intelligence provider is configured.',
      provider_name: 'Public Geo Fallback (Unconfigured Provider)',
      connection_type: 'Standard IP Routing',
      evidence,
      limitations: [
        'Network location is an approximate estimate derived from IP routing and is not GPS, physical presence, or a street address.',
        'VPN, Proxy, and Datacenter statuses are recorded as Unknown because IP_INTELLIGENCE_API_KEY is not configured in this environment.',
        'VerifyLink never manufactures, guesses, or fakes detection results when intelligence data is unavailable.',
        'Technical signals are for informational review and do not constitute a fraud, scam, or criminal determination.'
      ],
      ip_masked: maskIp(cleanIp)
    };
  }
}

export const ipIntelligenceService = new CompositeIpIntelligenceService();
