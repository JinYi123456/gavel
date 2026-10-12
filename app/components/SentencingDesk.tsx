"use client";

// The sentencing desk: what the judge does with a verdict. Checklists that
// are actually followable in the next five minutes, a cooling-off clock for
// big transfers, and a redacted alert that can be handed to the people who
// trust you — without leaking your own identifiers.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Adjudication, Verdict } from "../../lib/engine/fusion.ts";
import { redactPersonal } from "../../lib/redact.ts";

interface Props {
  verdict: Verdict;
  adjudication: Adjudication;
  message: string;
  caseId: string;
}

const CHECKS: Record<Verdict, string[]> = {
  guilty: [
    "Do not click any link, scan any QR, or call any number from that message.",
    "Do not transfer, pay, or pass on codes — the request itself is the attack.",
    "If money already moved: call your bank's hotline — the number printed on your card — and ask them to freeze the transfer now.",
    "Report: your bank first, then the National Scam Response Centre (997 in Malaysia). Keep this case file as evidence.",
    "Warn the people who trust you — one tap below sends a redacted alert.",
    "Block the sender. Change any password or PIN you shared in that message, starting with your bank.",
  ],
  acquitted: [
    "Keep the notice or receipt — it is evidence, and it helps you spot the real thing next time.",
    "If anything still feels off, verify through the brand's own app before acting.",
    "You have just read a genuine message with the court's calibration on display — that skill transfers.",
  ],
  hung: [
    "Do not act on any deadline from the message. Urgency is the weapon; waiting is armour.",
    "Verify through the official channel: the number on the back of your card, or the app you installed yourself.",
    "Show this case to someone you trust. A second pair of eyes is a real defence.",
    "Bring new information back to court — a fresh message, a call recording — and re-run the case.",
  ],
};

function shareAlert(verdict: Verdict, adjudication: Adjudication, message: string, caseId: string): string {
  const { text } = redactPersonal(message, false);
  const hosts = adjudication.urls.reports.map((r) => r.host);
  const sites = hosts.length > 0 ? hosts.join(", ") : "(no link in the message)";
  const verdictWord = verdict === "guilty" ? "a scam" : verdict === "acquitted" ? "genuine" : "unresolved — verify it";
  return [
    `Scam alert — please read. (case ${caseId})`,
    ``,
    `I checked a suspicious message with GAVEL and the court found it ${verdictWord}.`,
    `Do not click links, scan QR codes, or share OTP/TAC/PIN codes from messages like this.`,
    ``,
    `Message (my personal details removed):`,
    text,
    ``,
    `Link(s) involved: ${sites}`,
    `If you receive something similar: pause, and verify through the official app or the number on your card.`,
  ].join("\n");
}

function reportSummary(verdict: Verdict, adjudication: Adjudication, caseId: string, dateIso: string): string {
  const lines: string[] = [];
  lines.push(`GAVEL — case record ${caseId} (${dateIso})`);
  lines.push(`Verdict entered by judge: ${verdict.toUpperCase()}`);
  lines.push(`Court score: ${(adjudication.score * 100).toFixed(1)} of 100 (clerk's reading: ${adjudication.verdict.toUpperCase()})`);
  lines.push(`Language scorer: ${(adjudication.text.probability * 100).toFixed(1)}% scam-like`);
  lines.push("");
  lines.push("Exhibits entered:");
  adjudication.exhibits.forEach((e, i) => {
    lines.push(`  ${String.fromCharCode(65 + i)}. [${e.id}] ${e.title}${e.quote ? ` — "${e.quote}"` : ""}`);
  });
  if (adjudication.urls.reports.length > 0) {
    lines.push("");
    lines.push("Addresses examined:");
    for (const r of adjudication.urls.reports) {
      lines.push(`  - ${r.host} (${r.isOfficial ? "verified domain" : "not a verified domain"})`);
    }
  }
  lines.push("");
  lines.push("Entered by the judge in the GAVEL courtroom. This record lists quoted evidence for reporting to a bank or the authorities.");
  return lines.join("\n");
}

export default function SentencingDesk({ verdict, adjudication, message, caseId }: Props) {
  const [done, setDone] = useState<boolean[]>(() => CHECKS[verdict].map(() => false));
  const [copied, setCopied] = useState<string | null>(null);
  const [timerLeft, setTimerLeft] = useState(10 * 60);
  const [timerOn, setTimerOn] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDone(CHECKS[verdict].map(() => false));
    setTimerLeft(10 * 60);
    setTimerOn(false);
  }, [verdict]);

  useEffect(() => {
    if (!timerOn) return;
    tickRef.current = setInterval(() => {
      setTimerLeft((s) => {
        if (s <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          setTimerOn(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [timerOn]);

  const dateIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const alertText = useMemo(() => shareAlert(verdict, adjudication, message, caseId), [verdict, adjudication, message, caseId]);
  const reportText = useMemo(() => reportSummary(verdict, adjudication, caseId, dateIso), [verdict, adjudication, caseId, dateIso]);

  const copy = useCallback(async (what: "alert" | "report") => {
    const payload = what === "alert" ? alertText : reportText;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }, [alertText, reportText]);

  const mm = String(Math.floor(timerLeft / 60)).padStart(2, "0");
  const ss = String(timerLeft % 60).padStart(2, "0");

  return (
    <div className="sentencing">
      <div className="panel sentence-card">
        <h3>The sentence — what to do now</h3>
        {CHECKS[verdict].map((item, i) => (
          <div key={i} className="check-item" data-done={done[i]}>
            <span
              className="check-box"
              role="checkbox"
              aria-checked={done[i]}
              tabIndex={0}
              onClick={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  setDone((d) => d.map((v, j) => (j === i ? !v : v)));
                }
              }}
            />
            <span>{item}</span>
          </div>
        ))}
      </div>

      {verdict === "guilty" && (
        <div className="panel sentence-card">
          <h3>Cooling-off clock</h3>
          <p className="muted-note" style={{ marginBottom: 10 }}>
            Scams run on the clock. Start ten minutes and do nothing money-related until it rings. You can cancel the
            transfer afterwards if it still looks right — you cannot un-send it.
          </p>
          <div className="timer-row">
            <span className="timer-display">
              {mm}:{ss}
            </span>
            <button className="btn btn-brass btn-small" onClick={() => setTimerOn((v) => !v)}>
              {timerOn ? "Pause" : timerLeft === 0 ? "Done" : "Start the clock"}
            </button>
            <button className="btn btn-ghost btn-small" onClick={() => { setTimerOn(false); setTimerLeft(10 * 60); }}>
              Reset
            </button>
          </div>
        </div>
      )}

      <div className="panel sentence-card">
        <h3>Warn the people who trust you</h3>
        <p className="muted-note" style={{ marginBottom: 10 }}>
          Your personal identifiers are masked; the scammer's links stay visible as evidence. Send it as it is.
        </p>
        <textarea className="share-box" readOnly value={alertText} aria-label="Redacted share alert" />
        <div className="timer-row" style={{ marginTop: 10 }}>
          <button className="btn btn-primary btn-small" onClick={() => void copy("alert")}>
            Copy the alert
          </button>
          <button className="btn btn-ghost btn-small" onClick={() => void copy("report")}>
            Copy the case record for reporting
          </button>
          {copied && <span className="copy-note">Copied to clipboard.</span>}
        </div>
      </div>
    </div>
  );
}
