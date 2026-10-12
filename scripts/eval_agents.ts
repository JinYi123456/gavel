// Agent quality bench: runs the three courtroom officers over real golden
// cases against the candidate models, validates every speech with the same
// grounding gate the production route uses, and reports latency/concurrency.
//
// Usage: node scripts/eval_agents.ts [--models m1,m2] [--cases G1,G4,A5,H2]

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { adjudicate } from "../lib/engine/fusion.ts";
import { buildContext, clerkPrompt, defencePrompt, prosecutorPrompt } from "../lib/agents/prompts.ts";
import { validateSpeech } from "../lib/agents/validate.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim();
    }
  } catch {
    /* no .env.local */
  }
  return { ...env, ...process.env } as Record<string, string>;
}

const args = process.argv.slice(2);
function argValue(flag: string): string | null {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

const env = loadEnv();
const KEY = env.FEATHERLESS_API_KEY ?? "";
const BASE = env.FEATHERLESS_BASE_URL ?? "https://api.featherless.ai/v1";
const MODELS = (argValue("--models") ?? "unsloth/Llama-3.3-70B-Instruct,Qwen/Qwen3-235B-A22B").split(",");
const CASE_IDS = (argValue("--cases") ?? "G1,G4,A5,H2").split(",");

interface GoldenCase {
  id: string;
  title: string;
  text: string;
  expected: string;
}

const golden = JSON.parse(readFileSync(join(root, "lib/engine/kb/golden_cases.json"), "utf8")) as {
  cases: GoldenCase[];
};
const cases = golden.cases.filter((c) => CASE_IDS.includes(c.id));

interface Attempt {
  model: string;
  caseId: string;
  who: string;
  ok: boolean;
  reason?: string;
  chars: number;
  ms: number;
  status: number;
}

async function callModel(model: string, system: string, user: string): Promise<{ text: string; status: number; ms: number }> {
  const started = Date.now();
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 60_000);
  try {
    const res = await fetch(`${BASE.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 320,
        temperature: 0.5,
        stream: false,
      }),
      signal: ac.signal,
    });
    const ms = Date.now() - started;
    if (!res.ok) return { text: "", status: res.status, ms };
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { text: data.choices?.[0]?.message?.content ?? "", status: res.status, ms };
  } catch {
    return { text: "", status: 0, ms: Date.now() - started };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  if (!KEY) {
    console.error("no FEATHERLESS_API_KEY in .env.local");
    process.exit(1);
  }
  const results: Attempt[] = [];

  for (const model of MODELS) {
    for (const c of cases) {
      const adj = adjudicate(c.text);
      const record = buildContext(c.text, adj);
      const prompts = [
        { who: "prosecutor", p: prosecutorPrompt(record) },
        { who: "defence", p: defencePrompt(record) },
        { who: "clerk", p: clerkPrompt(record) },
      ];
      // Fire the three officers concurrently — this also measures whether the
      // plan tolerates 3 simultaneous requests. --sequential runs them one at
      // a time instead, to isolate serving-quality problems.
      const started = Date.now();
      const sequential = args.includes("--sequential");
      const outs: { text: string; status: number; ms: number }[] = [];
      if (sequential) {
        for (const x of prompts) {
          outs.push(await callModel(model, x.p.system, x.p.user));
        }
      } else {
        outs.push(...(await Promise.all(prompts.map((x) => callModel(model, x.p.system, x.p.user)))));
      }
      console.log(`\n=== ${model} · ${c.id} (${c.title}) · wall ${Date.now() - started} ms ===`);
      outs.forEach((out, i) => {
        const { who } = prompts[i];
        let ok = false;
        let reason: string | undefined;
        if (out.status !== 200) {
          ok = false;
          reason = `http ${out.status}`;
        } else {
          const v = validateSpeech(out.text, record.user, who as "prosecutor" | "defence" | "clerk", adj.score);
          ok = v.ok;
          reason = v.ok ? undefined : (v.fabricated[0] ? `fabricated: ${v.fabricated[0].slice(0, 60)}` : v.reason);
        }
        results.push({ model, caseId: c.id, who, ok, reason, chars: out.text.length, ms: out.ms, status: out.status });
        console.log(`  ${who.padEnd(11)} ${ok ? "PASS" : "FAIL"}  ${out.ms}ms  ${out.text.length} chars ${reason ? "· " + reason : ""}`);
        if (args.includes("--verbose")) console.log(`    ${out.text.slice(0, 300).replace(/\n/g, " ")}\n`);
      });
    }
  }

  console.log("\n===== SUMMARY =====");
  for (const model of MODELS) {
    const rs = results.filter((r) => r.model === model);
    const pass = rs.filter((r) => r.ok).length;
    const avg = rs.reduce((a, r) => a + r.ms, 0) / Math.max(1, rs.length);
    console.log(`${model}: ${pass}/${rs.length} pass · avg ${Math.round(avg)} ms · http0/timeouts ${rs.filter((r) => r.status === 0).length}`);
  }
}

void main();
