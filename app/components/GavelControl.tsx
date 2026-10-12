"use client";

// The judge's hand. A verdict is chosen on the stamp pads — then confirmed by
// holding the gavel until it swings. Nothing decides for you; the gavel only
// signs what you chose.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Verdict } from "../../lib/engine/fusion.ts";
import { sfxGavelKnock } from "../../lib/ui/sfx.ts";

interface Props {
  recommendation: Verdict;
  disabled?: boolean;
  onConfirm: (verdict: Verdict) => void;
}

const HOLD_MS = 900;

const PADS: { tone: Verdict; label: string; sub: string }[] = [
  { tone: "guilty", label: "GUILTY", sub: "convict the message — scam" },
  { tone: "acquitted", label: "ACQUITTED", sub: "release it — genuine" },
  { tone: "hung", label: "HUNG JURY", sub: "can't tell — verify" },
];

export default function GavelControl({ recommendation, disabled, onConfirm }: Props) {
  const [selected, setSelected] = useState<Verdict>(recommendation);
  const [progress, setProgress] = useState(0);
  const [swinging, setSwinging] = useState(false);
  const raf = useRef<number | null>(null);
  const holdStart = useRef<number>(0);
  const fired = useRef(false);

  useEffect(() => {
    setSelected(recommendation);
  }, [recommendation]);

  const stopHold = useCallback(() => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    if (!fired.current) setProgress(0);
  }, []);

  const startHold = useCallback(() => {
    if (disabled || fired.current) return;
    holdStart.current = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - holdStart.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        fired.current = true;
        setSwinging(true);
        sfxGavelKnock();
        window.setTimeout(() => onConfirm(selected), 260);
        window.setTimeout(() => setSwinging(false), 900);
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [disabled, onConfirm, selected]);

  useEffect(() => () => stopHold(), [stopHold]);

  const overruling = selected !== recommendation;

  return (
    <div className="gavel-zone">
      <span className="kicker">Deliver your verdict</span>
      <div className="stamp-pads" style={{ marginTop: 12 }}>
        {PADS.map((pad) => (
          <button
            key={pad.tone}
            className="pad"
            data-tone={pad.tone}
            aria-pressed={selected === pad.tone}
            disabled={disabled}
            onClick={() => setSelected(pad.tone)}
          >
            {pad.label}
            <small>{pad.tone === recommendation ? "the clerk's reading" : pad.sub}</small>
          </button>
        ))}
      </div>

      <button
        className="gavel-btn"
        data-swinging={swinging}
        style={{ "--progress": progress } as React.CSSProperties}
        onPointerDown={startHold}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            if (!e.repeat) startHold();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === " " || e.key === "Enter") stopHold();
        }}
        disabled={disabled}
        aria-label="Hold to swing the gavel and deliver the verdict"
      >
        <span className="gavel-ring" aria-hidden="true" />
        <span className="gavel-disc">
          <svg viewBox="0 0 64 64" width="66" height="66" aria-hidden="true">
            <g transform="rotate(-35 32 32)">
              <rect x="12" y="26" width="34" height="12" rx="3" fill="#c9a24a" />
              <rect x="10" y="22" width="8" height="20" rx="2" fill="#8a6a2a" />
              <rect x="38" y="22" width="8" height="20" rx="2" fill="#8a6a2a" />
              <rect x="44" y="29" width="14" height="6" rx="3" fill="#e8cf8a" />
            </g>
            <rect x="14" y="50" width="36" height="6" rx="3" fill="#8a6a2a" />
          </svg>
        </span>
      </button>

      <p className="gavel-hint">
        {disabled
          ? "The bench is still speaking…"
          : progress > 0
            ? "Hold…"
            : overruling
              ? "Holding the gavel overrules the clerk. Hold to sign it."
              : "Hold the gavel to sign the verdict."}
      </p>
    </div>
  );
}
