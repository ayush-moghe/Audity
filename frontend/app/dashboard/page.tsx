"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthGuard from "../components/AuthGuard";
import { useAuth } from "../components/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AudioRow = {
  id: number;
  name: string;
  file_path: string;
  mos: number | null;
  created_at: string;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const [audios, setAudios] = useState<AudioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadMyAudios = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const usernameFromMetadata = user.user_metadata?.username;
      if (
        typeof usernameFromMetadata !== "string" ||
        !usernameFromMetadata.trim()
      ) {
        setErrorMessage("No username found for this account.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const normalizedUsername = usernameFromMetadata.trim();
      const { data: appUser, error: appUserError } = await supabase
        .from("Users")
        .select("id")
        .eq("username", normalizedUsername)
        .maybeSingle();

      if (appUserError) {
        setErrorMessage(`Failed to load user profile: ${appUserError.message}`);
        setAudios([]);
        setLoading(false);
        return;
      }

      if (!appUser) {
        setAudios([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("Audios")
        .select("id,name,file_path,mos,created_at")
        .eq("user_id", appUser.id)
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(`Failed to load your audios: ${error.message}`);
        setAudios([]);
      } else {
        setAudios((data as AudioRow[]) ?? []);
      }

      setLoading(false);
    };

    loadMyAudios();
  }, [supabase, user]);

  const averageMos = useMemo(() => {
    const scoredAudios = audios.filter((audio) => typeof audio.mos === "number");
    if (scoredAudios.length === 0) {
      return null;
    }
    const total = scoredAudios.reduce((sum, audio) => sum + (audio.mos ?? 0), 0);
    return Number((total / scoredAudios.length).toFixed(2));
  }, [audios]);

  const scoreLabel = (mos: number | null) => {
    if (typeof mos !== "number") return "Not scored";
    if (mos >= 4.0) return "Phenomenal";
    if (mos >= 3.0) return "Excellent";
    if (mos >= 2.0) return "Fair";
    return "Poor";
  };

  const barGradient = (mos: number | null) => {
    const label = scoreLabel(mos);
    if (label === "Poor")       return "linear-gradient(90deg,#ff4444,#ff6b6b)";
    if (label === "Fair")       return "linear-gradient(90deg,#f5a623,#f7c948)";
    if (label === "Excellent")  return "linear-gradient(90deg,#1a7a3a,#2da653)";
    if (label === "Phenomenal") return "linear-gradient(90deg,#44ff88,#00e676)";
    return "linear-gradient(90deg,#44d7ff,#4f87ff)";
  };

  const bucketName = process.env.NEXT_PUBLIC_SUPABASE_AUDIO_BUCKET;

  const getDownloadUrl = (filePath: string) => {
    if (!bucketName || !filePath) return "#";
    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleDownload = async (filePath: string, audioName: string) => {
    try {
      const downloadUrl = getDownloadUrl(filePath);
      if (!downloadUrl || downloadUrl === "#") {
        throw new Error("Unable to resolve download URL.");
      }

      const response = await fetch(downloadUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Download failed.");

      const blob = await response.blob();
      const extension = filePath.includes(".") ? filePath.split(".").pop() : "mp3";
      const safeName = audioName.trim().replace(/\s+/g, "_");
      const fileName = `${safeName || "audio"}.${extension || "mp3"}`;

      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to download audio.");
    }
  };

  return (
    <AuthGuard>
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-10">
        <section className="w-full rounded-3xl border border-cyan-300/20 bg-[linear-gradient(145deg,#050b22,#110f3f_52%,#0a347f)] p-8 shadow-[0_20px_70px_rgba(36,102,255,0.2)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white">Dashboard</h1>
              <p className="mt-3 max-w-3xl text-base text-slate-200">
                Your watermarked audios are shown as stacked quality bars for quick scanning.
              </p>
            </div>

            <Link
              href="/stamp"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/70 bg-[linear-gradient(100deg,rgba(11,8,39,0.95),rgba(36,12,84,0.96)_42%,rgba(10,75,198,0.96))] px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_24px_rgba(67,160,255,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-100/90 hover:text-white hover:shadow-[0_0_30px_rgba(112,220,255,0.58)]"
            >
              <span className="text-lg leading-none">+</span>
              <span>Watermark Audio</span>
            </Link>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-cyan-300/20 bg-[#041126] p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-cyan-200">Total Audios</p>
              <p className="mt-2 text-3xl font-bold text-white">{audios.length}</p>
            </div>
            <div className="rounded-2xl border border-cyan-300/20 bg-[#041126] p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-cyan-200">Average MOS</p>
              <p className="mt-2 text-3xl font-bold text-white">{averageMos ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-cyan-300/20 bg-[#041126] p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-cyan-200">Scored</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {audios.filter((audio) => typeof audio.mos === "number").length}
              </p>
            </div>
          </div>

          {loading ? (
            <p className="mt-6 text-cyan-100">Loading your audios...</p>
          ) : null}

          {errorMessage ? (
            <p className="mt-6 rounded-lg border border-red-300/40 bg-red-900/25 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </p>
          ) : null}

          {!loading && !errorMessage && audios.length === 0 ? (
            <div className="mt-6 rounded-xl border border-cyan-300/20 bg-[#0a1530] px-5 py-5">
              <p className="text-sm text-cyan-100">No watermarked audios found yet.</p>
              <Link
                href="/stamp"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/60 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-100/80 hover:text-white"
              >
                <span className="text-sm leading-none">+</span>
                <span>Watermark Your First Audio</span>
              </Link>
            </div>
          ) : null}

          {!loading && !errorMessage && audios.length > 0 ? (
            <div className="mt-6 space-y-4">
              {audios.map((audio) => {
                const hasMos = typeof audio.mos === "number";
                const normalizedScore = hasMos ? Math.max(0, Math.min(5, audio.mos)) : 0;
                const widthPct = (normalizedScore / 5) * 100;

                return (
                  <article
                    key={audio.id}
                    className="rounded-2xl border border-cyan-300/20 bg-[#071227] px-5 py-5 shadow-[inset_0_1px_0_rgba(120,200,255,0.15)]"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <h2 className="truncate text-2xl font-semibold text-cyan-100">{audio.name}</h2>
                        <p className="mt-1 text-sm text-slate-300">
                          {new Date(audio.created_at).toLocaleString()}
                        </p>
                      </div>

                      {hasMos ? (
                        <>
                          <div className="w-full lg:max-w-2xl">
                            <div className="h-3 rounded-full bg-cyan-950/80">
                              <div
                                className="h-3 rounded-full"
                                style={{
                                  width: `${widthPct}%`,
                                  background: barGradient(audio.mos),
                                }}
                              />
                            </div>
                            <p className="mt-2 text-sm text-cyan-100">{scoreLabel(audio.mos)}</p>
                          </div>

                          <div className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-right">
                            <p className="text-xs uppercase tracking-[0.13em] text-cyan-200">MOS</p>
                            <p className="text-2xl font-bold text-white">{audio.mos?.toFixed(2) ?? "-"}</p>
                          </div>
                        </>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => void handleDownload(audio.file_path, audio.name)}
                        className="inline-flex rounded-full border border-cyan-300/60 bg-cyan-300/12 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-100/80 hover:text-white"
                      >
                        Download
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </main>
    </AuthGuard>
  );
}