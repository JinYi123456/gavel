// Bench drills: one-minute exercises for the Law School. Each item is a short
// message; the student rules scam or genuine and gets the reasoning. These are
// written for humans practising judgement — the training ground, not the
// courtroom (the courtroom itself is tested separately against its own
// golden set).

export interface Drill {
  id: string;
  text: string;
  answer: "scam" | "genuine";
  why: string;
}

export const DRILLS: Drill[] = [
  {
    id: "d01",
    text: "MAE: Your DuitNow transfer of RM150.00 to AHMAD was successful. Ref 88231. Not you? Call 03-5891 4744 (number on your card).",
    answer: "genuine",
    why: "A completed-transaction notice with a reference and a number that points you back to your own card. No demand, no link, nothing to claim.",
  },
  {
    id: "d02",
    text: "Your order is at our hub. RM2.90 storage fee overdue — settle at bit.ly/rdeliver-my before it is disposed.",
    answer: "scam",
    why: "Fee + shortener + deadline. Storage fees are paid, if ever, inside the courier's own system — and the link hides its destination.",
  },
  {
    id: "d03",
    text: "Hi, I'm from the courier. Could you confirm your full name and address for the delivery? No payment needed — the driver is 3 stops away.",
    answer: "scam",
    why: "Real couriers already have the address — it is on the parcel. 'No payment needed' does not sanitise a harvest of details, especially from someone who phoned you.",
  },
  {
    id: "d04",
    text: "MAXIS: Your bill of RM89.00 for October is ready in the MyMaxis app. Payment due 25 Oct. View your bill in the app.",
    answer: "genuine",
    why: "Points to the service's own app for viewing — it does not carry a payment link at all. That is how real notices behave.",
  },
  {
    id: "d05",
    text: "We're updating our records. Reply with your card number, expiry and the code we send, to keep your account active.",
    answer: "scam",
    why: "Card details plus the incoming code is everything needed to take money. No legitimate service 'updates records' this way.",
  },
  {
    id: "d06",
    text: "Part-time job, 2 hours a day, no experience. RM200-RM400 daily, paid same day. Apply via WhatsApp 011-2233 4455.",
    answer: "scam",
    why: "Day-rate income with no employer, no interview, routed to a private chat. The next step is always paid tasks or a deposit.",
  },
  {
    id: "d07",
    text: "JPJ: Appointment for your driving test is confirmed 22 Oct, 9 am, Bahau branch. Bring your IC. No payment required at the counter today.",
    answer: "genuine",
    why: "An appointment notice with concrete details and no demand. Real official messages are boring — that is a feature.",
  },
  {
    id: "d08",
    text: "LHDN: You are eligible for a tax refund of RM1,180. Confirm your bank account at the link within 24 hours: https://lhdn-refund.xyz/confirm",
    answer: "scam",
    why: "Refunds do not need to 'confirm' bank accounts at fresh links under threat of expiry. The .xyz domain is not hasil.gov.my.",
  },
  {
    id: "d09",
    text: "Dear valued customer, your electricity will be disconnected today at 5 pm due to an unpaid bill. Pay now: http://tnb-payment.icu",
    answer: "scam",
    why: "Disconnection threats belong in letters and official notices, not in a link that borrows TNB's name on a bargain domain.",
  },
  {
    id: "d10",
    text: "Grab: Your ride receipt. RM23.40 — KLCC to Bangsar, 14 Oct. Download the receipt in the app.",
    answer: "genuine",
    why: "A receipt for something you could have taken, retrievable in the platform's own app. Nothing asked, nothing offered.",
  },
  {
    id: "d11",
    text: "I got your contact from the Malaysia SME directory. We invest in local businesses — guaranteed 8% monthly return, capital protected. Interested?",
    answer: "scam",
    why: "Guaranteed monthly returns with capital protection do not exist in any licensed market. The 'directory' opener is the soft way in.",
  },
  {
    id: "d12",
    text: "PDRM: You have an outstanding traffic summons RM300. Pay within 48 hours to avoid court action: http://my-saman.click/pay",
    answer: "scam",
    why: "Police do not collect summonses by link. Threat + deadline + payment channel is always the pattern.",
  },
  {
    id: "d13",
    text: "Your GrabRewards points (2,450) expire 31 Oct. Redeem inside the Grab app before they go.",
    answer: "genuine",
    why: "The action lives inside the app you installed. Points reminders that demand an outside link would be the warning sign.",
  },
  {
    id: "d14",
    text: "Cheap loan! Blacklist can apply. No payslip, no check, RM20k in 1 hour. Fee only RM200 upfront. WhatsApp 016-778 8123.",
    answer: "scam",
    why: "'Blacklist can apply' plus upfront fee describes an illegal lender: no assessment, money later, money first.",
  },
];
