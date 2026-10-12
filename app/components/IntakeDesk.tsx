"use client";

// The intake desk: every way a suspicious thing arrives — a pasted message, a
// QR code photographed in the wild, a document, a recorded voice note — gets
// booked into the same court. Every decoder runs on this device.

import { useCallback, useRef, useState } from "react";
import golden from "../../lib/engine/kb/golden_cases.json";

interface Props {
  onSubmit: (message: string) => void;
  busy?: boolean;
}

type Tab = "message" | "qr" | "document" | "voice";

const SAMPLE_IDS = ["G1", "G2", "G5", "A3", "A4", "H2"];

export default function IntakeDesk({ onSubmit, busy }: Props) {
  const [tab, setTab] = useState<Tab>("message");
  const [text, setText] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const recChunks = useRef<Blob[]>([]);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const samples = golden.cases.filter((c) => SAMPLE_IDS.includes(c.id));

  const book = () => {
    const message = text.trim();
    if (message.length < 3) {
      setError("Give the court something to read — at least a few words.");
      return;
    }
    setError(null);
    onSubmit(message);
  };

  const decodeQrFile = useCallback(async (file: File) => {
    setError(null);
    setNote(null);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.drawImage(bitmap, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { default: jsQR } = await import("jsqr");
      const result = jsQR(imageData.data, imageData.width, imageData.height);
      if (result?.data) {
        setText(result.data);
        setTab("message");
        setNote("Decoded from the QR image on this device. Review the payload, then open the case.");
      } else {
        setError("No QR code readable in that image. A tighter, brighter photo usually works.");
      }
    } catch {
      setError("That image could not be read.");
    }
  }, []);

  const readDocument = useCallback(async (file: File) => {
    setError(null);
    setNote(null);
    try {
      if (/\.pdf$/i.test(file.name)) {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
        const buf = await file.arrayBuffer();
        const doc = await pdfjs.getDocument({ data: buf }).promise;
        const pages = Math.min(doc.numPages, 3);
        let out = "";
        for (let i = 1; i <= pages; i++) {
          const page = await doc.getPage(i);
          const content = await page.getTextContent();
          out += content.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n";
        }
        setText(out.trim().slice(0, 6000));
        setTab("message");
        setNote(`Extracted the first ${pages} page(s) of the PDF on this device.`);
      } else {
        const raw = await file.text();
        setText(raw.trim().slice(0, 6000));
        setTab("message");
        setNote("Read the document on this device.");
      }
    } catch {
      setError("That document could not be read. Text, markdown and simple PDFs work best.");
    }
  }, []);

  const toggleRecording = useCallback(async () => {
    setError(null);
    setNote(null);
    if (recording) {
      recRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      recChunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) recChunks.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recTimer.current) clearInterval(recTimer.current);
        setRecording(false);
        setRecSeconds(0);
        const blob = new Blob(recChunks.current, { type: rec.mimeType || "audio/webm" });
        await transcribe(blob, "recording");
      };
      rec.start();
      setRecording(true);
      setRecSeconds(0);
      recTimer.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone unavailable. You can also upload an audio file.");
    }
  }, [recording]);

  const transcribe = useCallback(async (blob: Blob, kind: string) => {
    setTranscribing(true);
    try {
      if (blob.size > 8 * 1024 * 1024) {
        setError("Audio over 8 MB is declined by the transcription service.");
        setTranscribing(false);
        return;
      }
      const fd = new FormData();
      fd.append("audio", blob, kind === "recording" ? "voice.webm" : "voice.bin");
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        setError(data.error ?? "Transcription failed.");
      } else {
        setText(data.text);
        setTab("message");
        setNote("Transcript from the voice note. The audio was processed only to read it — it is not stored anywhere.");
      }
    } catch {
      setError("Transcription failed — check your connection and try again.");
    } finally {
      setTranscribing(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (file.type.startsWith("image/")) void decodeQrFile(file);
      else if (file.type.startsWith("audio/")) void transcribe(file, "file");
      else void readDocument(file);
    },
    [decodeQrFile, readDocument, transcribe]
  );

  return (
    <div className="panel panel-pad intake" onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} data-over={dragOver}>
      <div className="intake-head">
        <span className="kicker">Book a case</span>
        <span className="type intake-count">{Math.min(text.length, 9999)}/6000</span>
      </div>

      <div className="intake-tabs" role="tablist" aria-label="How is the evidence arriving?">
        {(
          [
            ["message", "Paste a message"],
            ["qr", "QR photo"],
            ["document", "Document"],
            ["voice", "Voice note"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} className="intake-tab" role="tab" aria-pressed={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "message" && (
        <textarea
          className="intake-input"
          placeholder="Paste the suspicious SMS, email, WhatsApp message or call transcript here…"
          value={text}
          maxLength={6000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) book();
          }}
        />
      )}

      {tab === "qr" && (
        <div>
          <label className="dropzone" data-over={dragOver}>
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void decodeQrFile(f);
              }}
            />
            <div className="type">Drop a photo of the QR code here — or click to choose</div>
            <p className="muted-note" style={{ marginTop: 6 }}>
              Decoded on this device. The image is never uploaded.
            </p>
          </label>
        </div>
      )}

      {tab === "document" && (
        <label className="dropzone" data-over={dragOver}>
          <input
            type="file"
            accept=".txt,.md,.eml,.pdf"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void readDocument(f);
            }}
          />
          <div className="type">Drop a letter, notice or PDF here — or click to choose</div>
          <p className="muted-note" style={{ marginTop: 6 }}>
            Read on this device. Scanned image PDFs may need text you can select.
          </p>
        </label>
      )}

      {tab === "voice" && (
        <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
          <button className={recording ? "btn btn-primary" : "btn btn-brass"} onClick={() => void toggleRecording()} disabled={transcribing}>
            {recording ? `Stop — recording ${recSeconds}s` : transcribing ? "Transcribing" : "Record the call or voicemail"}
          </button>
          <p className="muted-note" style={{ marginTop: 10 }}>
            {transcribing
              ? "Reading the voice note…"
              : "Play the suspicious voicemail near the mic — or drop an audio file anywhere on this card."}
          </p>
        </div>
      )}

      {note && <div className="decode-preview type">{note}</div>}
      {error && (
        <div className="decode-preview" style={{ borderColor: "var(--oxblood)", color: "var(--oxblood)" }}>
          {error}
        </div>
      )}

      <div className="intake-row">
        <button className="btn btn-primary" onClick={book} disabled={busy}>
          {busy ? "The court is sitting" : "Open the case"}
        </button>
        <span className="muted-note">or press Ctrl/⌘ + Enter</span>
      </div>

      <div className="sample-row">
        <span className="kicker" style={{ alignSelf: "center" }}>Famous cases:</span>
        {samples.map((c) => (
          <button key={c.id} className="chip" onClick={() => { setText(c.text); setTab("message"); setNote(null); setError(null); }}>
            {c.title}
          </button>
        ))}
      </div>
    </div>
  );
}
