// The brand register. Kept in the product because two court decisions depend
// on it: a link on a brand's own verified domain is protective evidence
// ("this is genuinely from the courier"), and a brand's name inside a host
// that is NOT its verified domain is squatting evidence ("this only claims to
// be from the bank"). Domains are registrable domains, lowercase.

export interface BrandRecord {
  name: string;
  aliases: string[];
  domains: string[];
  category: "bank" | "ewallet" | "telco" | "courier" | "government" | "retail" | "tech" | "utility";
}

export const BRANDS: BrandRecord[] = [
  // ---- banks ----
  { name: "Maybank", aliases: ["maybank", "maybank2u", "mbb"], domains: ["maybank2u.com.my", "maybank.com.my", "maybank.com"], category: "bank" },
  { name: "CIMB", aliases: ["cimb", "cimb clicks", "cimbclicks"], domains: ["cimb.com.my", "cimbclicks.com.my", "cimb.com"], category: "bank" },
  { name: "Public Bank", aliases: ["public bank", "pbe"], domains: ["pbebank.com", "publicbank.com.my"], category: "bank" },
  { name: "RHB Bank", aliases: ["rhb"], domains: ["rhbgroup.com", "rhb.com.my"], category: "bank" },
  { name: "Hong Leong Bank", aliases: ["hong leong"], domains: ["hlb.com.my"], category: "bank" },
  { name: "AmBank", aliases: ["ambank", "am bank"], domains: ["ambank.com.my", "ambankgroup.com"], category: "bank" },
  { name: "Bank Islam", aliases: ["bank islam"], domains: ["bankislam.com.my", "bankislam.com"], category: "bank" },
  { name: "BSN", aliases: ["bsn", "bank simpanan"], domains: ["bsn.com.my"], category: "bank" },
  { name: "Bank Rakyat", aliases: ["bank rakyat"], domains: ["bankrakyat.com.my"], category: "bank" },
  { name: "Affin Bank", aliases: ["affin"], domains: ["affinbank.com.my"], category: "bank" },
  { name: "Alliance Bank", aliases: ["alliance bank"], domains: ["alliancebank.com.my"], category: "bank" },
  { name: "MBSB Bank", aliases: ["mbsb"], domains: ["mbsbbank.com"], category: "bank" },
  { name: "OCBC", aliases: ["ocbc"], domains: ["ocbc.com.my", "ocbc.com"], category: "bank" },
  { name: "HSBC", aliases: ["hsbc"], domains: ["hsbc.com.my", "hsbc.com"], category: "bank" },
  { name: "Standard Chartered", aliases: ["standard chartered", "stanchart"], domains: ["sc.com.my", "sc.com"], category: "bank" },
  { name: "UOB", aliases: ["uob", "united overseas bank"], domains: ["uob.com.my", "uob.com"], category: "bank" },
  { name: "Bank Muamalat", aliases: ["muamalat"], domains: ["muamalat.com.my"], category: "bank" },
  { name: "Agrobank", aliases: ["agrobank"], domains: ["agrobank.com.my"], category: "bank" },

  // ---- e-wallets & payment ----
  { name: "Touch 'n Go eWallet", aliases: ["touch n go", "touch 'n go", "tng ewallet", "tng"], domains: ["tngdigital.com.my", "touchngo.com.my"], category: "ewallet" },
  { name: "Grab", aliases: ["grab", "grabfood"], domains: ["grab.com", "grab.com.my"], category: "ewallet" },
  { name: "Boost", aliases: ["boost"], domains: ["myboost.com.my"], category: "ewallet" },
  { name: "ShopeePay", aliases: ["shopeepay", "shopee pay"], domains: ["shopeepay.com.my"], category: "ewallet" },

  // ---- telcos ----
  { name: "Maxis", aliases: ["maxis"], domains: ["maxis.com.my"], category: "telco" },
  { name: "CelcomDigi", aliases: ["celcomdigi", "celcom", "digi"], domains: ["celcomdigi.com"], category: "telco" },
  { name: "U Mobile", aliases: ["u mobile", "umobile"], domains: ["u.com.my"], category: "telco" },
  { name: "Unifi", aliases: ["unifi", "tm point"], domains: ["unifi.com.my", "tm.com.my"], category: "telco" },

  // ---- couriers ----
  { name: "Pos Malaysia", aliases: ["pos malaysia", "poslaju", "pos laju", "pos"], domains: ["pos.com.my", "poslaju.com.my"], category: "courier" },
  { name: "J&T Express", aliases: ["j&t", "jnt", "jnt express"], domains: ["jtexpress.my"], category: "courier" },
  { name: "Ninja Van", aliases: ["ninja van", "ninjavan"], domains: ["ninjavan.co"], category: "courier" },
  { name: "DHL", aliases: ["dhl"], domains: ["dhl.com"], category: "courier" },
  { name: "GDEX", aliases: ["gdex"], domains: ["gdexpress.com"], category: "courier" },
  { name: "City-Link", aliases: ["citylink", "city-link"], domains: ["citylink.com.my"], category: "courier" },

  // ---- government ----
  { name: "LHDN (Inland Revenue)", aliases: ["lhdn", "hasil", "inland revenue"], domains: ["hasil.gov.my"], category: "government" },
  { name: "EPF (KWSP)", aliases: ["kwsp", "epf"], domains: ["kwsp.gov.my"], category: "government" },
  { name: "PDRM (Police)", aliases: ["pdrm", "royal malaysia police"], domains: ["rmp.gov.my"], category: "government" },
  { name: "JPJ", aliases: ["jpj"], domains: ["jpj.gov.my"], category: "government" },
  { name: "MyEG", aliases: ["myeg"], domains: ["myeg.com.my"], category: "government" },
  { name: "SSM", aliases: ["ssm", "companies commission"], domains: ["ssm.com.my"], category: "government" },

  // ---- utilities ----
  { name: "Tenaga Nasional", aliases: ["tnb", "tenaga nasional", "mytnb"], domains: ["tnb.com.my"], category: "utility" },
  { name: "Air Selangor", aliases: ["air selangor"], domains: ["airselangor.com"], category: "utility" },

  // ---- retail & tech ----
  { name: "Shopee", aliases: ["shopee"], domains: ["shopee.com.my", "shopee.com"], category: "retail" },
  { name: "Lazada", aliases: ["lazada"], domains: ["lazada.com.my", "lazada.com"], category: "retail" },
  { name: "Zalora", aliases: ["zalora"], domains: ["zalora.com.my"], category: "retail" },
  { name: "AirAsia", aliases: ["airasia"], domains: ["airasia.com"], category: "retail" },
  { name: "Apple", aliases: ["apple", "icloud"], domains: ["apple.com", "icloud.com"], category: "tech" },
  { name: "Google", aliases: ["google", "gmail"], domains: ["google.com"], category: "tech" },
  { name: "Microsoft", aliases: ["microsoft", "outlook", "hotmail"], domains: ["microsoft.com", "live.com", "outlook.com"], category: "tech" },
  { name: "Netflix", aliases: ["netflix"], domains: ["netflix.com"], category: "tech" },
  { name: "PayPal", aliases: ["paypal"], domains: ["paypal.com", "paypal.me"], category: "tech" },
  { name: "Amazon", aliases: ["amazon"], domains: ["amazon.com"], category: "tech" },
  { name: "WhatsApp", aliases: ["whatsapp"], domains: ["whatsapp.com"], category: "tech" },
  { name: "TikTok", aliases: ["tiktok"], domains: ["tiktok.com"], category: "tech" },
  { name: "Telegram", aliases: ["telegram"], domains: ["telegram.org", "t.me"], category: "tech" },
];

const officialDomains = new Set<string>();
const byDomain = new Map<string, BrandRecord>();
for (const brand of BRANDS) {
  for (const d of brand.domains) {
    officialDomains.add(d);
    byDomain.set(d, brand);
  }
}

export function isOfficialDomain(registrable: string): boolean {
  return officialDomains.has(registrable);
}

export function brandForRegistrableDomain(registrable: string): BrandRecord | undefined {
  return byDomain.get(registrable);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Compact aliases usable inside hostnames (no spaces): "public bank" -> "public-bank"
export const HOST_ALIASES: { alias: string; brand: BrandRecord }[] = [];
for (const brand of BRANDS) {
  for (const a of brand.aliases) {
    const compact = a.replace(/\s+/g, "-");
    if (compact.length >= 3 && /^[a-z0-9'&-]+$/.test(compact)) {
      HOST_ALIASES.push({ alias: compact, brand });
      if (compact.includes("-")) HOST_ALIASES.push({ alias: compact.replace(/-/g, ""), brand });
    }
  }
}

export function brandsMentioned(text: string): BrandRecord[] {
  const found = new Map<string, BrandRecord>();
  for (const brand of BRANDS) {
    for (const alias of brand.aliases) {
      const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(alias)}([^a-z0-9]|$)`, "i");
      if (re.test(text)) {
        found.set(brand.name, brand);
        break;
      }
    }
  }
  return [...found.values()];
}
