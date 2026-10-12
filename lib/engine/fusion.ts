// The bench. Fuses the three tools of the court into one score and a verdict:
//
//   language  — the calibrated text scorer (weight 0.40)
//   conduct   — the rule book's noisy-OR over matched charges (weight 0.35)
//   address   — the worst link in the message (weight 0.25)
//
// A source with nothing to say abstains and is dropped from the blend rather
// than imputed, so a link-less message is judged by language and conduct at
// their renormalised weights.
//
// Two policy overrides sit above the arithmetic, both explained in the record:
//   * a decisive charge (OTP request, mule recruitment) floors the score;
//   * verified-official-domain links or protective-register language, with
//     nothing hostile found, cap the score inside the acquittal band — the
//     genuine bill must not be convicted for looking like its own scam.

import { scoreText, BAND, type TextScore } from "./textModel.ts";
import { matchRules, type RulesReport, type RuleMatch } from "./kb/rules.ts";
import { analyzeUrls, type UrlAnalysis } from "./urlAnatomy.ts";

export type Verdict = "guilty" | "acquitted" | "hung";

export interface Exhibit {
  id: string;
  kind: "charge" | "address" | "language" | "protective";
  title: string;
  detail: string;
  quote?: string;
  severity?: number;
}

export interface SourceReport {
  name: "language" | "conduct" | "address";
  label: string;
  score: number | null;
  weight: number;
  contribution: number;
  note: string;
}

export interface Adjudication {
  score: number;
  verdict: Verdict;
  band: { low: number; high: number };
  sources: SourceReport[];
  exhibits: Exhibit[];
  protectiveExhibits: Exhibit[];
  policyNotes: string[];
  text: TextScore;
  urls: UrlAnalysis;
  rules: RulesReport;
}

const RAW_WEIGHTS = { language: 0.4, conduct: 0.35, address: 0.25 } as const;
const DECISIVE_FLOOR = 0.92;
const PROTECTIVE_MAX_POSITIVE = 0.4;

function noisyOr(severities: number[]): number {
  let keep = 1;
  for (const s of severities) keep *= 1 - s;
  return 1 - keep;
}

export function adjudicate(message: string): Adjudication {
  const text = scoreText(message);
  const rules = matchRules(message);
  const urls = analyzeUrls(message);

  const positives: RuleMatch[] = rules.positive;
  const maxPositive = positives.reduce((m, p) => Math.max(m, p.rule.severity), 0);
  const conductScore = positives.length > 0 ? noisyOr(positives.map((p) => p.rule.severity)) : null;
  const addressScore = urls.reports.length > 0 ? urls.maxScore : null;

  const rawList = [
    { name: "language" as const, score: text.probability, weight: RAW_WEIGHTS.language },
    { name: "conduct" as const, score: conductScore, weight: RAW_WEIGHTS.conduct },
    { name: "address" as const, score: addressScore, weight: RAW_WEIGHTS.address },
  ];
  const available = rawList.filter((s) => s.score !== null);
  const totalWeight = available.reduce((acc, s) => acc + s.weight, 0);

  let base = 0;
  const sources: SourceReport[] = rawList.map((s) => {
    if (s.score === null) {
      return {
        name: s.name,
        label: labelFor(s.name),
        score: null,
        weight: 0,
        contribution: 0,
        note: "Abstained — nothing to contribute to this case.",
      };
    }
    const weight = s.weight / totalWeight;
    base += s.score * weight;
    return {
      name: s.name,
      label: labelFor(s.name),
      score: s.score,
      weight,
      contribution: s.score * weight,
      note: "",
    };
  });

  let score = base;
  const policyNotes: string[] = [];

  const decisive = positives.find((p) => p.rule.decisive);
  if (decisive) {
    if (score < DECISIVE_FLOOR) score = DECISIVE_FLOOR;
    policyNotes.push(
      `The charge "${decisive.rule.title}" is decisive on its own: the verdict is floored at ${DECISIVE_FLOOR} regardless of everything else.`
    );
  } else {
    const officialCap = urls.anyOfficial && maxPositive < PROTECTIVE_MAX_POSITIVE;
    const protectiveCap = rules.protective.length > 0 && maxPositive < PROTECTIVE_MAX_POSITIVE;
    if ((officialCap || protectiveCap) && score > BAND.low) {
      score = BAND.low;
      policyNotes.push(
        officialCap
          ? "The link sits on the brand's own verified domain and nothing hostile was found, so the score is capped inside the acquittal band — a genuine notice must not be convicted for resembling its own scam."
          : "The message carries protective language from the genuine-notice register and nothing hostile was found, so the score is capped inside the acquittal band."
      );
    }
  }

  const verdict: Verdict = score >= BAND.high ? "guilty" : score <= BAND.low ? "acquitted" : "hung";

  const exhibits: Exhibit[] = [];
  for (const p of positives) {
    exhibits.push({
      id: p.rule.id,
      kind: "charge",
      title: p.rule.title,
      detail: p.rule.detail,
      quote: p.quote,
      severity: p.rule.severity,
    });
  }
  exhibits.sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0));
  for (const report of urls.reports) {
    for (const ev of report.evidence) {
      exhibits.push({
        id: ev.id,
        kind: "address",
        title: ev.title,
        detail: ev.detail,
        quote: report.host,
        severity: ev.severity,
      });
    }
  }
  exhibits.push(languageExhibit(text));

  const protectiveExhibits: Exhibit[] = rules.protective.map((p) => ({
    id: p.rule.id,
    kind: "protective",
    title: p.rule.title,
    detail: p.rule.detail,
    quote: p.quote,
    severity: p.rule.severity,
  }));

  return {
    score,
    verdict,
    band: { low: BAND.low, high: BAND.high },
    sources,
    exhibits,
    protectiveExhibits,
    policyNotes,
    text,
    urls,
    rules,
  };
}

function labelFor(name: "language" | "conduct" | "address"): string {
  return name === "language" ? "The language" : name === "conduct" ? "The conduct" : "The address";
}

function languageExhibit(text: TextScore): Exhibit {
  const pct = (text.probability * 100).toFixed(1);
  const scamTokens = text.topScamTokens.map((t) => `"${t.token}"`).join(", ");
  const genuineTokens = text.topGenuineTokens.map((t) => `"${t.token}"`).join(", ");
  let detail = `The scorer, calibrated on the labelled corpus, reads this message as ${pct}% scam-like.`;
  if (text.probability >= BAND.high && scamTokens) {
    detail += ` Phrases pulling toward scam: ${scamTokens}.`;
  } else if (text.probability <= BAND.low && genuineTokens) {
    detail += ` Phrases pulling toward genuine: ${genuineTokens}.`;
  } else if (text.probability > BAND.low && text.probability < BAND.high) {
    detail += " The language alone is not decisive either way.";
  }
  return {
    id: "L-LANG-01",
    kind: "language",
    title: "What the words themselves weigh",
    detail,
    quote: undefined,
    severity: undefined,
  };
}
