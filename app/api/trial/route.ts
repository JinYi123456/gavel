// The trial endpoint — final form.
//
// 1. The server adjudicates the message itself with the shipped engine.
// 2. Three officers are drafted in parallel: each is an LLM attempt chain
//    (primary model -> fallback model, each at two temperatures), and every
//    draft passes the verification gate (shape + quote-grounding + clerk
//    format) before it may speak.
// 3. Any officer whose drafts fail the gate is replaced by the scripted
//    bench, so a trial always finishes, and no fabricated word ever reaches
//    the judge.
//
// The record is delivered to the models as untrusted evidence, never
// instructions. The client is told the mode through per-speaker events.

import { NextRequest } from "next/server";
import { adjudicate, type Adjudication } from "../../../lib/engine/fusion.ts";
import {
  buildContext,
  clerkPrompt,
  defencePrompt,
  prosecutorPrompt,
  type TrialContext,
} from "../../../lib/agents/prompts.ts";
import { scriptedSpeeches } from "../../../lib/agents/scripted.ts";
import { validateSpeech } from "../../../lib/agents/validate.ts";

export const runtime = "nodejs";
export const maxDuration = 60;

type Who = "prosecutor" | "defence" | "clerk";
const ORDER: Who[] = ["prosecutor", "defence", "clerk"];

const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 30;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > RATE_MAX;
}

function liveMode(): boolean {
  return Boolean(process.env.FEATHERLESS_API_KEY) && process.env.GAVEL_FORCE_SCRIPTED !== "1";
}

type Send = (obj: unknown) => void;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return new Response(JSON.stringify({ error: "The court is at capacity — try again in a few minutes." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { message?: string };
  try {
    body = (await req.json()) as { message?: string };
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const message = String(body.message ?? "").slice(0, 6000);
  if (message.trim().length < 3) {
    return new Response("bad request", { status: 400 });
  }

  const adjudication = adjudicate(message);
  const record = buildContext(message, adjudication);
  const scripted = scriptedSpeeches(message, adjudication);
  const mode: "live" | "scripted" = liveMode() ? "live" : "scripted";
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send: Send = (obj) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      send({ type: "mode", mode });
      try {
        // Draft all three officers while the client is still stamping exhibits.
        const deadline = Date.now() + 38_000;
        const drafts =
          mode === "live"
            ? ORDER.map((who) => draftOfficer(who, record, adjudication, deadline))
            : ORDER.map(() => Promise.resolve<string | null>(null));

        let fellBack = false;
        for (let i = 0; i < ORDER.length; i++) {
          const who = ORDER[i];
          send({ type: "start", who });
          const live = await drafts[i];
          if (live) {
            await typeOut(send, who, live, 8);
            send({ type: "end", who, mode: "live" });
          } else {
            if (mode === "live" && !fellBack) {
              fellBack = true;
              send({
                type: "notice",
                note: "One or more officers were replaced by the scripted bench — their drafts did not pass the court's verification gate. Every word shown has been checked against the record.",
              });
            }
            await typeOut(send, who, scripted[i].text, 10);
            send({ type: "end", who, mode: "scripted" });
          }
        }
      } catch {
        send({ type: "error" });
      }
      closed = true;
      controller.close();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

function promptFor(who: Who, record: TrialContext): TrialContext {
  if (who === "prosecutor") return prosecutorPrompt(record);
  if (who === "defence") return defencePrompt(record);
  return clerkPrompt(record);
}

// The attempt chain: two models x two temperatures, every draft gated by
// validateSpeech. First draft that passes verification speaks.
async function draftOfficer(
  who: Who,
  record: TrialContext,
  adjudication: Adjudication,
  deadline: number
): Promise<string | null> {
  const prompt = promptFor(who, record);
  const models = [process.env.FEATHERLESS_MODEL, process.env.FEATHERLESS_MODEL_FALLBACK].filter(
    (m): m is string => Boolean(m)
  );
  if (models.length === 0) models.push("unsloth/Llama-3.3-70B-Instruct");
  const temperatures = [0.4, 0.15];
  for (const model of models) {
    for (const temperature of temperatures) {
      if (Date.now() > deadline) return null;
      const text = await tryModel(prompt, model, temperature, deadline);
      if (text) {
        const v = validateSpeech(text, record.user, who, adjudication.score);
        if (v.ok) return text;
      }
    }
  }
  return null;
}

async function tryModel(
  prompt: TrialContext,
  model: string,
  temperature: number,
  deadline: number
): Promise<string | null> {
  const baseUrl = process.env.FEATHERLESS_BASE_URL ?? "https://api.featherless.ai/v1";
  const key = process.env.FEATHERLESS_API_KEY ?? "";
  const timeoutMs = Math.max(3500, Math.min(13_000, deadline - Date.now()));
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        max_tokens: 340,
        temperature,
        top_p: 0.9,
        frequency_penalty: 0.35,
        presence_penalty: 0.2,
        stream: false,
      }),
      signal: ac.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content ?? "";
    return text.trim().length > 0 ? text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function typeOut(send: Send, who: Who, text: string, msPerChunk: number): Promise<void> {
  const chunk = 6;
  for (let i = 0; i < text.length; i += chunk) {
    send({ type: "delta", who, delta: text.slice(i, i + chunk) });
    await new Promise((r) => setTimeout(r, msPerChunk));
  }
}
