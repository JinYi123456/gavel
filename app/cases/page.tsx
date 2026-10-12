"use client";

// The court's filing cabinet: every verdict the judge has signed, kept on
// this device. Rank, streak, record — earned by judging.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { clearCases, computeStats, loadCases, type ArchiveStats, type CaseRecord } from "../../lib/ui/archive";

export default function CaseFilesPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const all = loadCases();
    setCases(all);
    setStats(computeStats(all));
    setLoaded(true);
  }, []);

  const wipe = useCallback(() => {
    if (!window.confirm("Clear the whole archive on this device? The verdicts cannot be recovered.")) return;
    clearCases();
    setCases([]);
    setStats(computeStats([]));
  }, []);

  if (!loaded) {
    return (
      <div className="panel panel-pad">
        <span className="loading-dots type muted-note">opening the cabinet</span>
      </div>
    );
  }

  return (
    <div>
      <span className="kicker">Case files</span>
      <h1 style={{ margin: "6px 0 12px" }}>Your record on the bench</h1>
      <p className="lede">
        Every verdict lives here — on this device, never on a server. The archive stores the ruling, not the message.
      </p>

      {stats && (
        <>
          <div style={{ margin: "20px 0" }}>
            <span className="rank-plate">
              <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                <path d="M12 2 3 6v5c0 5 3.8 9.3 9 11 5.2-1.7 9-6 9-11V6l-9-4z" fill="#c9a24a" />
                <path d="M12 5 5 8v3c0 3.8 2.8 7 7 8.4 4.2-1.4 7-4.6 7-8.4V8l-7-3z" fill="#2c2012" />
              </svg>
              <span className="rank-title">{stats.rank.title}</span>
              <span className="type" style={{ fontSize: 12.5 }}>
                {stats.nextRankAt !== null ? `${stats.nextRankAt - stats.total} more to the next rank` : "the highest seat"}
              </span>
            </span>
          </div>

          <div className="stats-grid">
            <div className="panel stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">cases judged</div>
            </div>
            <div className="panel stat-card">
              <div className="stat-value" style={{ color: "var(--oxblood)" }}>{stats.guilty}</div>
              <div className="stat-label">convicted</div>
            </div>
            <div className="panel stat-card">
              <div className="stat-value" style={{ color: "var(--green-dark)" }}>{stats.acquitted}</div>
              <div className="stat-label">acquitted</div>
            </div>
            <div className="panel stat-card">
              <div className="stat-value" style={{ color: "var(--brass-dark)" }}>{stats.hung}</div>
              <div className="stat-label">hung juries</div>
            </div>
            <div className="panel stat-card">
              <div className="stat-value">{stats.streak}</div>
              <div className="stat-label">day streak</div>
            </div>
            <div className="panel stat-card">
              <div className="stat-value">{stats.overruled}</div>
              <div className="stat-label">clerk overruled</div>
            </div>
          </div>
        </>
      )}

      {cases.length === 0 ? (
        <div className="panel panel-pad" style={{ textAlign: "center" }}>
          <p className="muted-note" style={{ marginBottom: 12 }}>
            The cabinet is empty. Judge your first case and it will be filed here.
          </p>
          <Link className="btn btn-primary" href="/">
            Go to the courtroom
          </Link>
        </div>
      ) : (
        <>
          <div className="case-list">
            {cases.map((c) => (
              <div key={c.id + c.judgedAt} className="case-row">
                <span className="type">{c.id}</span>
                <span className="stamp stamp-sm" data-tone={c.verdict}>
                  {c.verdict === "hung" ? "hung" : c.verdict}
                </span>
                <span className="case-preview">{c.messagePreview}</span>
                <span className="type" style={{ textAlign: "right" }}>
                  {(c.score * 100).toFixed(0)}/100 · {c.judgedAt.slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
            <Link className="btn btn-primary btn-small" href="/">
              Judge another case
            </Link>
            <button className="btn btn-ghost btn-small" onClick={wipe}>
              Clear the archive
            </button>
          </div>
        </>
      )}
    </div>
  );
}
