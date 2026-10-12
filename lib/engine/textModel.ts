// Text exhibit scorer — loads the artefact produced by the offline pipeline
// (pipeline/train_text_model.py, trained and calibrated on the UCI SMS Spam
// Collection) and scores a message with it. The scoring path is:
//   tokens -> binary-presence features -> logistic regression -> raw logit
//   -> Platt calibration -> probability in [0, 1]
// Parity with the Python reference scores is enforced by tests.

import { TEXT_MODEL } from "./artifacts/text_model.ts";
import { tokenize } from "./tokenize.ts";

export interface TextModelArtifact {
  version: number;
  tokenizer: string;
  vocab: string[];
  weights: number[];
  bias: number;
  calibration: { type: string; a: number; b: number };
  band: { low: number; high: number };
  corpus: string;
}

export interface TextScore {
  probability: number;
  logit: number;
  topScamTokens: { token: string; weight: number }[];
  topGenuineTokens: { token: string; weight: number }[];
}

export const BAND = TEXT_MODEL.band;

const model: TextModelArtifact = TEXT_MODEL;
const vocabIndex = new Map<string, number>();
model.vocab.forEach((word, i) => vocabIndex.set(word, i));

export function sigmoid(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const ez = Math.exp(z);
  return ez / (1 + ez);
}

export function scoreText(text: string): TextScore {
  const present = new Set<number>();
  for (const token of tokenize(text)) {
    const idx = vocabIndex.get(token);
    if (idx !== undefined) present.add(idx);
  }
  const feats = [...present].sort((a, b) => a - b);
  // Summation order mirrors the Python reference: fold from zero first,
  // then add the bias, so both implementations agree bit-for-bit before
  // rounding differences of the maths library are even considered.
  let sum = 0;
  for (const i of feats) sum += model.weights[i];
  const logit = model.bias + sum;
  const probability = sigmoid(model.calibration.a * logit + model.calibration.b);

  const scam: { token: string; weight: number }[] = [];
  const genuine: { token: string; weight: number }[] = [];
  for (const i of feats) {
    const w = model.weights[i];
    if (w >= 0.6) scam.push({ token: model.vocab[i], weight: w });
    else if (w <= -0.6) genuine.push({ token: model.vocab[i], weight: w });
  }
  scam.sort((a, b) => b.weight - a.weight);
  genuine.sort((a, b) => a.weight - b.weight);
  return {
    probability,
    logit,
    topScamTokens: scam.slice(0, 6),
    topGenuineTokens: genuine.slice(0, 6),
  };
}
