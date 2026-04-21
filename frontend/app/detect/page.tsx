"use client";

import { FormEvent, useState } from "react";
import { BadgeCheck, ShieldAlert, Upload } from "lucide-react";
import AuthGuard from "../components/AuthGuard";

type DetectResponse = {
  is_watermarked?: boolean;
  confidence?: number;
  engine?: string;
  message?: string;
};

export default function DetectPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<DetectResponse | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setResult(null);

    if (!apiBase) {
      setErrorMessage("Missing NEXT_PUBLIC_API_BASE_URL.");
      return;
    }

    if (!audioFile) {
      setErrorMessage("Please choose an audio file.");
      return;
    }

    if (!audioFile.type.startsWith("audio/")) {
      setErrorMessage("Only audio files are supported.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", audioFile);

      const response = await fetch(`${apiBase}/detect`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "Detection request failed.");
      }

      const payload = (await response.json()) as DetectResponse;
      setResult(payload);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to detect watermark.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-10">
        <section className="w-full rounded-3xl border border-cyan-300/20 bg-[linear-gradient(150deg,#071227,#111b4b_50%,#074388)] p-8 shadow-[0_20px_70px_rgba(64,154,255,0.18)]">
          <h1 className="text-4xl font-bold text-white">Detect Watermark</h1>
          <p className="mt-3 max-w-3xl text-base text-slate-200">
            Upload an audio file to check whether it appears to carry a watermark signature.
          </p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2.5 block text-sm font-semibold uppercase tracking-[0.12em] text-cyan-200">
                Audio File
              </span>
              <div className="rounded-xl border border-cyan-200/25 bg-[#060d1f] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-cyan-100">
                  <Upload size={18} />
                  <span>Select an audio file to detect</span>
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
                  className="block w-full cursor-pointer rounded-xl border border-cyan-200/25 bg-[#040911] px-4 py-3.5 text-base text-white file:mr-4 file:rounded-full file:border-0 file:bg-cyan-400/20 file:px-5 file:py-2.5 file:text-sm file:font-semibold file:text-cyan-100"
                />
              </div>
            </label>

            {errorMessage ? (
              <p className="rounded-lg border border-red-300/40 bg-red-900/25 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/70 bg-[linear-gradient(100deg,rgba(10,26,58,0.95),rgba(16,42,98,0.95)_45%,rgba(15,108,198,0.95))] px-8 py-4 text-base font-bold uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_24px_rgba(71,182,255,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-100/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Detecting..." : "Detect Watermark"}
            </button>
          </form>

          {result ? (
            <div className="mt-6 rounded-xl border border-cyan-300/25 bg-black/30 p-5">
              {result.is_watermarked ? (
                <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/45 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100">
                  <BadgeCheck size={16} />
                  Watermark Detected
                </p>
              ) : (
                <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/45 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100">
                  <ShieldAlert size={16} />
                  No Watermark Detected
                </p>
              )}

              <p className="mt-4 text-sm text-slate-200">
                Confidence: {typeof result.confidence === "number" ? result.confidence.toFixed(2) : "-"}
              </p>
              <p className="mt-1 text-sm text-slate-300">Engine: {result.engine ?? "-"}</p>
            </div>
          ) : null}
        </section>
      </main>
    </AuthGuard>
  );
}
