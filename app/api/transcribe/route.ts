// Voice evidence. The browser records or uploads the suspicious voicemail;
// this route hands the audio to AssemblyAI and returns only the transcript.
// The audio is not stored anywhere on this side of the wire.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Voice transcription is not configured on this deployment." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Bad upload." }, { status: 400 });
  }
  const file = form.get("audio");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "No audio received." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Audio over 8 MB is declined." }, { status: 413 });
  }

  try {
    const audio = await file.arrayBuffer();
    const uploadRes = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: { authorization: key, "content-type": "application/octet-stream" },
      body: audio,
    });
    if (!uploadRes.ok) {
      return NextResponse.json({ error: "The transcription service refused the audio." }, { status: 502 });
    }
    const uploadJson = (await uploadRes.json()) as { upload_url?: string };
    if (!uploadJson.upload_url) {
      return NextResponse.json({ error: "Upload failed." }, { status: 502 });
    }

    const createRes = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: { authorization: key, "content-type": "application/json" },
      body: JSON.stringify({ audio_url: uploadJson.upload_url }),
    });
    if (!createRes.ok) {
      return NextResponse.json({ error: "The transcription job could not be created." }, { status: 502 });
    }
    const job = (await createRes.json()) as { id?: string };
    if (!job.id) {
      return NextResponse.json({ error: "Transcription job has no id." }, { status: 502 });
    }

    const deadline = Date.now() + 48_000;
    for (;;) {
      if (Date.now() > deadline) {
        return NextResponse.json({ error: "Transcription timed out — try a shorter clip." }, { status: 504 });
      }
      await new Promise((r) => setTimeout(r, 1800));
      const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${job.id}`, {
        headers: { authorization: key },
      });
      if (!pollRes.ok) continue;
      const poll = (await pollRes.json()) as { status?: string; text?: string; error?: string };
      if (poll.status === "completed") {
        return NextResponse.json({ text: (poll.text ?? "").slice(0, 6000) });
      }
      if (poll.status === "error") {
        return NextResponse.json({ error: poll.error ?? "Transcription failed." }, { status: 502 });
      }
    }
  } catch {
    return NextResponse.json({ error: "Transcription failed." }, { status: 502 });
  }
}
