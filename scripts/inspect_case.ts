// A small bench-side utility: run any text through the shipped adjudicator and
// print everything the court saw. Handy when tuning rules or reading a
// surprising verdict.
//
// Usage: node scripts/inspect_case.ts "Your message text here"

import { adjudicate } from "../lib/engine/fusion.ts";

const message = process.argv.slice(2).join(" ");
if (!message) {
  console.error('usage: node scripts/inspect_case.ts "message text"');
  process.exit(1);
}

const adj = adjudicate(message);
console.log(`verdict: ${adj.verdict.toUpperCase()}   score: ${adj.score.toFixed(4)}   band: [${adj.band.low}, ${adj.band.high}]`);
console.log(`text prob: ${adj.text.probability.toFixed(4)}   logit: ${adj.text.logit.toFixed(3)}`);
console.log("sources:");
for (const s of adj.sources) {
  console.log(`  ${s.label.padEnd(12)} score=${s.score === null ? "—" : s.score.toFixed(4)} weight=${s.weight.toFixed(2)} ${s.note}`);
}
console.log("charges:");
for (const m of adj.rules.positive) {
  console.log(`  [${m.rule.severity.toFixed(2)}] ${m.rule.id} ${m.rule.title} :: "${m.quote}"`);
}
console.log("protective:");
for (const m of adj.rules.protective) {
  console.log(`  [${m.rule.severity.toFixed(2)}] ${m.rule.id} ${m.rule.title} :: "${m.quote}"`);
}
console.log("address evidence:");
for (const r of adj.urls.reports) {
  for (const ev of r.evidence) console.log(`  [${ev.severity.toFixed(2)}] ${ev.id} ${ev.title} (${r.host})`);
}
console.log("policy notes:");
for (const n of adj.policyNotes) console.log(`  - ${n}`);
console.log("top scam tokens:", adj.text.topScamTokens.map((t) => `${t.token}:${t.weight.toFixed(2)}`).join(" "));
console.log("top genuine tokens:", adj.text.topGenuineTokens.map((t) => `${t.token}:${t.weight.toFixed(2)}`).join(" "));
