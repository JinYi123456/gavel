// The scripted bench. When no language-model service is available — offline,
// rate-limited, or deliberately switched off — the court still sits: these
// functions compile real, grounded speeches from the exhibits the forensic
// tools already produced. Nothing here is canned filler; every sentence is
// derived from this case's own evidence.

import type { Adjudication, Exhibit } from "../engine/fusion.ts";

export interface ScriptedSpeech {
  who: "prosecutor" | "defence" | "clerk";
  text: string;
}

const LETTERS = "ABCDEFGHIJKL";

export function exhibitLetter(index: number): string {
  return LETTERS[index] ?? `X${index + 1}`;
}

function topExhibits(adj: Adjudication, n: number): Exhibit[] {
  return adj.exhibits
    .filter((e) => e.kind === "charge" || e.kind === "address")
    .slice(0, n);
}

function quote(s: string): string {
  return `\u201c${s}\u201d`;
}

export function scriptedSpeeches(message: string, adj: Adjudication): ScriptedSpeech[] {
  return [
    { who: "prosecutor", text: prosecutorSpeech(adj) },
    { who: "defence", text: defenceSpeech(adj) },
    { who: "clerk", text: clerkMemo(adj) },
  ];
}

function prosecutorSpeech(adj: Adjudication): string {
  const tops = topExhibits(adj, 3);
  const lines: string[] = [];

  if (tops.length === 0) {
    lines.push("Your Honor, the People have examined this message and enter nothing. No charge; no hostile address.");
    lines.push("On this record the People have no case to press.");
    return lines.join("\n\n");
  }

  const n = adj.exhibits.filter((e) => e.kind === "charge" || e.kind === "address").length;
  lines.push(
    `Your Honor, the People bring ${n === 1 ? "a single exhibit" : `${n} exhibits`} against this message.`
  );

  for (const [i, ex] of tops.entries()) {
    const letter = exhibitLetter(i);
    if (ex.kind === "charge") {
      lines.push(
        `Exhibit ${letter} — ${ex.title}. The message says, in its own words: ${quote(ex.quote ?? "")}. ${ex.detail}`
      );
    } else {
      lines.push(`Exhibit ${letter} — ${ex.title}. ${ex.detail}`);
    }
  }

  if (adj.verdict === "guilty") {
    lines.push("Each exhibit stands on its own; together they leave no innocent reading standing. The People ask this court to convict the message.");
  } else if (adj.verdict === "hung") {
    lines.push("The People will not overstate the record: a gap remains. We ask the court to weigh what stands and send the rest to verification.");
  } else {
    lines.push("The People acknowledge the record before this court is thin. On what is entered, we do not press for conviction.");
  }
  return lines.join("\n\n");
}

function defenceSpeech(adj: Adjudication): string {
  const protective = adj.protectiveExhibits;
  const official = adj.urls.reports.filter((r) => r.isOfficial);
  const lines: string[] = [];

  if (protective.length > 0) {
    const p = protective[0];
    lines.push(
      `The defence notes, first, that this message carries the language of a genuine notice: ${quote(p.quote ?? "")} — ${p.title.toLowerCase()}. Scams omit exactly this.`
    );
  }
  if (official.length > 0) {
    const brand = official[0].officialBrand?.name ?? official[0].registrable;
    lines.push(`The address in question resolves to ${brand}'s own verified domain, ${official[0].registrable} — the opposite of impersonation.`);
  }
  if (protective.length > 1 || official.length > 1) {
    lines.push("Taken together, the hallmarks of a forgery are absent from the record the prosecution itself entered.");
  }

  if (adj.verdict === "acquitted") {
    lines.push("The defence rests on what the People did not find: no demand for secrets, no threat, no borrowed name. This reads as ordinary traffic.");
  } else if (adj.verdict === "hung") {
    lines.push("The record before this court is genuinely split — " + (protective.length > 0 || official.length > 0 ? "the protective marks cut against the charge, while hostile ones cut toward it. " : "the signs are too faint to convict. ") + "The defence urges verification through official channels, not a conviction on this paper.");
  } else if (protective.length > 0 || official.length > 0) {
    lines.push("The defence concedes these protective marks are real — but they sit beside signals that no genuine sender would show. Good manners, Your Honor, do not un-ask for a TAC.");
  } else {
    lines.push("The defence has searched this message for an innocent reading and found none. The words make a demand, and the demand has no honest source. The defence will not waste the court's time.");
  }
  return lines.join("\n\n");
}

function clerkMemo(adj: Adjudication): string {
  const charges = adj.exhibits.filter((e) => e.kind === "charge").length;
  const addresses = adj.exhibits.filter((e) => e.kind === "address").length;
  const protective = adj.protectiveExhibits.length;
  const langPct = (adj.text.probability * 100).toFixed(1);
  const verdictWord = adj.verdict === "guilty" ? "GUILTY" : adj.verdict === "acquitted" ? "ACQUITTED" : "HUNG JURY";

  const parts: string[] = [];
  parts.push(
    `Your Honor, the record: the language scorer reads this message as ${langPct}% scam-like; the statute book entered ${charges} ${charges === 1 ? "charge" : "charges"}; the address examiner reported on ${addresses} ${addresses === 1 ? "finding" : "findings"}${protective > 0 ? `; the defence entered ${protective} protective ${protective === 1 ? "mark" : "marks"}` : ""}.`
  );
  if (adj.policyNotes.length > 0) {
    parts.push(adj.policyNotes[0]);
  }
  parts.push(
    `On the whole record the clerk recommends: ${verdictWord} — court score ${(adj.score * 100).toFixed(1)} of 100. The court awaits your gavel, Your Honor.`
  );
  return parts.join("\n\n");
}
