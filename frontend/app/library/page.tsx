"use client";

import { useEffect, useMemo, useState } from "react";
import AuthGuard from "../components/AuthGuard";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type PublicAudioRow = {
  id: number;
  name: string;
  file_path: string;
  mos: number | null;
  created_at: string;
  public: boolean;
};

export default function LibraryPage() {
  const supabase = getSupabaseBrowserClient();
  const [audios, setAudios] = useState<PublicAudioRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const bucketName = process.env.NEXT_PUBLIC_SUPABASE_AUDIO_BUCKET;

  useEffect(() => {
    const loadPublicAudios = async () => {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("Audios")
        .select("id,name,file_path,mos,created_at,public")
        .eq("public", true)
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(`Failed to load public audios: ${error.message}`);
        setAudios([]);
      } else {
        setAudios((data as PublicAudioRow[]) ?? []);
      }

      setLoading(false);
    };

    loadPublicAudios();
  }, [supabase]);

  const filteredAudios = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return audios;
    return audios.filter((audio) => audio.name.toLowerCase().includes(needle));
  }, [audios, search]);

  const getDownloadUrl = (filePath: string) => {
    if (!bucketName || !filePath) return "#";
    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleDownload = async (filePath: string, audioName: string) => {
    try {
      const downloadUrl = getDownloadUrl(filePath);
      if (!downloadUrl || downloadUrl === "#") throw new Error("Unable to resolve download URL.");

      const response = await fetch(downloadUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Download failed.");

      const blob = await response.blob();
      const extension = filePath.includes(".") ? filePath.split(".").pop() : "wav";
      const safeName = audioName.trim().replace(/\s+/g, "_");
      const fileName = `${safeName || "audio"}.${extension || "wav"}`;

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

  const scoreLabel = (mos: number | null) => {
    if (typeof mos !== "number") return "Not scored";
    if (mos >= 4.0) return "Excellent";
    if (mos >= 3.2) return "Good";
    if (mos >= 2.4) return "Fair";
    return "Needs review";
  };

  return (
    <AuthGuard>
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-10">
        <section className="w-full rounded-3xl border border-blue-300/20 bg-[linear-gradient(150deg,#071127,#17124e_46%,#073987)] p-8 shadow-[0_20px_70px_rgba(56,111,255,0.18)]">
          <h1 className="text-4xl font-bold text-white">Public Library</h1>
          <p className="mt-3 max-w-3xl text-base text-slate-200">
            Download public watermarked audios shared by creators.
          </p>

          <div className="mt-6">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search public audio by name"
              className="w-full rounded-xl border border-blue-200/25 bg-[#070916] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20"
            />
          </div>

          {loading ? (
            <p className="mt-6 text-cyan-100">Loading public audios...</p>
          ) : null}

          {errorMessage ? (
            <p className="mt-6 rounded-lg border border-red-300/40 bg-red-900/25 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </p>
          ) : null}

          {!loading && !errorMessage && filteredAudios.length === 0 ? (
            <p className="mt-6 rounded-lg border border-cyan-300/20 bg-[#0a1530] px-4 py-3 text-sm text-cyan-100">
              No public audios found.
            </p>
          ) : null}

          {!loading && !errorMessage && filteredAudios.length > 0 ? (
            <div className="mt-6 max-h-[600px] space-y-4 overflow-y-auto pr-2">
              {filteredAudios.map((audio) => {
                const hasMos = typeof audio.mos === "number";
                const normalizedScore = hasMos ? Math.max(0, Math.min(5, audio.mos)) : 0;
                const widthPct = (normalizedScore / 5) * 100;

                return (
                  <article
                    key={audio.id}
                    className="rounded-2xl border border-cyan-300/20 bg-[#061128] px-6 py-6"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <h2 className="truncate text-2xl font-semibold text-cyan-100">{audio.name}</h2>
                        <p className="mt-1 text-sm text-slate-300">
                          Uploaded: {new Date(audio.created_at).toLocaleString()}
                        </p>
                      </div>

                      {hasMos ? (
                        <div className="w-full lg:max-w-2xl">
                          <div className="h-3 rounded-full bg-cyan-950/75">
                            <div
                              className="h-3 rounded-full bg-[linear-gradient(90deg,#68f0ff,#3f89ff)]"
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                          <p className="mt-2 text-sm text-cyan-100">{scoreLabel(audio.mos)}</p>
                        </div>
                      ) : null}

                      <div className="flex items-center gap-4">
                        {hasMos ? (
                          <div className="rounded-xl border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-right">
                            <p className="text-xs uppercase tracking-[0.13em] text-cyan-200">MOS</p>
                            <p className="text-2xl font-bold text-white">{audio.mos?.toFixed(2) ?? "-"}</p>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => void handleDownload(audio.file_path, audio.name)}
                          title="Download"
                          className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-300/60 bg-cyan-300/10 text-cyan-100 transition hover:border-cyan-100/80 hover:text-white"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                        </button>
                      </div>
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