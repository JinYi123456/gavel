"use client";

// The courtroom itself: the state machine that books a case, stamps the
// exhibits, seats the bench, hands you the gavel, and sentences what you
// convicted. Everything forensic runs on this device; the language-model
// officers are an upgrade, never a dependency.

import { useCallback, useEffect, useRef, useState } from "react";
import { adjudicate, type Adjudication, type Verdict } from "../../lib/engine/fusion.ts";
import { streamTrial } from "../../lib/agents/streamClient.ts";
import { newCaseId, saveCase } from "../../lib/ui/archive.ts";
import {
  isMuted,
  setMuted,
  sfxChime,
  sfxGavelKnock,
  sfxPaper,
  sfxStamp,
  sfxVerdictAcquitted,
  sfxVerdictGuilty,
  sfxVerdictHung,
} from "../../lib/ui/sfx.ts";
import IntakeDesk from "./IntakeDesk";
import CaseDocument from "./CaseDocument";
import BenchPanel, { type SpeechState } from "./BenchPanel";
import GavelControl from "./GavelControl";
import VerdictBanner from "./VerdictBanner";
import SentencingDesk from "./SentencingDesk";
import TranscriptPanel, { type TraceRow } from "./TranscriptPanel";

const MAX_REVEAL = 7;

export default function Courtroom() {
  const [message, setMessage] = useState<string | null>(null);
  const [adjudication, setAdjudication] = useState<Adjudication | null>(null);
  const [caseId, setCaseId] = useState("");
  const [dateIso, setDateIso] = useState("");
  const [reveals, setReveals] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [speeches, setSpeeches] = useState<SpeechState[]>([]);
  const [speakersVisible, setSpeakersVisible] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [benchMode, setBenchMode] = useState<"waiting" | "live" | "scripted">("waiting");
  const [gavelReady, setGavelReady] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [trace, setTrace] = useState<TraceRow[]>([]);
  const [mute, setMute] = useState(false);
  const t0 = useRef(0);
  const trialToken = useRef(0);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMute(isMuted());
    return () => {
      timeouts.current.forEach(clearTimeout);
    };
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timeouts.current.push(setTimeout(fn, ms));
  }, []);

  const stamp = useCallback((stage: string, detail: string) => {
    const at = ((performance.now() - t0.current) / 1000).toFixed(2) + "s";
    setTrace((rows) => [...rows, { at, stage, detail }]);
  }, []);

  const startTrial = useCallback(
    (text: string) => {
      const begun = performance.now();
      t0.current = begun;
      const adj = adjudicate(text);
      const id = newCaseId();
      const now = new Date();
      setMessage(text);
      setAdjudication(adj);
      setCaseId(id);
      setDateIso(now.toISOString().slice(0, 19).replace("T", " "));
      setReveals(0);
      setSpeeches([]);
      setNotice(null);
      setBenchMode("waiting");
      setGavelReady(false);
      setVerdict(null);
      setTrace([]);
      sfxPaper();
      sfxGavelKnock();

      const ms = (performance.now() - begun).toFixed(1);
      stamp(
        "Adjudication",
        `${ms} ms on this device · clerk's reading ${adj.verdict.toUpperCase()} · score ${(adj.score * 100).toFixed(1)}/100`
      );

      const lettered = adj.exhibits.filter((e) => e.kind === "charge" || e.kind === "address").slice(0, MAX_REVEAL);
      let shown = 0;
      const revealNext = () => {
        if (shown >= lettered.length) {
          later(() => setSpeakersVisible(true), 420);
          return;
        }
        const ex = lettered[shown];
        shown += 1;
        setReveals(shown);
        sfxStamp();
        stamp(`Exhibit ${String.fromCharCode(64 + shown)}`, `${ex.title} — ${(ex.severity ?? 0).toFixed(2)}`);
        later(revealNext, 640);
      };
      later(revealNext, 760);

      // The officers are drafted while the exhibits are still being stamped —
      // their words are buffered and validated server-side, then screened as
      // soon as the bench opens.
      const token = ++trialToken.current;
      const mine = () => trialToken.current === token;
      setSpeeches([
        { who: "prosecutor", text: "", status: "idle" },
        { who: "defence", text: "", status: "idle" },
        { who: "clerk", text: "", status: "idle" },
      ]);
      setSpeakersVisible(false);
      void streamTrial(text, adj, {
        onSpeakerStart(who) {
          if (!mine()) return;
          setSpeeches((prev) =>
            prev.map((s) => (s.who === who ? { ...s, status: "speaking", text: "" } : s))
          );
          stamp(who === "prosecutor" ? "Prosecutor" : who === "defence" ? "Defence" : "Clerk", "takes the floor");
        },
        onDelta(who, delta) {
          if (!mine()) return;
          setSpeeches((prev) => prev.map((s) => (s.who === who ? { ...s, text: s.text + delta } : s)));
        },
        onSpeakerEnd(who, mode) {
          if (!mine()) return;
          setBenchMode(mode);
          setSpeeches((prev) => prev.map((s) => (s.who === who ? { ...s, status: "done", mode } : s)));
          stamp(who === "clerk" ? "Bench memo" : who === "prosecutor" ? "Prosecutor" : "Defence", `filed (${mode})`);
        },
        onNotice(note) {
          if (!mine()) return;
          setNotice(note);
        },
        onDone() {
          if (!mine()) return;
          setGavelReady(true);
          sfxChime();
          stamp("Gavel", "the court is ready for the verdict");
        },
      });
    },
    [later, stamp]
  );

  const confirmVerdict = useCallback(
    (chosen: Verdict) => {
      if (!adjudication || !message) return;
      setVerdict(chosen);
      if (chosen === "guilty") sfxVerdictGuilty();
      else if (chosen === "acquitted") sfxVerdictAcquitted();
      else sfxVerdictHung();
      stamp(
        "Verdict",
        `${chosen.toUpperCase()} entered by the judge${chosen !== adjudication.verdict ? ` (overruling the clerk's ${adjudication.verdict.toUpperCase()})` : ""}`
      );
      saveCase({
        id: caseId,
        judgedAt: new Date().toISOString(),
        messagePreview: message.slice(0, 140),
        verdict: chosen,
        recommendation: adjudication.verdict,
        score: adjudication.score,
        exhibits: adjudication.exhibits.length,
        overruled: chosen !== adjudication.verdict,
      });
      later(() => {
        bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 350);
    },
    [adjudication, caseId, later, message, stamp]
  );

  const reset = useCallback(() => {
    trialToken.current++;
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    setMessage(null);
    setAdjudication(null);
    setReveals(0);
    setSpeeches([]);
    setSpeakersVisible(false);
    setGavelReady(false);
    setVerdict(null);
    setTrace([]);
  }, []);

  const letteredTotal = adjudication
    ? adjudication.exhibits.filter((e) => e.kind === "charge" || e.kind === "address").length
    : 0;

  return (
    <div>
      {!message && (
        <>
          <section className="hero">
            <div>
              <span className="kicker">An agentic courtroom for scam defence</span>
              <h1 className="hero-title">
                Every scam gets a <span className="accent">fair trial</span>.
              </h1>
              <p className="lede">
                Paste a suspicious message, a link, a QR photo, a letter or a voice note. The forensic tools enter
                exhibits on this device, officers of the court argue, and the verdict is yours to sign.
              </p>
              <div className="hero-rule">
                <span>The AI investigates. You judge. Nothing is blocked or sent for you.</span>
              </div>
              <div style={{ marginTop: 24 }}>
                <IntakeDesk onSubmit={startTrial} />
              </div>
            </div>
            <aside className="panel hero-side">
              <h3>How the court works</h3>
              <ul>
                <li>
                  <strong>Book a case.</strong> A message, link, QR photo, document or voice note. Decoders and
                  analysis run on your device.
                </li>
                <li>
                  <strong>Exhibits are entered.</strong> Quotes pinned to the words that raised them, link anatomy,
                  a calibrated language reading.
                </li>
                <li>
                  <strong>Officers argue.</strong> A prosecutor, a defence and a clerk — then the gavel is yours.
                </li>
                <li>
                  <strong>Sentence is served.</strong> Protection order, cooling-off clock, a redacted alert for the
                  people who trust you.
                </li>
              </ul>
              <hr className="hairline" />
              <p className="type muted-note">
                Held out, the bench&#39;s readings: precision 96.8% · false alarms 0.44% · abstains when the record is
                split. The numbers live in the open, on the &quot;How the court works&quot; page.
              </p>
            </aside>
          </section>
        </>
      )}

      {message && adjudication && (
        <>
          <div className="intake-row" style={{ justifyContent: "space-between", marginTop: 0 }}>
            <span className="kicker">
              In session · {caseId}
            </span>
            <span style={{ display: "inline-flex", gap: 8 }}>
              <button className="btn btn-ghost btn-small" onClick={() => { setMute(!mute); setMuted(!mute); }}>
                {mute ? "Sound: off" : "Sound: on"}
              </button>
              <button className="btn btn-ghost btn-small" onClick={reset}>
                New case
              </button>
            </span>
          </div>

          <div className="court-grid">
            <div>
              <CaseDocument
                caseId={caseId}
                dateIso={dateIso}
                message={message}
                adjudication={adjudication}
                reveals={reveals}
                onActivate={setActiveId}
                activeId={activeId}
              />
              {letteredTotal > MAX_REVEAL && reveals >= MAX_REVEAL && (
                <p className="muted-note" style={{ marginTop: 10 }}>
                  {MAX_REVEAL} of {letteredTotal} exhibits shown on the rail; the full docket is in the transcript
                  below.
                </p>
              )}
              <TranscriptPanel
                rows={trace}
                mode={benchMode}
                model={benchMode === "live" ? "Featherless" : undefined}
              />
            </div>

            <div>
              {speakersVisible ? (
                <BenchPanel speeches={speeches} notice={notice} />
              ) : (
                <div className="panel panel-pad" style={{ textAlign: "center" }}>
                  <span className="kicker">The bench is taking its seats</span>
                  <p className="muted-note" style={{ marginTop: 8 }}>
                    Exhibits are being stamped; the officers are reading the record.
                  </p>
                </div>
              )}

              {!gavelReady && !verdict && (
                <GavelControl recommendation={adjudication.verdict} disabled onConfirm={() => {}} />
              )}
              {gavelReady && !verdict && (
                <GavelControl recommendation={adjudication.verdict} onConfirm={confirmVerdict} />
              )}

              {verdict && (
                <div ref={bannerRef}>
                  <VerdictBanner
                    verdict={verdict}
                    recommendation={adjudication.verdict}
                    score={adjudication.score}
                    caseId={caseId}
                  />
                  <SentencingDesk
                    verdict={verdict}
                    adjudication={adjudication}
                    message={message}
                    caseId={caseId}
                  />
                  <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="btn btn-primary btn-small" onClick={reset}>
                      Judge another case
                    </button>
                    <a className="btn btn-ghost btn-small" href="/cases">
                      View your case files
                    </a>
                    <a className="btn btn-ghost btn-small" href="/school">
                      Learn this scam type in Law School
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
