// The verification gate. A language-model officer may only argue from the
// record; anything it puts inside quotation marks must literally exist in
// that record or in the message itself. Speeches that fail the gate are not
// shown — the scripted bench takes the floor instead. A court that quotes
// fabricated evidence is worse than no court at all.

export interface GroundingCheck {
  ok: boolean;
  reason?: string;
  fabricated: string[];
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

// Split on ellipses so "…and then some…" is checked as its parts.
function quoteParts(quote: string): string[] {
  return quote
    .split(/…|\.\.\./)
    .map((p) => p.trim())
    .filter((p) => p.length >= 10);
}

export function validateGrounding(speech: string, record: string): GroundingCheck {
  const recordNorm = normalize(record);
  const fabricated: string[] = [];
  const quoteRe = /["“]([^"”]{8,300})["”]/g;
  let m: RegExpExecArray | null;
  while ((m = quoteRe.exec(speech)) !== null) {
    const parts = quoteParts(m[1]);
    for (const part of parts) {
      if (!recordNorm.includes(normalize(part))) {
        fabricated.push(part);
      }
    }
  }
  if (fabricated.length > 0) {
    return { ok: false, reason: "quoted words that do not exist in the record", fabricated };
  }
  return { ok: true, fabricated: [] };
}

export function validateClerk(speech: string, courtScore: number): GroundingCheck {
  const hasVerdict = /(guilty|acquitted|hung jury)/i.test(speech);
  if (!hasVerdict) return { ok: false, reason: "no recommended verdict stated", fabricated: [] };
  const numbers = speech.match(/\d+(?:\.\d+)?/g) ?? [];
  const target = courtScore * 100;
  const close = numbers.some((n) => {
    const v = Number(n);
    return Math.abs(v - target) <= 1.5 || Math.abs(v / 100 - courtScore) <= 0.015;
  });
  if (!close) return { ok: false, reason: "court score not stated accurately", fabricated: [] };
  if (speech.trim().length < 60) return { ok: false, reason: "memo too short to be a memo", fabricated: [] };
  return { ok: true, fabricated: [] };
}

// Degenerate-output guard: quantised backends occasionally collapse into
// repetition ("Your!!!!!!!…"). Such text carries no information and must
// never reach the bench.
export function validateShape(speech: string, minChars: number): GroundingCheck {
  const s = speech.trim();
  if (s.length < minChars) return { ok: false, reason: `too short (${s.length} chars)`, fabricated: [] };
  if (/(.)\1{9,}/.test(s)) return { ok: false, reason: "degenerate repetition", fabricated: [] };
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  const top = Math.max(...counts.values());
  if (top / s.length > 0.3) return { ok: false, reason: "one character dominates the text", fabricated: [] };
  const sentences = (s.match(/[.!?](\s|$)/g) ?? []).length;
  if (sentences < 2) return { ok: false, reason: "no sentence structure", fabricated: [] };
  return { ok: true, fabricated: [] };
}

export function validateSpeech(
  speech: string,
  record: string,
  role: "prosecutor" | "defence" | "clerk",
  courtScore: number
): GroundingCheck {
  const shape = validateShape(speech, role === "clerk" ? 110 : 100);
  if (!shape.ok) return shape;
  const grounding = validateGrounding(speech, record);
  if (!grounding.ok) return grounding;
  if (role === "clerk") return validateClerk(speech, courtScore);
  return { ok: true, fabricated: [] };
}
