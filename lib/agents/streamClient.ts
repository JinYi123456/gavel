// The client half of the trial stream. It speaks the tiny SSE protocol of
// /api/trial and never trusts it further than it can throw it: any failure —
// network, server, malformed event — falls back to the scripted bench, so a
// trial always finishes.

import type { Adjudication } from "../engine/fusion.ts";
import { scriptedSpeeches, type ScriptedSpeech } from "./scripted.ts";

export interface TrialHandlers {
  onSpeakerStart?: (who: ScriptedSpeech["who"]) => void;
  onDelta?: (who: ScriptedSpeech["who"], delta: string) => void;
  onSpeakerEnd?: (who: ScriptedSpeech["who"], mode: "live" | "scripted") => void;
  onNotice?: (note: string) => void;
  onDone?: (mode: "live" | "scripted") => void;
}

interface TrialEvent {
  type: string;
  who?: ScriptedSpeech["who"];
  delta?: string;
  note?: string;
  mode?: string;
}

// One bucket per browser tab, not per IP: every judge behind the same campus
// NAT must not spend from the same rate limit.
function sessionId(): string {
  try {
    const key = "gavel.session.v1";
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export async function streamTrial(
  message: string,
  adjudication: Adjudication,
  handlers: TrialHandlers,
  signal?: AbortSignal
): Promise<void> {
  // The server re-adjudicates the message itself — one trusted copy of the
  // facts on each side of the wire, and nothing about the case is taken on
  // faith from the browser.
  const payload = { message: message.slice(0, 6000) };

  let mode: "live" | "scripted" = "scripted";
  try {
    const res = await fetch("/api/trial", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-gavel-session": sessionId() },
      body: JSON.stringify(payload),
      signal,
    });
    if (!res.ok || !res.body) throw new Error(`trial endpoint ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let serverFailed = false;

    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const chunk = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const line = chunk.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        let evt: TrialEvent;
        try {
          evt = JSON.parse(line.slice(6)) as TrialEvent;
        } catch {
          continue;
        }
        switch (evt.type) {
          case "mode":
            mode = evt.mode === "live" ? "live" : "scripted";
            break;
          case "start":
            if (evt.who) handlers.onSpeakerStart?.(evt.who);
            break;
          case "delta":
            if (evt.who && evt.delta) handlers.onDelta?.(evt.who, evt.delta);
            break;
          case "end": {
            if (!evt.who) break;
            const speakerMode = evt.mode === "live" || evt.mode === "scripted" ? evt.mode : mode;
            handlers.onSpeakerEnd?.(evt.who, speakerMode);
            break;
          }
          case "notice":
            if (evt.note) handlers.onNotice?.(evt.note);
            break;
          case "error":
            serverFailed = true;
            break;
          default:
            break;
        }
      }
    }
    if (serverFailed) throw new Error("server reported failure");
    handlers.onDone?.(mode);
  } catch (err) {
    if (signal?.aborted) return;
    // The bench sits even when the wires are cut: compile the scripted
    // speeches and type them out locally.
    handlers.onNotice?.("The language-model service is unavailable; the bench is reading from the scripted record.");
    await runScripted(message, adjudication, handlers);
    handlers.onDone?.("scripted");
  }
}

async function runScripted(message: string, adj: Adjudication, handlers: TrialHandlers): Promise<void> {
  const speeches = scriptedSpeeches(message, adj);
  for (const speech of speeches) {
    handlers.onSpeakerStart?.(speech.who);
    await typeOut(speech.text, (delta) => handlers.onDelta?.(speech.who, delta));
    handlers.onSpeakerEnd?.(speech.who, "scripted");
  }
}

async function typeOut(text: string, onDelta: (delta: string) => void): Promise<void> {
  const chunk = 4;
  for (let i = 0; i < text.length; i += chunk) {
    onDelta(text.slice(i, i + chunk));
    await new Promise((r) => setTimeout(r, 14));
  }
}
