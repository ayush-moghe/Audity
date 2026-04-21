"use client";

import { FormEvent, useRef, useState } from "react";
import { AudioLines, CircleHelp, Globe2, Sparkles, Upload } from "lucide-react";
import AuthGuard from "../components/AuthGuard";
import { useAuth } from "../components/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type WatermarkResponse = {
  message?: string;
  file_path?: string;
  public_url?: string;
  mos?: number;
  [key: string]: unknown;
};

type MosSummary = {
  original: number;
  watermarked: number;
  delta: number;
};

export default function StampPage() {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  const bucketName = process.env.NEXT_PUBLIC_SUPABASE_AUDIO_BUCKET;

  const [audioName, setAudioName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [scoreMos, setScoreMos] = useState(false);
  const [showMosInfo, setShowMosInfo] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scoringMos, setScoringMos] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [mosSummary, setMosSummary] = useState<MosSummary | null>(null);
  const [mosProgress, setMosProgress] = useState(0);
  const [mosProgressLabel, setMosProgressLabel] = useState("");
  const scoreMosRef = useRef(false);

  const decodeMonoAudio = async (audioBuffer: ArrayBuffer) => {
    const audioContext = new AudioContext();
    try {
      const decoded = await audioContext.decodeAudioData(audioBuffer.slice(0));
      const channelData = decoded.getChannelData(0);
      return {
        samples: new Float32Array(channelData),
        sampleRate: decoded.sampleRate,
      };
    } finally {
      await audioContext.close();
    }
  };

  const splitIntoChunks = (samples: Float32Array, sampleRate: number) => {
    const chunkFrames = Math.max(1, Math.floor(sampleRate * 15));
    const chunks: Float32Array[] = [];

    for (let offset = 0; offset < samples.length; offset += chunkFrames) {
      chunks.push(samples.slice(offset, Math.min(samples.length, offset + chunkFrames)));
    }

    return chunks.length > 0 ? chunks : [samples];
  };

  const runAverageMosForChunks = async (
    chunks: Float32Array[],
    sampleRate: number,
    onChunkDone: () => void,
  ) => {
    const { runDNSMOS } = await import("webmos");
    let total = 0;

    for (const chunk of chunks) {
      // Yield between chunks so the UI can repaint and remain interactive.
      await new Promise((resolve) => setTimeout(resolve, 0));
      const chunkResult = await runDNSMOS(chunk, sampleRate);
      total += chunkResult.mos_ovr;
      onChunkDone();
    }

    return Number((total / chunks.length).toFixed(2));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      const shouldScoreMos = scoreMosRef.current;

    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setMosSummary(null);
    setMosProgress(0);
    setMosProgressLabel("");

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
      const { data: insertedAudio, error: insertError } = await supabase
        .from("Audios")
        .insert({
        name: audioName.trim() || audioFile.name,
        file_path: persistedFilePath,
        user_id: appUser.id,
        mos: mosValue,
        public: isPublic,
        })
        .select("id")
        .single();

      if (insertError) {
        throw new Error(`Watermarked file created, but DB insert failed: ${insertError.message}`);
      }

      setSuccessMessage("Audio watermarked and saved to your dashboard.");
      const capturedFile = audioFile;
      const insertedAudioId = insertedAudio?.id;
      const publicUrlFromPayload =
        typeof payload.public_url === "string" ? payload.public_url : undefined;
      const fallbackPublicUrl =
        bucketName && persistedFilePath
          ? supabase.storage.from(bucketName).getPublicUrl(persistedFilePath).data.publicUrl
          : "";
      const watermarkedAudioUrl = publicUrlFromPayload || fallbackPublicUrl;

      setAudioName("");
      setAudioFile(null);
      setIsPublic(false);

      if (shouldScoreMos && capturedFile && insertedAudioId) {
        setScoringMos(true);
        setMosProgress(0);
        setMosProgressLabel("Loading MOS model...");

        void (async () => {
          try {
            const { initDNSMOS } = await import("webmos");
            await initDNSMOS();

            if (!watermarkedAudioUrl) {
              throw new Error("Unable to find watermarked audio URL for MOS scoring.");
            }

            const originalBuffer = await capturedFile.arrayBuffer();
            const watermarkedFetch = await fetch(watermarkedAudioUrl, { cache: "no-store" });
            if (!watermarkedFetch.ok) {
              throw new Error("Failed to download watermarked audio for MOS scoring.");
            }

            const watermarkedBuffer = await watermarkedFetch.arrayBuffer();
            const originalDecoded = await decodeMonoAudio(originalBuffer);
            const watermarkedDecoded = await decodeMonoAudio(watermarkedBuffer);

            const originalChunks = splitIntoChunks(originalDecoded.samples, originalDecoded.sampleRate);
            const watermarkedChunks = splitIntoChunks(
              watermarkedDecoded.samples,
              watermarkedDecoded.sampleRate,
            );

            const totalChunks = originalChunks.length + watermarkedChunks.length;
            let completedChunks = 0;

            const onChunkDone = () => {
              completedChunks += 1;
              const pct = Math.round((completedChunks / totalChunks) * 100);
              setMosProgress(pct);
              setMosProgressLabel(`Scoring chunk ${completedChunks}/${totalChunks}...`);
            };

            setMosProgressLabel(`Scoring chunk 0/${totalChunks}...`);

            const originalMos = await runAverageMosForChunks(
              originalChunks,
              originalDecoded.sampleRate,
              onChunkDone,
            );

            const watermarkedMos = await runAverageMosForChunks(
              watermarkedChunks,
              watermarkedDecoded.sampleRate,
              onChunkDone,
            );

            const mosDelta = Number((watermarkedMos - originalMos).toFixed(2));

            const { error: updateMosError } = await supabase
              .from("Audios")
              .update({ mos: watermarkedMos })
              .eq("id", insertedAudioId);

            if (updateMosError) {
              throw new Error(`Failed to save MOS score: ${updateMosError.message}`);
            }

            setMosSummary({
              original: originalMos,
              watermarked: watermarkedMos,
              delta: mosDelta,
            });

            setMosProgress(100);
            setMosProgressLabel("MOS scoring complete.");
          } catch (mosError) {
            setErrorMessage(
              mosError instanceof Error ? mosError.message : "MOS scoring failed after upload.",
            );
          } finally {
            setScoringMos(false);
          }
        })();
      }
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
      if (!scoringMos) {
        setMosProgress(0);
        setMosProgressLabel("");
      }
    }
  };

  return (
    <AuthGuard>
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-10">
        <section className="w-full rounded-2xl border border-fuchsia-300/20 bg-[linear-gradient(150deg,rgb(14,9,38),rgb(42,11,74)_45%,rgb(15,45,114))] p-6 shadow-[0_15px_50px_rgba(145,82,255,0.18)]">
          <h1 className="text-4xl font-bold text-white">Watermark Audio</h1>
          <p className="mt-3 max-w-3xl text-base text-slate-200">
            Upload audio to watermark it using AudioSeal, and optionally score MOS quality before and after watermarking. Watermarked audios are saved to your dashboard and can be made public in the Library.
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

            <div className="grid gap-4 lg:grid-cols-2">
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

              <div className="flex items-center justify-between gap-4 rounded-xl border border-fuchsia-200/25 bg-[#070916] px-4 py-4 transition hover:border-fuchsia-200/45 hover:bg-[#0b1020]">
                <span className="flex items-center gap-3 text-base text-slate-100">
                  <Sparkles size={18} className="text-fuchsia-200/85" />
                  Score MOS
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowMosInfo(true)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-fuchsia-300/40 bg-fuchsia-950/50 text-fuchsia-100 transition hover:border-fuchsia-200/70"
                    aria-label="What is MOS?"
                  >
                    <CircleHelp size={16} />
                  </button>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={scoreMos}
                    onClick={() => {
                      setScoreMos((value) => {
                        const next = !value;
                        scoreMosRef.current = next;
                        return next;
                      });
                    }}
                    className={`relative inline-flex h-7 w-13 items-center rounded-full border transition-colors duration-200 ${
                      scoreMos
                        ? "border-cyan-200/60 bg-cyan-500/30"
                        : "border-fuchsia-300/40 bg-fuchsia-950/55"
                    }`}
                  >
                    <span
                      className={`pointer-events-none absolute h-5 w-5 rounded-full transition-transform duration-200 ${
                        scoreMos
                          ? "translate-x-6 bg-cyan-100 shadow-[0_0_12px_rgba(103,232,249,0.65)]"
                          : "translate-x-1 bg-fuchsia-100 shadow-[0_0_10px_rgba(200,120,255,0.45)]"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {(submitting || scoringMos) && (scoreMos || scoringMos) && mosProgressLabel ? (
              <div className="rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-4 py-4">
                <div className="flex items-center justify-between text-sm text-cyan-100">
                  <span>{mosProgressLabel}</span>
                  <span>{mosProgress}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-cyan-950/80">
                  <div
                    className="h-2 rounded-full bg-[linear-gradient(90deg,#68f0ff,#3f89ff)] transition-all duration-300"
                    style={{ width: `${mosProgress}%` }}
                  />
                </div>
              </div>
            ) : null}

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

          {mosSummary ? (
            <div className="mt-6 rounded-xl border border-cyan-300/25 bg-black/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
                MOS Summary
              </p>
              <div className="mt-3 rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-3 py-3 text-sm text-cyan-100">
                <p>Original MOS: {mosSummary.original.toFixed(2)}</p>
                <p>Watermarked MOS: {mosSummary.watermarked.toFixed(2)}</p>
                <p>
                  MOS Delta: {mosSummary.delta > 0 ? "+" : ""}
                  {mosSummary.delta.toFixed(2)}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        {showMosInfo ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-xl rounded-2xl border border-cyan-300/30 bg-[linear-gradient(160deg,#0a1027,#10194a)] p-6 shadow-[0_20px_70px_rgba(41,126,255,0.25)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-cyan-100">What is MOS?</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-200">
                    MOS (Mean Opinion Score) estimates perceived speech quality on a 1-5 scale.
                    This app can score the original clip and the watermarked clip to help confirm
                    watermarking has not noticeably degraded quality for listeners. This is
                    recommended when the audio contains speech or a human voice.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMosInfo(false)}
                  className="rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-100/70"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </AuthGuard>
  );
}
