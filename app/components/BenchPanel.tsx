"use client";

// The bench: the three officers of the court speak in turn. The clerk's card
// is the memo; the others are argument. Text streams in as it is produced —
// live from the language models, or typed from the scripted record.

export interface SpeechState {
  who: "prosecutor" | "defence" | "clerk";
  text: string;
  status: "idle" | "speaking" | "done";
  mode?: "live" | "scripted";
}

interface Props {
  speeches: SpeechState[];
  notice: string | null;
}

const ROLE: Record<SpeechState["who"], { name: string; initial: string; cls: string }> = {
  prosecutor: { name: "The Prosecutor", initial: "P", cls: "speaker-op" },
  defence: { name: "The Defence", initial: "D", cls: "speaker-def" },
  clerk: { name: "The Clerk — bench memo", initial: "C", cls: "speaker-clerk" },
};

export default function BenchPanel({ speeches, notice }: Props) {
  const started = speeches.some((s) => s.status !== "idle");

  return (
    <div className="bench" aria-live="polite">
      {!started && (
        <div className="panel panel-pad" style={{ textAlign: "center" }}>
          <span className="kicker">The bench is quiet</span>
          <p className="muted-note" style={{ marginTop: 8 }}>
            Officers of the court will argue the exhibits here.
          </p>
        </div>
      )}

      {speeches.map((speech) => {
        if (speech.status === "idle" && !started) return null;
        const role = ROLE[speech.who];
        return (
          <div key={speech.who} className={`speaker ${role.cls}`}>
            <div className="medallion" aria-hidden="true">
              {role.initial}
            </div>
            <div className={`speech ${speech.who === "clerk" ? "memo-card" : ""}`}>
              <div className="speech-head">
                <span className="speech-role">{role.name}</span>
                <span className="speech-status">
                  {speech.status === "speaking" ? "speaking" : speech.status === "done" ? (speech.mode === "live" ? "filed" : "filed (scripted)") : "waiting"}
                </span>
              </div>
              <div className="speech-text">
                {speech.text}
                {speech.status === "speaking" && speech.text === "" && (
                  <span className="loading-dots type muted-note">deliberating</span>
                )}
                {speech.status === "speaking" && speech.text !== "" && <span className="caret" />}
              </div>
              {speech.status === "idle" && <span className="loading-dots type muted-note">thinking</span>}
            </div>
          </div>
        );
      })}

      {notice && (
        <p className="muted-note" style={{ fontFamily: "var(--font-type-stack)", fontSize: 12.5 }}>
          {notice}
        </p>
      )}
    </div>
  );
}
