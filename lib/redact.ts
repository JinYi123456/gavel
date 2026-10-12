// Redaction, the way a court clerk would do it: mask the judge's own personal
// identifiers before anything is shared with family or filed as a report —
// while keeping the scammer's numbers and links intact as evidence.

const PHONE_MY = /(\+?60|0)1\d[- ]?\d{3,4}[- ]?\d{3,4}\b/g;
const LANDLINE_MY = /\b0[3-9][- ]?\d{3,4}[- ]?\d{4}\b/g;
const IC_MY = /\b\d{6}[- ]?\d{2}[- ]?\d{4}\b/g;
const CARD = /\b\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{4}\b/g;
const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;

export interface RedactionResult {
  text: string;
  found: number;
}

export function redactPersonal(text: string, keepPhones = false): RedactionResult {
  let found = 0;
  const count = (m: string) => {
    found++;
    return m;
  };
  let out = text;
  if (!keepPhones) {
    out = out.replace(PHONE_MY, count).replace(LANDLINE_MY, count);
  }
  out = out
    .replace(IC_MY, count)
    .replace(CARD, count)
    .replace(EMAIL, count);
  const placeholder = keepPhones ? "[hidden]" : "[hidden number]";
  out = out
    .replace(/\[hidden number\]/g, placeholder)
    .replace(/\[hidden\]/g, "[hidden]");
  return { text: out, found };
}
