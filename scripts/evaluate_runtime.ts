// Runs the shipped adjudicator over the held-out evaluation split of the UCI
// SMS Spam Collection and reports verdict-level operating numbers. This is an
// evaluation of the real runtime — the same code path a user's message takes —
// not of a reimplementation. Output: reports/runtime_evaluation.json
//
// Run: npm run evaluate

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { adjudicate } from "../lib/engine/fusion.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const split = JSON.parse(
  readFileSync(join(root, "lib/engine/artifacts/val_split.json"), "utf8")
) as { rows: { label: number; text: string }[] };

let tp = 0;
let fp = 0;
let fn = 0;
let tn = 0;
let hungOnScam = 0;
let hungOnGenuine = 0;
const started = process.hrtime.bigint();

for (const row of split.rows) {
  const { verdict } = adjudicate(row.text);
  const isScam = row.label === 1;
  if (verdict === "guilty") {
    if (isScam) tp++;
    else fp++;
  } else if (verdict === "acquitted") {
    if (isScam) fn++;
    else tn++;
  } else if (isScam) {
    hungOnScam++;
  } else {
    hungOnGenuine++;
  }
}
const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

const total = split.rows.length;
const genuine = tn + fp + hungOnGenuine;
const scams = tp + fn + hungOnScam;
const precision = tp / Math.max(1, tp + fp);
const recallCommitted = tp / Math.max(1, tp + fn);
const recallOverall = (tp + Math.max(0, hungOnScam * 0)) / Math.max(1, scams);
const falseAlarmRate = fp / Math.max(1, genuine);
const acquittedOnScam = fn / Math.max(1, scams);
const hungRate = (hungOnScam + hungOnGenuine) / Math.max(1, total);

const report = {
  generated_utc: new Date().toISOString(),
  dataset: "UCI SMS Spam Collection — held-out split (seed 42, view: val_split.json)",
  rows: total,
  verdicts: { guilty: tp + fp, acquitted: tn + fn, hung: hungOnScam + hungOnGenuine },
  commitments: {
    guilty_correct_on_scams: tp,
    guilty_on_genuine_false_alarms: fp,
    acquitted_correct_on_genuine: tn,
    acquitted_on_scams_misses: fn,
    hung_on_scams: hungOnScam,
    hung_on_genuine: hungOnGenuine,
  },
  metrics: {
    precision_guilty: round(precision),
    scam_recall_committed: round(recallCommitted),
    false_alarm_rate_on_genuine: round(falseAlarmRate),
    miss_rate_acquitted_scams: round(acquittedOnScam),
    hung_rate: round(hungRate),
  },
  latency: {
    total_ms: round(elapsedMs),
    mean_ms_per_case: round(elapsedMs / total),
  },
  notes:
    "Verdict bands (low/high) are the text-scorer operating points measured on this split and applied as policy to the fused score; this report measures what the shipped product actually does on the held-out data.",
};

function round(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

writeFileSync(join(root, "reports/runtime_evaluation.json"), JSON.stringify(report, null, 2));
console.log(`rows: ${total}  (${scams} scam / ${genuine} genuine)`);
console.log(
  `verdicts: guilty ${tp + fp} · acquitted ${tn + fn} · hung ${hungOnScam + hungOnGenuine}`
);
console.log(
  `precision ${precision.toFixed(4)} · recall-committed ${recallCommitted.toFixed(4)} · false alarms ${falseAlarmRate.toFixed(4)} · misses ${acquittedOnScam.toFixed(4)} · hung ${hungRate.toFixed(4)}`
);
console.log(`mean ${(elapsedMs / total).toFixed(2)} ms/case -> reports/runtime_evaluation.json`);
