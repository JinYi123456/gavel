// The statute book. Every rule is a plain-language charge with the exact
// pattern it is looking for, so a match becomes an exhibit with a quote from
// the message itself — nothing the court says is unsourced.
//
// severity semantics: a rule's severity is its contribution to a noisy-OR
// (1 - product of (1 - severity)). Several individually weak glimpses of a
// scam add up; a single decisive rule (an OTP request, mule recruitment)
// floors the verdict on its own.
//
// protective rules are the other direction: evidence of legitimacy. Vetted by
// tests — a genuine bank notice must not be convicted for saying "never share
// this code with anyone".

export interface RuleRecord {
  id: string;
  category:
    | "credential"
    | "urgency"
    | "payment"
    | "prize"
    | "investment"
    | "job"
    | "impersonation"
    | "mule"
    | "loan"
    | "techsupport"
    | "pressure"
    | "protective";
  title: string;
  detail: string;
  patterns: string[];
  severity: number;
  decisive?: boolean;
  protective?: boolean;
}

export const RULES: RuleRecord[] = [
  // ---------------- credentials ----------------
  {
    id: "R-CRED-01",
    category: "credential",
    title: "Asks for your OTP / TAC / PIN",
    detail:
      "No bank, courier or government office in Malaysia ever asks you to share an OTP, TAC or PIN. An explicit request for one is the single strongest sign of a scam message.",
    patterns: [
      "\\b(otp|tac|one[-\\s]?time (password|code|pin)|security code|verification code|pin number|\\bpin\\b|password)\\b",
      "(?<!never )(?<!not )(?<!don't )(?<!don’t )(?<!do not )(?<!ask you to )\\b(send|share|sharing|shared|provide|providing|give|giving|key in|enter|entering|input|tell|reveal|forward)\\b",
    ],
    severity: 0.75,
    decisive: true,
  },
  {
    id: "R-CRED-02",
    category: "credential",
    title: "Mentions a six-digit code",
    detail:
      "Six-digit codes are OTPs. A message that talks about codes of that shape is either a bank notice (which will say not to share it) or a scam trying to harvest it.",
    patterns: ["\\b(6|six)[-\\s]?digit\\b", "\\b(code|otp|pin)\\b"],
    severity: 0.35,
  },

  // ---------------- account pressure ----------------
  {
    id: "R-ACC-01",
    category: "urgency",
    title: "Account is being blocked or suspended",
    detail:
      "Banks do not threaten to freeze an account by SMS. 'Blocked, frozen, suspended' plus a request to act is pressure language, not service language.",
    patterns: [
      "\\b(account|card|wallet|profile|access)\\b",
      "\\b(suspend(ed)?|block(ed)?|frozen|freeze|deactivat(e|ed)|restricted|locked|on hold|temporarily (closed|disabled))\\b",
    ],
    severity: 0.5,
  },
  {
    id: "R-ACC-02",
    category: "urgency",
    title: "Account blocked, and against the clock",
    detail:
      "The same block claim joined to a deadline ('within 24 hours', 'today') is engineered to stop you checking with the bank first.",
    patterns: [
      "\\b(account|card|wallet|profile|access)\\b",
      "\\b(suspend(ed)?|block(ed)?|frozen|freeze|deactivat(e|ed)|restricted|locked)\\b",
      "\\b(within \\d+ ?(hours?|days?)|immediately|today|right now|24 ?hours?)\\b",
    ],
    severity: 0.75,
  },
  {
    id: "R-ACC-03",
    category: "urgency",
    title: "Warning of unusual activity",
    detail:
      "A lone 'we noticed unusual activity' is a moderate signal — genuine banks use it too. It becomes evidence only together with other signs; on its own it sends the case to verification, not to a conviction.",
    patterns: ["\\b(we (have )?(detected|noticed) (unusual|suspicious)|unusual (login|activity|transaction|sign[\\s-]?in) (was )?detected|a new (login|device) (was )?(detected|added))\\b"],
    severity: 0.35,
  },
  {
    id: "R-ACC-04",
    category: "urgency",
    title: "SIM or line under threat",
    detail:
      "'Your SIM will be terminated' is a known Malaysian SIM-swap pressure opener. Phone companies do not announce line termination by unsolicited SMS with a link.",
    patterns: ["\\byour (sim|number|line|phone) (will|is about to) be (terminated|blocked|suspended|cut off)\\b"],
    severity: 0.55,
  },

  // ---------------- delivery & fees ----------------
  {
    id: "R-FEE-01",
    category: "payment",
    title: "Courier story, money demanded",
    detail:
      "Parcel + fee is the most common scam SMS in Malaysia: a small 'redelivery' or 'customs' charge exists only to capture a card. Courier fees are paid inside the courier's own app, never at a link in an SMS.",
    patterns: [
      "\\b(parcel|package|delivery|shipment|courier|poslaju|pos laju|j&t|jnt|dhl|ninja van|gdex|city[- ]?link)\\b",
      "(?:(?<!no )(?<!without )(?<!never )(?<!don't )(?<!don’t )(?<!do not )\\b(fee|charge|payment|pay(?:ment)?)\\b|\\brm ?\\d|\\bcustoms\\b|\\bclearance\\b|\\bredeliver|\\breschedul|\\breleas(?:e|ing)\\b)",
    ],
    severity: 0.6,
  },
  {
    id: "R-FEE-02",
    category: "payment",
    title: "Delivery 'reschedule' with a link",
    detail:
      "A delivery that 'needs rescheduling' through a link that is not the courier's own domain is the classic quishing setup.",
    patterns: [
      "\\b(parcel|package|delivery|shipment|courier)\\b",
      "\\b(reschedul(e|ing)|redeliver(y)?|failed (delivery|attempt)|update your (address|details))\\b",
      "\\b(click|link|tap|https?://|www\\.)\\b",
    ],
    severity: 0.45,
  },

  // ---------------- prizes & windfalls ----------------
  {
    id: "R-PRIZE-01",
    category: "prize",
    title: "Claims you have won something",
    detail:
      "A prize you never entered, needing a claim step, is a lure. Real competitions you entered contact you with details, not a claim link.",
    patterns: [
      "\\b(won|winner|prize|lucky draw|jackpot|grand draw)\\b",
      "\\b(claim|redeem|collect|receive|grab)\\b",
    ],
    severity: 0.55,
  },
  {
    id: "R-PRIZE-02",
    category: "prize",
    title: "Congratulations opener",
    detail:
      "'Congratulations' as an opener — especially to an unnamed recipient — is the standard frame of prize scams.",
    patterns: ["^\\s*(congratulations|congrats)\\b", "\\b(won|win|prize|reward|voucher|rm ?\\d)"],
    severity: 0.4,
  },
  {
    id: "R-GOVT-01",
    category: "impersonation",
    title: "Government body, and a threat or refund",
    detail:
      "LHDN, PDRM and the courts do not serve fines, summonses or refunds by SMS. A tax refund you did not claim months in advance is a lure.",
    patterns: [
      "\\b(lhdn|hasil|kwsp|epf|pdrm|police|court|jpj|immigration|ssm|mdec|saman|summons|income tax)\\b",
      "\\b(fine|summon(s|ed)?|arrest|warrant|legal action|blacklist|refund|owed|outstanding|debt|unpaid|rebate)\\b",
    ],
    severity: 0.6,
  },
  {
    id: "R-GOVT-02",
    category: "impersonation",
    title: "Aid, rebate or subsidy to claim",
    detail:
      "Announcements of aid, rebates or subsidies with a claim step are a recurring Malaysian lure; real programmes are announced through official channels and paid automatically.",
    patterns: [
      "\\b(rebate|bantuan|subsidy|subsidi|assistance|aid|voucher|incentive)\\b",
      "\\b(claim|redeem|register|apply|rm ?\\d|link|click|now|before)\\b",
    ],
    severity: 0.5,
  },

  // ---------------- brand impersonation ----------------
  {
    id: "R-BANK-01",
    category: "impersonation",
    title: "A brand name, an action verb and a link",
    detail:
      "A bank or wallet brand name joined to 'verify / login / update / confirm' and a clickable destination is the template of a bank-phishing SMS.",
    patterns: [
      "\\b(maybank|maybank2u|cimb|rhb|public bank|ambank|bank islam|hong leong|bsn|bank rakyat|affin|alliance bank|ocbc|hsbc|standard chartered|uob|muamalat|agrobank|touch n go|tng|shopeepay|boost)\\b",
      "\\b(verify|login|log in|update|reactivate|confirm|secure|unlock|restore|clicks?)\\b",
      "(https?://|www\\.|\\bclick\\b|\\btap\\b|\\b[a-z0-9-]{3,}\\.(com|net|my|sg|xyz|top|info|icu|biz|co|site|online|shop|app|live|cc|ru|cn|me)\\b)",
    ],
    severity: 0.5,
  },

  // ---------------- money-making lures ----------------
  {
    id: "R-INV-01",
    category: "investment",
    title: "Guaranteed returns",
    detail:
      "Nothing legitimate guarantees profit. 'Guaranteed / risk-free / fixed monthly return' in an unsolicited message is the language of investment fraud or a ponzi.",
    patterns: [
      "\\b(invest|investment|profit|returns?|roi|forex|crypto|bitcoin|btc|usdt|trading|stock|saham)\\b",
      "\\b(guaranteed|guarantee|risk[- ]?free|sure (profit|win)|100% (profit|return|safe)|\\d+% ?(monthly|daily|weekly|per (month|day|week)))\\b",
    ],
    severity: 0.7,
  },
  {
    id: "R-JOB-01",
    category: "job",
    title: "Job offer paid to chat apps",
    detail:
      "'Work from home, earn RM X a day' plus 'contact us on WhatsApp / Telegram' is the standard opening of task-scam recruitment.",
    patterns: [
      "\\b(work from home|part[- ]?time|hiring|vacancy|earn (up to )?rm ?\\d|income|salary)\\b",
      "\\b(whatsapp|telegram|wechat|dm|pm me|contact (us|me))\\b",
    ],
    severity: 0.4,
  },
  {
    id: "R-JOB-02",
    category: "job",
    title: "A job that asks you to pay first",
    detail:
      "No real employer charges registration, training or equipment fees before you start. Pay-first job offers are always fraud.",
    patterns: [
      "\\b(work from home|part[- ]?time|hiring|vacancy|earn (up to )?rm ?\\d|income|salary|job)\\b",
      "\\b(deposit|registration fee|processing fee|training fee|buy (the )?(kit|equipment|course)|pay (first|rm ?\\d))\\b",
    ],
    severity: 0.75,
  },
  {
    id: "R-LOAN-01",
    category: "loan",
    title: "Instant, document-free loan",
    detail:
      "Licensed lenders must check documents. 'No documents, guaranteed approval, money in minutes' describes an illegal money lender or a harvesting front.",
    patterns: [
      "\\b(loan|financing|pinjaman|credit line)\\b",
      "\\b(instant|fast approval|guaranteed (approval|approve)|no document(s)?|without document(s)?|approval in \\d+ (minutes|hours)|blacklist can apply)\\b",
    ],
    severity: 0.6,
  },
  {
    id: "R-MULE-01",
    category: "mule",
    title: "Recruiting your account as a money mule",
    detail:
      "Anyone offering commission for your bank account is building a money-laundering chain. Taking part is a crime, and the account holder carries it.",
    patterns: [
      "\\b(rent|rental|use|borrow|lease) (your |ur |my )?(bank )?account\\b|\\bmule account\\b|\\bcommission for (every|each) transfer\\b|\\bearn rm ?\\d+ (per|for (every|each)) transfer\\b|\\bweekly (payment|salary) for your account\\b",
    ],
    severity: 0.9,
    decisive: true,
  },

  // ---------------- pressure & secrecy ----------------
  {
    id: "R-SECRET-01",
    category: "pressure",
    title: "Tells you to keep it from others",
    detail:
      "'Don't tell your family', 'keep this confidential' exists to keep you away from the second opinion that would stop you.",
    patterns: [
      "\\b(don'?t|don’t|do not|never) (tell|inform|mention (this )?to) (anyone|anybody|your (family|parents|husband|wife|bank|children))\\b|\\bkeep this (confidential|secret|between us|private)\\b|\\bthis is (confidential|between us)\\b",
    ],
    severity: 0.65,
  },
  {
    id: "R-THREAT-01",
    category: "pressure",
    title: "Legal threats on a payment deadline",
    detail:
      "Police, courts and government departments do not negotiate payment windows by SMS. Threat plus deadline plus payment is extortion framing.",
    patterns: [
      "\\b(legal action|arrest|blacklist|ccris|ctos|warrant|jail|imprison)\\b",
      "\\b(pay|settle|clear|payment)\\b",
      "\\b(now|immediately|within \\d+|before \\d+|today|\\d+ ?hours?)\\b",
    ],
    severity: 0.6,
  },
  {
    id: "R-URGENT-01",
    category: "urgency",
    title: "Manufactured urgency",
    detail:
      "Urgency itself is not a crime — couriers and banks also use it. On its own it is a small hint; joined to any other exhibit it completes the picture.",
    patterns: [
      "\\b(urgent|immediately|act now|final (notice|warning|reminder)|last chance|expires? (today|in \\d+|soon)|within 24 ?hours?|time is running out|do not delay)\\b",
    ],
    severity: 0.25,
  },
  {
    id: "R-MONEY-01",
    category: "payment",
    title: "A sum of money and a payment demand",
    detail:
      "A specific ringgit amount plus a demand to pay, transfer or settle. Common in genuine bills too, which is why it is only a faint trace on its own.",
    patterns: [
      "\\b(rm ?\\d{1,5}(\\.\\d{2})?|myr ?\\d{1,5}|\\$\\d{1,5})\\b",
      "\\b(pay|payment|fee|outstanding|settle|deduct|transfer|bank in)\\b",
    ],
    severity: 0.2,
  },

  // ---------------- other fraud families ----------------
  {
    id: "R-TECH-01",
    category: "techsupport",
    title: "Tech-support alarm",
    detail:
      "'Your device is infected, call support' is the tech-support scam, by phone or chat. Microsoft and Apple do not phone you about your PC.",
    patterns: [
      "\\b(microsoft|apple|windows|google) (support|security|technician|team)\\b|\\byour (computer|device|phone|laptop) (is |has been )?(infected|hacked|compromised|at risk)\\b",
    ],
    severity: 0.65,
  },
  {
    id: "R-GIFT-01",
    category: "payment",
    title: "Payment demanded in gift cards",
    detail:
      "No institution accepts gift-card codes as payment. This is the standard demand of romance, tax and tech-support scammers.",
    patterns: ["\\b(itunes|steam|google play|amazon|apple) (gift ?card|gift ?voucher|voucher)\\b"],
    severity: 0.75,
  },
  {
    id: "R-CRYPTO-01",
    category: "payment",
    title: "A crypto wallet address",
    detail:
      "A raw wallet address in an unsolicited message means money is meant to vanish into an irreversible channel.",
    patterns: ["0x[a-f0-9]{40}\\b|\\bT[1-9A-HJ-NP-Za-km-z]{33}\\b|\\bbc1[a-z0-9]{25,59}\\b"],
    severity: 0.5,
  },
  {
    id: "R-CHAT-01",
    category: "impersonation",
    title: "Pushes you to a private chat with a phone number",
    detail:
      "Deals negotiated on WhatsApp or Telegram with an unknown number leave no audit trail — where most investment and task scams live.",
    patterns: ["\\b(whatsapp|telegram|wechat)\\b", "(\\+?6?01\\d[-\\s]?\\d{3,4}[-\\s]?\\d{3,4})"],
    severity: 0.3,
  },
  {
    id: "R-QR-01",
    category: "payment",
    title: "A QR code that wants a payment or claim",
    detail:
      "'Scan to pay / claim / receive' outside a checkout is a quishing pattern: the QR leads to a payment page wearing a brand's face.",
    patterns: [
      "\\b(qr code|scan (this|the|our) qr|scan to (pay|receive|claim|get|redeem))\\b",
      "\\b(pay|receive|claim|get|redeem|transfer|reward|cash)\\b",
    ],
    severity: 0.45,
  },
  {
    id: "R-WRONG-01",
    category: "impersonation",
    title: "Wrong-number opener",
    detail:
      "'I got your number from a friend' is how wrong-number scams start — a friendly stranger with a business opportunity.",
    patterns: ["\\b(i got your number from|your number was given to me|is this (still )?(the )?(right )?(number|owner)|sorry, (i think )?(wrong number))\\b"],
    severity: 0.3,
  },

  // ---------------- protective (evidence of legitimacy) ----------------
  {
    id: "P-CODE-01",
    category: "protective",
    title: "Warns you never to share the code",
    detail:
      "Genuine bank and platform notices tell you that staff will never ask for the code. That warning is a sign of a legitimate sender — this is exactly what scams omit.",
    patterns: ["\\b(never|do not|don'?t|don’t) (share|give|reveal|disclose|provide) (this |the |your )?(otp|tac|code|pin|password|one[-\\s]?time (password|code))\\b"],
    severity: 0.5,
    protective: true,
  },
  {
    id: "P-NOACTION-01",
    category: "protective",
    title: "States no action is required",
    detail:
      "'No action required / for your reference' is the shape of a confirmation notice, not of a demand.",
    patterns: ["\\b(no action (is )?(required|needed)|for your (information|records|reference) only|for your reference|no reply (is )?(needed|required|necessary)|please keep (this )?for your records)\\b"],
    severity: 0.4,
    protective: true,
  },
  {
    id: "P-TXN-01",
    category: "protective",
    title: "Reads as a completed-transaction notice",
    detail:
      "Receipts of things that already happened — credited, charged, renewed, successful payment — are the ordinary traffic of genuine service messages.",
    patterns: [
      "\\b(thank you for your (payment|purchase|order)|receipt|has been (received|recorded|credited|charged|debited)|will be charged|successfully (paid|renewed|subscribed|transferred)|your (payment|transfer|transaction|order|top[- ]?up|subscription|booking) (was|has been) (successful|received|recorded|credited|confirmed)|duit masuk|has been delivered)\\b",
    ],
    severity: 0.35,
    protective: true,
  },
  {
    id: "P-DELIVERY-01",
    category: "protective",
    title: "Ordinary delivery progress update",
    detail:
      "'Out for delivery', 'arriving today' — the everyday courier update, with no fee and no link pressure.",
    patterns: ["\\b(out for delivery|arriving (today|soon|between|by)|is on the way|delivery (today|attempted|completed)|will be delivered|parcel is at|ready for (pickup|collection)|track (your parcel )?in the app)\\b"],
    severity: 0.3,
    protective: true,
  },
  {
    id: "P-APPT-01",
    category: "protective",
    title: "Appointment or booking confirmation",
    detail:
      "Clinic, office and service appointments confirm, remind and reschedule with no urgency and no payment step.",
    patterns: ["\\b((appointment|booking|reservation|order) (is )?(confirmed|scheduled|booked|placed|on)|reminders?\\b|your (appointment|booking) (is|has been) (confirmed|scheduled|moved|changed))"],
    severity: 0.35,
    protective: true,
  },
  {
    id: "P-KEEP-01",
    category: "protective",
    title: "Anti-scam language itself",
    detail:
      "Messages that warn about scams, phishing and fraud, or tell you to use the official app, are doing the public-service job real institutions do.",
    patterns: ["\\b(beware of (scam|fraud|phishing)|report (suspicious|scam|fraud)|protect (yourself|your account) from (scam|fraud)|official (app|channel|website|portal) only|do not (click|share|provide) (any )?(link|code|personal))\b"],
    severity: 0.45,
    protective: true,
  },
];

export interface RuleMatch {
  rule: RuleRecord;
  quote: string;
}

export interface RulesReport {
  positive: RuleMatch[];
  protective: RuleMatch[];
}

const compiled = new Map<string, RegExp[]>();
for (const rule of RULES) {
  compiled.set(
    rule.id,
    rule.patterns.map((p) => new RegExp(p, "im"))
  );
}

export function matchRules(text: string): RulesReport {
  const positive: RuleMatch[] = [];
  const protective: RuleMatch[] = [];
  for (const rule of RULES) {
    const regexes = compiled.get(rule.id) ?? [];
    let firstQuote: string | null = null;
    let allMatched = true;
    for (const re of regexes) {
      re.lastIndex = 0;
      const m = re.exec(text);
      if (!m) {
        allMatched = false;
        break;
      }
      if (firstQuote === null) firstQuote = m[0].trim();
    }
    if (allMatched && firstQuote !== null) {
      const match: RuleMatch = { rule, quote: firstQuote };
      if (rule.protective) protective.push(match);
      else positive.push(match);
    }
  }
  return { positive, protective };
}
