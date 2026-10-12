"use client";

// The court transcript — the agent trail, aired in public. Every stage of the
// trial with its timing: what the tools found, who spoke, how the verdict was
// signed. This is the explainability record, not a marketing panel.

export interface TraceRow {
  at: string;
  stage: string;
  detail: string;
}

interface Props {
  rows: TraceRow[];
  mode: "live" | "scripted" | "waiting";
  model?: string;
}

export default function TranscriptPanel({ rows, mode, model }: Props) {
  return (
    <details className="transcript panel panel-pad">
      <summary>Court transcript — the agent trail</summary>
      <p className="muted-note" style={{ marginBottom: 10 }}>
        {mode === "live"
          ? `Language-model officers: live${model ? ` (${model})` : ""}. The forensic tools always run on this device.`
          : mode === "scripted"
            ? "The officers are reading from the scripted record; the forensic tools ran on this device."
            : "Waiting for the court to sit…"}
      </p>
      {rows.map((row, i) => (
        <div key={i} className="trace-row">
          <span className="type">{row.at}</span>
          <span className="type">{row.stage}</span>
          <span>{row.detail}</span>
        </div>
      ))}
    </details>
  );
}
