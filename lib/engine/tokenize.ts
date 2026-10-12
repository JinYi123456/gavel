// Tokenizer v1 — behaviourally identical to pipeline/train_text_model.py.
// The corpus was tokenized with exactly these three steps and the two
// implementations are compared by tests/engine.test.ts against reference
// scores, so any drift here is a build failure, not a silent divergence:
//   1. lowercase
//   2. replace http(s):// or www. URLs with the single token "urltoken"
//   3. split on [a-z0-9]+

export const TOKENIZER_ID = "lower-url-placeholder-v1";

const URL_RE = /(?:https?:\/\/|www\.)\S+/g;
const TOKEN_RE = /[a-z0-9]+/g;

export function tokenize(text: string): string[] {
  const lowered = text.toLowerCase().replace(URL_RE, " urltoken ");
  return lowered.match(TOKEN_RE) ?? [];
}

export function tokenSet(text: string): Set<string> {
  return new Set(tokenize(text));
}
