"use client";

import { FormEvent, useState } from "react";
import { AudioLines, Globe2, Sparkles, Upload } from "lucide-react";
import AuthGuard from "../components/AuthGuard";
import { useAuth } from "../components/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type WatermarkResponse = {
  message?: string;
  file_path?: string;
  mos?: number;
  [key: string]: unknown;
};

export default function StampPage() {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [audioName, setAudioName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [result, setResult] = useState<WatermarkResponse | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
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

    const usernameFromMetadata = user?.user_metadata?.username;
    if (typeof usernameFromMetadata !== "string" || !usernameFromMetadata.trim()) {
      setErrorMessage("No username found for this account.");
      return;
    }

    setSubmitting(true);

    try {
      const normalizedUsername = usernameFromMetadata.trim();
      const { data: appUser, error: appUserError } = await supabase
        .from("Users")
        .select("id")
        .eq("username", normalizedUsername)
        .maybeSingle();

      if (appUserError || !appUser) {
        throw new Error(appUserError?.message || "Unable to resolve app user profile.");
      }

      const formData = new FormData();
      formData.append("file", audioFile);
      formData.append("name", audioName.trim() || audioFile.name);
      formData.append("public", String(isPublic));

      const response = await fetch(`${apiBase}/watermark`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Watermark request failed.");
      }

      const payload = (await response.json()) as WatermarkResponse;
      setResult(payload);

      const filePathCandidates = [
        payload.file_path,
        typeof payload.storage_path === "string" ? payload.storage_path : undefined,
        typeof payload.watermarked_path === "string" ? payload.watermarked_path : undefined,
      ];
      const persistedFilePath = filePathCandidates.find(
        (path): path is string => typeof path === "string" && path.trim().length > 0,
      );

      if (!persistedFilePath) {
        throw new Error(
          "Backend did not return a file_path. Return file_path from /watermark to save into Audios.",
        );
      }

      const mosValue = typeof payload.mos === "number" ? payload.mos : null;
      const { error: insertError } = await supabase.from("Audios").insert({
        name: audioName.trim() || audioFile.name,
        file_path: persistedFilePath,
        user_id: appUser.id,
        mos: mosValue,
        public: isPublic,
      });

      if (insertError) {
        throw new Error(`Watermarked file created, but DB insert failed: ${insertError.message}`);
      }

      setSuccessMessage("Audio watermarked and saved to your dashboard.");
      setAudioName("");
      setAudioFile(null);
      setIsPublic(false);
    } catch (error) {
      if (error instanceof TypeError) {
        setErrorMessage(
          `Cannot reach watermark API at ${apiBase}. Start FastAPI on port 8000 and verify CORS.`,
        );
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Unable to watermark audio.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-10">
        <section className="w-full rounded-2xl border border-fuchsia-300/20 bg-[linear-gradient(150deg,rgb(14,9,38),rgb(42,11,74)_45%,rgb(15,45,114))] p-6 shadow-[0_15px_50px_rgba(145,82,255,0.18)]">
          <h1 className="text-4xl font-bold text-white">Watermark Audio</h1>
          <p className="mt-3 max-w-3xl text-base text-slate-200">
            Upload audio to your FastAPI AudioSeal route. On success, this page writes a
            new row into Audios so Dashboard and Library can show it.
          </p>

          <form className="mt-9 space-y-7" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2.5 block text-sm font-semibold uppercase tracking-[0.12em] text-fuchsia-200">
                Audio Name
              </span>
              <div className="relative">
                <AudioLines
                  size={20}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200/80"
                />
                <input
                  type="text"
                  value={audioName}
                  onChange={(event) => setAudioName(event.target.value)}
                  placeholder="Optional. Defaults to file name"
                  className="w-full rounded-xl border border-fuchsia-200/25 bg-[#070916] py-4 pl-12 pr-4 text-base text-white outline-none transition focus:border-fuchsia-200/70 focus:ring-2 focus:ring-fuchsia-200/20"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2.5 block text-sm font-semibold uppercase tracking-[0.12em] text-fuchsia-200">
                Audio File
              </span>
              <div className="rounded-xl border border-fuchsia-200/25 bg-[#070916] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm text-fuchsia-100">
                  <Upload size={18} />
                  <span>Select an audio file to watermark</span>
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
                  className="block w-full cursor-pointer rounded-xl border border-fuchsia-200/25 bg-[#05070f] px-4 py-3.5 text-base text-white file:mr-4 file:rounded-full file:border-0 file:bg-fuchsia-300/20 file:px-5 file:py-2.5 file:text-sm file:font-semibold file:text-fuchsia-100"
                />
              </div>
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-fuchsia-200/25 bg-[#070916] px-4 py-4 transition hover:border-fuchsia-200/45 hover:bg-[#0b1020]">
              <span className="flex items-center gap-3 text-base text-slate-100">
                <Globe2 size={18} className="text-fuchsia-200/85" />
                Make this audio public in Library
              </span>

              <span className="relative inline-flex items-center">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(event) => setIsPublic(event.target.checked)}
                  className="peer sr-only"
                />
                <span className="h-7 w-13 rounded-full border border-fuchsia-300/40 bg-fuchsia-950/55 transition-colors duration-200 peer-checked:border-cyan-200/60 peer-checked:bg-cyan-500/30" />
                <span className="pointer-events-none absolute left-1 h-5 w-5 rounded-full bg-fuchsia-100 shadow-[0_0_10px_rgba(200,120,255,0.45)] transition-transform duration-200 peer-checked:translate-x-6 peer-checked:bg-cyan-100 peer-checked:shadow-[0_0_12px_rgba(103,232,249,0.65)]" />
              </span>
            </label>

            {errorMessage ? (
              <p className="rounded-lg border border-red-300/40 bg-red-900/25 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p className="rounded-lg border border-emerald-300/40 bg-emerald-900/25 px-4 py-3 text-sm text-emerald-200">
                {successMessage}
              </p>
            ) : null}

            <div className="pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-300/70 bg-[linear-gradient(100deg,rgba(40,9,70,0.96),rgba(27,10,107,0.96)_42%,rgba(21,102,210,0.96))] px-8 py-4 text-base font-bold uppercase tracking-[0.14em] text-fuchsia-100 shadow-[0_0_24px_rgba(182,109,255,0.38)] transition-all duration-300 hover:-translate-y-0.5 hover:border-fuchsia-100/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Sparkles size={18} />
                <span>{submitting ? "Watermarking..." : "Watermark Audio"}</span>
              </button>
            </div>
          </form>

          {result ? (
            <div className="mt-6 rounded-xl border border-cyan-300/25 bg-black/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                Backend Response
              </p>
              <pre className="mt-3 overflow-x-auto text-xs text-slate-200">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          ) : null}
        </section>
      </main>
    </AuthGuard>
  );
}
