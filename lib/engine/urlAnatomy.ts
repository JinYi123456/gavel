// Link and QR-destination anatomy — entirely offline. Nothing here fetches,
// pings or resolves anything the message asked us to visit; the court reads
// the address the way a forensic examiner reads handwriting: shape, ownership,
// and every place where the shape impersonates someone.

import { HOST_ALIASES, isOfficialDomain, brandForRegistrableDomain, type BrandRecord } from "./kb/brands.ts";

export interface UrlEvidence {
  id: string;
  title: string;
  detail: string;
  severity: number;
}

export interface UrlReport {
  url: string;
  host: string;
  registrable: string;
  scheme: string;
  isOfficial: boolean;
  officialBrand?: string;
  evidence: UrlEvidence[];
  score: number;
}

export interface UrlAnalysis {
  reports: UrlReport[];
  anyOfficial: boolean;
  officialBrands: BrandRecord[];
  maxScore: number;
}

const MULTI_SUFFIXES = new Set([
  "com.my", "net.my", "org.my", "gov.my", "edu.my", "co.uk", "org.uk", "ac.uk",
  "com.sg", "edu.sg", "gov.sg", "com.au", "co.id", "com.ph", "co.th", "in.th",
  "com.hk", "com.tw", "co.in", "com.br", "com.cn", "co.jp", "com.vn",
]);

const TIER1_TLDS = new Set([
  "top", "xyz", "icu", "click", "link", "live", "online", "site", "website",
  "shop", "work", "rest", "fit", "cfd", "sbs", "cyou", "lol", "mom", "bond",
  "quest", "monster", "buzz", "bar", "best", "loan", "men", "tk", "ml", "ga",
  "cf", "gq", "zip", "mov",
]);
const TIER2_TLDS = new Set([
  "info", "biz", "club", "vip", "win", "download", "stream", "review",
  "country", "kim", "party", "gdn", "camera", "science", "cc", "ru", "cn", "su",
]);

const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "shorturl.at", "rb.gy",
  "cutt.ly", "s.id", "ow.ly", "buff.ly", "rebrand.ly", "tiny.cc", "shrtco.de",
  "shorturl.gg", "bl.ink",
]);

const PATH_KEYWORDS =
  /(login|signin|sign-in|verify|secure|account|update|confirm|otp|tac|wallet|unlock|reactivate|suspend|rebate|refund|claim|prize|gift|bonus|redeem|payment|pay|free)/gi;

const CONFUSABLES: Record<string, string> = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y",
  "і": "i", "ѕ": "s", "ј": "j", "ԁ": "d", "һ": "h", "ӏ": "l",
  "ο": "o", "ν": "v", "α": "a", "ε": "e", "ρ": "p", "τ": "t", "υ": "u",
  "ι": "i", "κ": "k", "μ": "m", "η": "n",
};

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"'()\[\]{}]+/gi;
const TRAILING_JUNK = /[.,;:!?)\]}"'…]+$/;

export function registrableDomain(host: string): string {
  const labels = host.split(".").filter(Boolean);
  if (labels.length <= 2) return host;
  const last2 = labels.slice(-2).join(".");
  if (MULTI_SUFFIXES.has(last2) && labels.length >= 3) return labels.slice(-3).join(".");
  return last2;
}

export function extractUrls(text: string): string[] {
  const found = text.match(URL_RE) ?? [];
  const cleaned = found.map((u) => u.replace(TRAILING_JUNK, ""));
  return [...new Set(cleaned)];
}

function parse(url: string): URL | null {
  const candidate = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

function noisyOr(severities: number[]): number {
  let keep = 1;
  for (const s of severities) keep *= 1 - s;
  return 1 - keep;
}

export function analyzeUrl(rawUrl: string): UrlReport {
  const url = parse(rawUrl);
  if (!url) {
    return {
      url: rawUrl,
      host: rawUrl,
      registrable: rawUrl,
      scheme: "?",
      isOfficial: false,
      evidence: [
        {
          id: "U-UNPARSEABLE",
          title: "Not a parseable address",
          detail: "This is not a normal web address; it cannot be read or trusted.",
          severity: 0.4,
        },
      ],
      score: 0.4,
    };
  }

  const host = url.hostname.toLowerCase();
  const registrable = registrableDomain(host);
  const evidence: UrlEvidence[] = [];
  const isIpv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
  const isIpv6 = host.startsWith("[");
  const official = isOfficialDomain(registrable) && !isIpv4 && !isIpv6;
  const officialBrand = official ? brandForRegistrableDomain(registrable) : undefined;

  if (!official) {
    if (isIpv4 || isIpv6) {
      evidence.push({
        id: "U-IP",
        title: "A bare IP address instead of a name",
        detail: "Real services use domain names. A link to a raw IP address is hiding who owns it.",
        severity: 0.5,
      });
    }
    if (/xn--/.test(host) || /[^\u0000-\u007F]/.test(host)) {
      const confusables = [...host].filter((ch) => CONFUSABLES[ch]);
      evidence.push({
        id: "U-IDN",
        title: "A disguised internationalised hostname",
        detail:
          confusables.length > 0
            ? `The address uses look-alike characters (${confusables.join(" ")}) that render like ordinary letters — a homoglyph trick.`
            : "The address uses internationalised (punycode) characters, a common trick to imitate a brand name.",
        severity: 0.5,
      });
    }
    if (url.username !== "") {
      evidence.push({
        id: "U-CRED",
        title: "Credentials embedded in the link",
        detail: "Everything before the @ is decoration — the real destination is what follows it.",
        severity: 0.45,
      });
    }
    if (url.port !== "" && url.port !== "80" && url.port !== "443") {
      evidence.push({
        id: "U-PORT",
        title: `Unusual port (${url.port})`,
        detail: "Services on non-standard ports are typical of temporary scam infrastructure.",
        severity: 0.2,
      });
    }
    const labels = host.split(".").length;
    if (labels >= 5) {
      evidence.push({
        id: "U-DEEP",
        title: "Very deep subdomain chain",
        detail: `${labels} labels deep — long chains are used to bury the real domain at the end.`,
        severity: 0.25,
      });
    } else if (labels >= 4) {
      evidence.push({
        id: "U-DEEP",
        title: "Deep subdomain chain",
        detail: `${labels} labels deep — deep chains make the true owner hard to spot.`,
        severity: 0.15,
      });
    }
    const hyphens = (host.match(/-/g) ?? []).length;
    if (hyphens >= 4) {
      evidence.push({
        id: "U-HYPHEN",
        title: "Heavily hyphenated hostname",
        detail: `${hyphens} hyphens — the standard way to staple a brand name onto a cheap domain.`,
        severity: 0.3,
      });
    } else if (hyphens >= 2) {
      evidence.push({
        id: "U-HYPHEN",
        title: "Hyphenated hostname",
        detail: `${hyphens} hyphens in the host — commonly used to stitch brand words onto unknown domains.`,
        severity: 0.15,
      });
    }
    const tld = host.split(".").pop() ?? "";
    if (TIER1_TLDS.has(tld)) {
      evidence.push({
        id: "U-TLD",
        title: `Bargain-bin domain suffix (.${tld})`,
        detail: `.${tld} is a cheap bulk-registration suffix with a very high share of phishing infrastructure.`,
        severity: 0.35,
      });
    } else if (TIER2_TLDS.has(tld)) {
      evidence.push({
        id: "U-TLD",
        title: `Abused domain suffix (.${tld})`,
        detail: `.${tld} is a low-cost suffix with a high share of phishing; legitimate use exists, so this is a hint, not proof.`,
        severity: 0.2,
      });
    }
    if (SHORTENERS.has(host)) {
      evidence.push({
        id: "U-SHORT",
        title: "Shortened link",
        detail: "The link is a redirect service: the destination is hidden from you until you click.",
        severity: 0.3,
      });
    }
    // brand squatting: a known brand word inside the host, on a domain the brand does not own
    for (const { alias, brand } of HOST_ALIASES) {
      const re = new RegExp(`(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`);
      if (re.test(host)) {
        evidence.push({
          id: "U-SQUAT",
          title: `Uses "${brand.name}" in its address`,
          detail: `${brand.name}'s verified domains are ${brand.domains.join(", ")} — not ${registrable}. The name is borrowed, the domain is not.`,
          severity: 0.6,
        });
        break;
      }
    }
    const kw = (url.pathname + url.search).match(PATH_KEYWORDS) ?? [];
    const uniqueKw = [...new Set(kw.map((k) => k.toLowerCase()))];
    if (uniqueKw.length >= 3) {
      evidence.push({
        id: "U-PATHKW",
        title: "Loaded with account-action words",
        detail: `The path packs "${uniqueKw.join(", ")}" — a page engineered to look like an account gateway.`,
        severity: 0.25,
      });
    } else if (uniqueKw.length >= 1) {
      evidence.push({
        id: "U-PATHKW",
        title: "Account-action words in the path",
        detail: `The path contains "${uniqueKw.join(", ")}".`,
        severity: 0.12,
      });
    }
    if (/\.(apk|exe|scr|msi|vbs|bat)(\?|#|$)/i.test(url.pathname)) {
      evidence.push({
        id: "U-EXT",
        title: "Downloads a program",
        detail: "A message that wants you to download and install a file is delivering software, not a service.",
        severity: 0.5,
      });
    }
    if (rawUrl.length > 120) {
      evidence.push({
        id: "U-LONG",
        title: "Unusually long link",
        detail: `${rawUrl.length} characters — length is used to bury the true destination.`,
        severity: 0.1,
      });
    }
  }

  if (url.protocol === "http:" && !official && !isIpv4 && !isIpv6) {
    evidence.push({
      id: "U-HTTP",
      title: "Unencrypted connection (http)",
      detail: "The page you would open is served without encryption.",
      severity: 0.1,
    });
  }

  const score = noisyOr(evidence.map((e) => e.severity));
  return { url: rawUrl, host, registrable, scheme: url.protocol.replace(":", ""), isOfficial: official, officialBrand, evidence, score };
}

export function analyzeUrls(text: string): UrlAnalysis {
  const reports = extractUrls(text).map(analyzeUrl);
  const officialBrands: BrandRecord[] = [];
  for (const r of reports) {
    if (r.isOfficial && r.officialBrand && !officialBrands.includes(r.officialBrand)) {
      officialBrands.push(r.officialBrand);
    }
  }
  return {
    reports,
    anyOfficial: officialBrands.length > 0,
    officialBrands,
    maxScore: reports.reduce((m, r) => Math.max(m, r.score), 0),
  };
}
