"use client";

// The case file: the message itself, first as it arrived, then wearing every
// exhibit the tools found — quotes underlined and lettered like a marked-up
// submission a lawyer would hand the bench.

import type { Adjudication } from "../../lib/engine/fusion.ts";
import { exhibitLetter } from "../../lib/agents/scripted.ts";

interface Props {
  caseId: string;
  dateIso: string;
  message: string;
  adjudication: Adjudication;
  reveals: number;
  onActivate: (id: string | null) => void;
  activeId: string | null;
}

interface Mark {
  start: number;
  end: number;
  index: number;
}

const LETTERED_KINDS = new Set(["charge", "address"]);

export default function CaseDocument({ caseId, dateIso, message, adjudication, reveals, onActivate, activeId }: Props) {
  const lettered = adjudication.exhibits.filter((e) => LETTERED_KINDS.has(e.kind));
  const shown = lettered.slice(0, reveals);

  const marks: Mark[] = [];
  const lower = message.toLowerCase();
  shown.forEach((ex, index) => {
    if (!ex.quote) return;
    const q = ex.quote.toLowerCase().trim();
    if (q.length < 3) return;
    let from = 0;
    for (;;) {
      const at = lower.indexOf(q, from);
      if (at === -1) break;
      const end = at + q.length;
      const overlapping = marks.some((m) => at < m.end && end > m.start);
      if (!overlapping) {
        marks.push({ start: at, end, index });
        break;
      }
      from = at + 1;
    }
  });
  marks.sort((a, b) => a.start - b.start);

  const segments: { text: string; mark?: Mark }[] = [];
  let cursor = 0;
  for (const m of marks) {
    if (m.start > cursor) segments.push({ text: message.slice(cursor, m.start) });
    segments.push({ text: message.slice(m.start, m.end), mark: m });
    cursor = m.end;
  }
  if (cursor < message.length) segments.push({ text: message.slice(cursor) });

  const severities = shown.map((e) => e.severity ?? 0);

  return (
    <section>
      <div className="casefile">
        <div className="casefile-head">
          <span className="casefile-id">{caseId}</span>
          <span className="casefile-date">{dateIso}</span>
        </div>
        <div className="casefile-body" aria-label="The message under trial">
          {segments.map((seg, i) =>
            seg.mark ? (
              <mark
                key={i}
                className="exhibit-mark"
                data-active={activeId === shown[seg.mark.index]?.id}
                onMouseEnter={() => onActivate(shown[seg.mark.index]?.id ?? null)}
                onMouseLeave={() => onActivate(null)}
                title={shown[seg.mark.index]?.title}
              >
                {seg.text}
                <sup>{exhibitLetter(seg.mark.index)}</sup>
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            )
          )}
        </div>
        <div className="casefile-foot">
          <span className="type muted-note">
            {shown.length} {shown.length === 1 ? "exhibit" : "exhibits"} entered · {adjudication.urls.reports.length}{" "}
            {adjudication.urls.reports.length === 1 ? "address" : "addresses"} examined
          </span>
          {severities.length > 0 && (
            <span className="type muted-note">
              strongest: {(Math.max(...severities) * 100).toFixed(0)}/100
            </span>
          )}
        </div>
      </div>

      {reveals > 0 && (
        <div className="evidence-rail" aria-label="Evidence entered">
          {shown.map((ex, index) => (
            <article
              key={ex.id + index}
              className="exhibit-card"
              data-kind={ex.kind}
              onMouseEnter={() => onActivate(ex.id)}
              onMouseLeave={() => onActivate(null)}
            >
              <span className="exhibit-letter">{exhibitLetter(index)}</span>
              <div className="exhibit-title">
                {ex.title}
                {typeof ex.severity === "number" && (
                  <span className="sev" aria-label={`severity ${(ex.severity * 100).toFixed(0)} of 100`}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <i key={i} data-on={i < Math.max(1, Math.round(ex.severity * 5))} />
                    ))}
                  </span>
                )}
              </div>
              {ex.quote && <div className="exhibit-quote">“{ex.quote}”</div>}
              <p className="exhibit-detail">{ex.detail}</p>
            </article>
          ))}
          {adjudication.protectiveExhibits.length > 0 && reveals >= lettered.length && (
            <article className="exhibit-card" data-kind="protective">
              <span className="exhibit-letter">✓</span>
              <div className="exhibit-title">For the defence</div>
              {adjudication.protectiveExhibits.map((p) => (
                <p key={p.id} className="exhibit-detail" style={{ marginTop: 6 }}>
                  <strong>{p.title}.</strong> {p.quote ? `“${p.quote}” — ` : ""}
                  {p.detail}
                </p>
              ))}
            </article>
          )}
        </div>
      )}
    </section>
  );
}
