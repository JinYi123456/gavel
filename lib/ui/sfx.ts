// The court's sound design, synthesised with WebAudio — no audio files, no
// licensing, nothing to download. The AudioContext is created lazily on the
// first user gesture (browsers require it), and every call is a no-op when
// sound is muted or the API is unavailable.

let ctx: AudioContext | null = null;
let muted = false;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (muted) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem("gavel.muted", value ? "1" : "0");
  } catch {
    /* private mode */
  }
}

export function isMuted(): boolean {
  try {
    return localStorage.getItem("gavel.muted") === "1";
  } catch {
    return false;
  }
}

function noiseBuffer(ac: AudioContext, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ac.sampleRate * seconds));
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function thump(ac: AudioContext, at: number, freq: number, gain: number, decay: number) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.6), at + decay);
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(g).connect(ac.destination);
  osc.start(at);
  osc.stop(at + decay + 0.02);
}

function crack(ac: AudioContext, at: number, gain: number, decay: number, bandHz: number) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, decay);
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = bandHz;
  filter.Q.value = 0.8;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(at);
  src.stop(at + decay + 0.01);
}

function tone(ac: AudioContext, at: number, freq: number, gain: number, duration: number, type: OscillatorType = "triangle") {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

// ---- the sounds of court ----

export function sfxGavelKnock() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  thump(ac, t, 120, 0.5, 0.22);
  crack(ac, t, 0.35, 0.09, 900);
  thump(ac, t + 0.16, 110, 0.35, 0.2);
  crack(ac, t + 0.16, 0.25, 0.08, 800);
}

export function sfxStamp() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  crack(ac, t, 0.4, 0.07, 500);
  thump(ac, t, 90, 0.4, 0.15);
}

export function sfxTick() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  crack(ac, t, 0.06, 0.015, 2400);
}

export function sfxPaper() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac, 0.35);
  const filter = ac.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 1200;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.10, t + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(t);
  src.stop(t + 0.36);
}

export function sfxFile() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, t, 660, 0.12, 0.14, "triangle");
  tone(ac, t + 0.12, 880, 0.12, 0.18, "triangle");
}

export function sfxVerdictGuilty() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  thump(ac, t, 70, 0.5, 0.5);
  tone(ac, t + 0.05, 220, 0.14, 0.7, "sawtooth");
  tone(ac, t + 0.05, 233.08, 0.12, 0.7, "sawtooth");
  tone(ac, t + 0.05, 174.61, 0.12, 0.7, "triangle");
}

export function sfxVerdictAcquitted() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  [523.25, 659.25, 783.99].forEach((f, i) => tone(ac, t + i * 0.1, f, 0.12, 0.5, "triangle"));
}

export function sfxVerdictHung() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, t, 392, 0.12, 0.5, "triangle");
  tone(ac, t + 0.18, 370, 0.12, 0.6, "triangle");
}

export function sfxChime() {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime;
  tone(ac, t, 880, 0.08, 0.3);
  tone(ac, t + 0.1, 1174.66, 0.07, 0.35);
}
