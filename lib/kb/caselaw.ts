// Case law for the Law School: each volume is a scam family written up the way
// a clerk would brief it — the trick, the tells, the verification, and the
// principle from official guidance that underpins it.

export interface LawArticle {
  id: string;
  volume: string;
  title: string;
  hook: string;
  howItWorks: string;
  redFlags: string[];
  howToVerify: string;
  principle: string;
}

export const CASE_LAW: LawArticle[] = [
  {
    id: "parcel",
    volume: "I",
    title: "The Parcel That Never Was",
    hook: "A small fee stands between you and a parcel you may not even be expecting.",
    howItWorks:
      "The message claims a delivery is held and asks for a tiny redelivery or customs fee. The amount is deliberately small — forgettable, payable without a second thought. The link collects card details, and the fee is the least of what it takes.",
    redFlags: [
      "A fee demanded by link rather than inside the courier's own app",
      "A deadline ('within 24 hours') attached to a trivial amount",
      "A domain that borrows the courier's name but is not the courier's domain",
    ],
    howToVerify:
      "Open the courier's own app and enter the tracking number there. If the app shows no such parcel or no fee, the message is fiction. Never pay a delivery fee at a link in an SMS.",
    principle: "Verify through a channel you chose yourself, never one the message chose for you.",
  },
  {
    id: "tac",
    volume: "II",
    title: "The Code They Must Never Have",
    hook: "The one request no bank, no courier and no officer will ever make.",
    howItWorks:
      "An OTP, TAC or PIN authorises a transaction in progress. The scammer has usually already started one — a transfer or a binding — and needs only that code to complete it. Everything before the request — the blocked account, the failed delivery, the suspicious login — exists purely to make handing it over feel like protecting yourself.",
    redFlags: [
      "Any request to share, key in or read out a code",
      "A story of danger ('blocked', 'suspended') attached to that request",
      "Instruction to act now, before you can think",
    ],
    howToVerify:
      "Nothing to verify: the request itself is the proof. Genuine banks state the opposite — that staff will never ask for the code. If you shared one, call your bank on the number printed on your card immediately.",
    principle: "A code is a signature. You never sign what a stranger drafted.",
  },
  {
    id: "bank",
    volume: "III",
    title: "The Bank That Isn't",
    hook: "Your bank's name, on someone else's address.",
    howItWorks:
      "The message wears the bank's name and asks you to verify, update or reactivate. The link leads to a page that copies the real login closely enough to harvest it. The giveaway is the address: the brand's name sits inside a host that the brand does not own, often on a cheap bulk suffix or stitched together with hyphens.",
    redFlags: [
      "The brand's name inside the domain, but the domain is not the brand's",
      "Action verbs: verify, login, update, unlock, reactivate",
      "A look-alike host — swapped letters, extra words, odd suffixes",
    ],
    howToVerify:
      "Open your banking app directly and check for the claimed alert there. If the app is quiet, the message is the only thing that is alarming — and it is not your bank.",
    principle: "Read the address, not the name. Ownership is the only credential a link can't fake.",
  },
  {
    id: "govt",
    volume: "IV",
    title: "The Official Letter",
    hook: "Governments do not collect fines by SMS.",
    howItWorks:
      "The message claims to be from the tax office, the police or a ministry, carrying a fine, a summons or a refund. Authority does the work — fear of legal trouble, or greed at a windfall. The payment or the claim step always lives at a link, and the deadline is always short.",
    redFlags: [
      "A government body demanding payment or offering a refund by message",
      "Legal threats ('arrest', 'blacklist', 'warrant') on a countdown",
      "A link that is not the agency's own domain",
    ],
    howToVerify:
      "Look up the agency's official portal or hotline yourself and check your status there. Real refunds arrive through the system; real summonses arrive on paper or in person.",
    principle: "Authority asks you to come to it. Only a forgery needs you to hurry.",
  },
  {
    id: "prize",
    volume: "V",
    title: "The Prize You Never Entered",
    hook: "A jackpot has no entrance fee — and no claim link.",
    howItWorks:
      "The message announces a win: a lucky draw, a giveaway, a grand prize. Claiming requires a step — a link, a payment for 'processing', or your details. A prize from a draw you never entered cannot exist; the 'win' is bait for the step.",
    redFlags: [
      "A win announced to an unnamed recipient",
      "'Claim before it expires' urgency",
      "Any fee, form or link between you and the prize",
    ],
    howToVerify:
      "Ask which competition, and in which name you entered. If the answer is nothing, the win is nothing. Legitimate giveaways you entered contact you with details, not claim links.",
    principle: "If the prize needs you to act fast, the prize is you acting fast.",
  },
  {
    id: "job",
    volume: "VI",
    title: "The Job That Pays You — Or So It Says",
    hook: "Real jobs pay you. Fake ones charge you.",
    howItWorks:
      "Offers of easy income — work from home, earn per day, no experience needed — funnel into private chats where the real structure appears: a registration fee, a training kit, or a 'task' that requires you to deposit first. Early small payouts are invested in trust, then the deposit grows and the payout stops.",
    redFlags: [
      "Pay-first: registration, materials, training, deposit",
      "Recruitment onto WhatsApp or Telegram by unknown numbers",
      "Income stated per day with no interview and no employer",
    ],
    howToVerify:
      "A real employer has a verifiable company behind it. Check the company registration, and never pay to begin work. If the money flows from you to them, it is not a job.",
    principle: "Employment transfers value to the worker. Anything else is the worker transferring value.",
  },
  {
    id: "invest",
    volume: "VII",
    title: "The Money Machine",
    hook: "Guaranteed returns exist nowhere — which is exactly why they are promised everywhere.",
    howItWorks:
      "Investment offers promise fixed monthly percentages, guaranteed profits, risk-free crypto bots. Early withdrawals work flawlessly — that is the performance. When the balance grows large enough to matter, the withdrawal stalls, fees appear, and the platform and its agent go quiet together.",
    redFlags: [
      "Guaranteed or fixed-percentage returns",
      "Pressure: limited slots, closing soon, a private chat to join",
      "An app from a link, not from an official store",
    ],
    howToVerify:
      "Check the operator against the securities regulator's licensed list. Anything guaranteeing profit is outside every licensed framework by definition.",
    principle: "Risk cannot be abolished, only relocated. If it is not on their books, it is on yours.",
  },
  {
    id: "loan",
    volume: "VIII",
    title: "The Loan You Shouldn't Take",
    hook: "No documents, no questions, guaranteed approval — and a fee before the money.",
    howItWorks:
      "The offer is instant cash regardless of credit. Approval comes easily; disbursement requires an advance fee — insurance, processing, stamped documents. The loan never arrives; the fee does not come back. Sometimes the 'application' is itself the harvest: identity documents gathered for other crimes.",
    redFlags: [
      "Approval without any verification",
      "Any payment before disbursement",
      "Licensed-lender vocabulary with unlicensed behaviour",
    ],
    howToVerify:
      "Licensed lenders must assess documents and never charge before disbursement. Check the lender against the regulator's list before sharing a single document.",
    principle: "Money you are owed never requires a payment first.",
  },
  {
    id: "mule",
    volume: "IX",
    title: "The Account They Want To Borrow",
    hook: "Rent your bank account for easy money. The charge sheet has your name on it.",
    howItWorks:
      "The offer pays you to let transfers pass through your bank account — a commission per transfer, a weekly fee for the account. In reality you are the visible link in a laundering chain: stolen money enters, leaves, and every record points at you. When it ends, the 'employer' is gone and you are the one who owned the account.",
    redFlags: [
      "Payment for the use of your account or transfers through it",
      "Instructions to keep it quiet, or to move money quickly",
      "Commission language that never mentions the source of funds",
    ],
    howToVerify:
      "There is no legitimate version of this offer. Report it — and never let income you cannot explain move through an account with your name on it.",
    principle: "If you cannot say where the money came from, the law will ask you to.",
  },
  {
    id: "quish",
    volume: "X",
    title: "The QR Code Trap",
    hook: "Scan to pay — or scan to be taken.",
    howItWorks:
      "Quishing hides the phishing link inside a QR code, where it is invisible until scanned: parking 'summonses', table stickers, delivery notes, door notices. The code opens a payment or login page wearing a familiar face, and the destination can be anything the scammer registered that morning.",
    redFlags: [
      "A QR code that leads to a login or card page",
      "A payment demanded through a code when you expected a counter or a mention",
      "Stickers pasted over an original code or notice",
    ],
    howToVerify:
      "Decode and read the destination before paying — this court's evidence chamber does exactly that on your device. Pay through the organisation's own app, and treat any QR asking for card details with suspicion.",
    principle: "A code is just a hidden link. Read the link.",
  },
  {
    id: "tech",
    volume: "XI",
    title: "The Alarm From Nowhere",
    hook: "Your computer is not screaming. Someone just wants you to think it is.",
    howItWorks:
      "A call or message claims your device is infected or compromised and offers a 'support' line. The goal is remote access or a payment — sometimes both, in sequence: first to 'clean' the machine, then to 'refund' the cleaning and harvest the card again.",
    redFlags: [
      "Unsolicited security alarm for your device",
      "A support number in the message or on a popup",
      "Requests to install remote-access software",
    ],
    howToVerify:
      "Close the popup; call no numbers from it. If worried, update and scan from the vendor's own tools. Microsoft and Apple do not phone you about your computer.",
    principle: "Security warnings worth believing never arrive with a phone number attached.",
  },
  {
    id: "wrongnumber",
    volume: "XII",
    title: "The Stranger Who Becomes A Friend",
    hook: "It starts wrong and gets friendly on purpose.",
    howItWorks:
      "A 'wrong number' opens politely — maybe a business enquiry. Conversation follows: warmth, a photo, a story, and eventually an opportunity (investment, trading, a gift). Weeks of trust are built to fund one large 'opportunity' that only you can seize today.",
    redFlags: [
      "Unsolicited friendly contact from an unknown number",
      "Slow drift from small talk toward money and platforms",
      "A relationship that exists entirely in chat",
    ],
    howToVerify:
      "Slow down and name the pattern aloud to someone outside the chat. Relationships that cannot survive a video call or a friend's second opinion are business relationships in disguise.",
    principle: "Money talks walk in through the door of a new friendship.",
  },
];
