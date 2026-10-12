"use client";

// The stamp moment. One verdict lands on the record — with the ink, the
// shockwave, and an honest sentence about what it means.

import type { Verdict } from "../../lib/engine/fusion.ts";

interface Props {
  verdict: Verdict;
  recommendation: Verdict;
  score: number;
  caseId: string;
}

const WORD: Record<Verdict, string> = {
  guilty: "GUILTY",
  acquitted: "ACQUITTED",
  hung: "HUNG JURY",
};

const NOTE: Record<Verdict, string> = {
  guilty:
    "The message is convicted on the record. The protection order below is the sentence — follow it before you touch anything in that message.",
  acquitted:
    "The message is released with the court's confidence: nothing hostile was found. Keep the notice — it is evidence of the genuine thing.",
  hung:
    "The court will not bluff. Treat it as unresolved and verify through the official channel — the number on your card or in the brand's own app, never a contact inside this message.",
};

export default function VerdictBanner({ verdict, recommendation, score, caseId }: Props) {
  const overruled = verdict !== recommendation;
  return (
    <div className="verdict-banner" data-shake="false">
      <span className="shockwave" aria-hidden="true" />
      <span className="stamp stamp-lg" data-tone={verdict}>
        {WORD[verdict]}
      </span>
      <p className="stamp-note">{NOTE[verdict]}</p>
      {overruled && (
        <p className="overruled-note">
          You overruled the clerk's reading ({WORD[recommendation]}). The case file records the disagreement, as it should.
        </p>
      )}
      <p className="verdict-meta">
        {caseId} · court score {(score * 100).toFixed(1)} of 100 · verdict entered by you, the judge
      </p>
    </div>
  );
}
