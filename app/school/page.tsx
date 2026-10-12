"use client";

// Law School: the court's teaching side. Case law written as a clerk briefs
// it, a Daily Docket that keeps the bench sharp, and drills that turn reading
// into judgement. Progress lives on this device.

import { useCallback, useEffect, useMemo, useState } from "react";
import golden from "../../lib/engine/kb/golden_cases.json";
import { CASE_LAW } from "../../lib/kb/caselaw";
import { DRILLS, type Drill } from "../../lib/kb/drills";
import { computeStats, loadCases, rankFor, type Rank } from "../../lib/ui/archive";

interface DrillProgress {
  answered: Record<string, boolean>;
}

const DRILL_KEY = "gavel.drills.v1";

function loadDrills(): DrillProgress {
  try {
    const raw = localStorage.getItem(DRILL_KEY);
    return raw ? (JSON.parse(raw) as DrillProgress) : { answered: {} };
  } catch {
    return { answered: {} };
  }
}

function saveDrills(p: DrillProgress) {
  try {
    localStorage.setItem(DRILL_KEY, JSON.stringify(p));
  } catch {
    /* private mode */
  }
}

function docketCase() {
  const now = new Date();
  const key = now.getFullYear() * 1000 + now.getMonth() * 40 + now.getDate();
  return golden.cases[key % golden.cases.length];
}

const EXPECT = { guilty: "scam", acquitted: "genuine", hung: "can't tell" } as const;

export default function LawSchoolPage() {
  const [openArticle, setOpenArticle] = useState<string | null>(null);
  const [rank, setRank] = useState<{ rank: Rank; next: Rank | null; total: number }>({
    rank: rankFor(0).rank,
    next: rankFor(0).next,
    total: 0,
  });
  const [docketChoice, setDocketChoice] = useState<string | null>(null);
  const [drillIdx, setDrillIdx] = useState(0);
  const [progress, setProgress] = useState<DrillProgress>({ answered: {} });
  const [drillChoice, setDrillChoice] = useState<string | null>(null);

  useEffect(() => {
    const cases = loadCases();
    const stats = computeStats(cases);
    const { rank: r, next } = rankFor(stats.total);
    setRank({ rank: r, next, total: stats.total });
    setProgress(loadDrills());
  }, []);

  const docket = useMemo(() => docketCase(), []);
  const drill: Drill = DRILLS[drillIdx % DRILLS.length];
  const answeredCount = Object.keys(progress.answered).length;
  const correctCount = Object.values(progress.answered).filter(Boolean).length;

  const answerDrill = useCallback(
    (choice: "scam" | "genuine") => {
      if (drillChoice) return;
      setDrillChoice(choice);
      const correct = choice === drill.answer;
      const next = { answered: { ...progress.answered, [drill.id]: correct } };
      setProgress(next);
      saveDrills(next);
    },
    [drillChoice, drill, progress]
  );

  return (
    <div>
      <span className="kicker">Law School</span>
      <h1 style={{ margin: "6px 0 12px" }}>Learn to read the trick</h1>
      <p className="lede">
        Every scam is a pattern wearing a new costume. Read the case law, take the daily docket, drill until the tells
        jump out at you.
      </p>

      <div style={{ margin: "20px 0" }}>
        <span className="rank-plate">
          <span className="rank-title">{rank.rank.title}</span>
          <span className="type" style={{ fontSize: 12.5 }}>
            {rank.total} {rank.total === 1 ? "case" : "cases"} judged
            {rank.next ? ` · next rank at ${rank.next.at}` : " · the highest seat"}
          </span>
        </span>
      </div>

      <div className="panel docket-card">
        <div>
          <span className="kicker">Daily docket</span>
          <h3 style={{ margin: "6px 0" }}>{docket.title}</h3>
          <p className="type" style={{ fontSize: 13.5, marginBottom: 8 }}>
            {docket.text}
          </p>
          {docketChoice === null ? (
            <div className="drill-options">
              {(["scam", "genuine", "can't tell"] as const).map((c) => (
                <button key={c} className="drill-option" onClick={() => setDocketChoice(c)}>
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <div className="drill-feedback">
              <strong>
                {docketChoice === EXPECT[docket.expected]
                  ? "The bench agrees."
                  : `The bench ruled: ${EXPECT[docket.expected].toUpperCase()}.`}
              </strong>{" "}
              {docket.note}
            </div>
          )}
        </div>
        <span className="type muted-note" style={{ alignSelf: "start" }}>
          one case, every day
        </span>
      </div>

      <h2 style={{ marginTop: 34 }}>The volumes</h2>
      <p className="muted-note" style={{ maxWidth: "62ch" }}>
        Twelve families of fraud, written the way a clerk briefs a judge: how the trick works, the tells, the
        verification, and the principle underneath.
      </p>
      <div className="shelf">
        {CASE_LAW.map((a) => (
          <button
            key={a.id}
            className="volume"
            onClick={() => setOpenArticle(openArticle === a.id ? null : a.id)}
            aria-expanded={openArticle === a.id}
          >
            <span className="vol-ribbon" aria-hidden="true" />
            <span className="vol-kicker">Volume {a.volume}</span>
            <h3>{a.title}</h3>
            <p>{a.hook}</p>
          </button>
        ))}
      </div>

      {openArticle && (
        <article className="panel panel-pad law-article">
          {(() => {
            const a = CASE_LAW.find((x) => x.id === openArticle)!;
            return (
              <>
                <span className="kicker">Volume {a.volume} · {a.title}</span>
                <h3 style={{ margin: "8px 0 12px" }}>{a.hook}</h3>
                <div className="prose">
                  <p>{a.howItWorks}</p>
                  <h3 style={{ fontSize: 17 }}>The tells</h3>
                  <ul>
                    {a.redFlags.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <h3 style={{ fontSize: 17 }}>How to verify</h3>
                  <p>{a.howToVerify}</p>
                  <p className="type" style={{ color: "var(--brass-dark)", fontSize: 13.5 }}>
                    The principle: {a.principle}
                  </p>
                </div>
              </>
            );
          })()}
        </article>
      )}

      <h2 style={{ marginTop: 34 }}>Bench drills</h2>
      <p className="muted-note">
        Rapid judgement practice — {answeredCount > 0 ? `${correctCount}/${answeredCount} correct so far.` : "no answers logged yet."}
      </p>
      <div className="panel panel-pad" style={{ marginTop: 12 }}>
        <span className="kicker">
          Drill {((drillIdx % DRILLS.length) + 1).toString()} of {DRILLS.length}
        </span>
        <p className="type" style={{ fontSize: 14.5, margin: "10px 0 4px" }}>
          {drill.text}
        </p>
        <div className="drill-options">
          {(["scam", "genuine"] as const).map((c) => (
            <button
              key={c}
              className="drill-option"
              disabled={drillChoice !== null}
              data-state={
                drillChoice === null
                  ? undefined
                  : c === drill.answer
                    ? "correct"
                    : c === drillChoice
                      ? "wrong"
                      : undefined
              }
              onClick={() => answerDrill(c)}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
        {drillChoice !== null && (
          <>
            <div className="drill-feedback">{drill.why}</div>
            <button
              className="btn btn-brass btn-small"
              style={{ marginTop: 12 }}
              onClick={() => {
                setDrillIdx((i) => i + 1);
                setDrillChoice(null);
              }}
            >
              Next drill
            </button>
          </>
        )}
      </div>
    </div>
  );
}
