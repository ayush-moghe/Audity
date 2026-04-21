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
    if (!needle) {
      return audios;
    }
    return audios.filter((audio) => audio.name.toLowerCase().includes(needle));
  }, [audios, search]);

  const getDownloadUrl = (filePath: string) => {
    if (!bucketName || !filePath) {
      return "#";
    }
    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return data.publicUrl;
  };

  return (
    <AuthGuard>
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-10">
        <section className="w-full rounded-2xl border border-blue-300/20 bg-[linear-gradient(150deg,rgb(8,12,34),rgb(20,17,72)_45%,rgb(6,45,108))] p-6 shadow-[0_15px_50px_rgba(56,111,255,0.18)]">
          <h1 className="text-3xl font-bold text-white">Public Library</h1>
          <p className="mt-3 max-w-3xl text-slate-200">
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
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {filteredAudios.map((audio) => (
                <article
                  key={audio.id}
                  className="rounded-xl border border-cyan-300/20 bg-[#070d1e] p-4"
                >
                  <h2 className="text-lg font-semibold text-cyan-100">{audio.name}</h2>
                  <p className="mt-1 text-sm text-slate-300">MOS: {audio.mos ?? "-"}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Uploaded: {new Date(audio.created_at).toLocaleString()}
                  </p>
                  <a
                    href={getDownloadUrl(audio.file_path)}
                    className="mt-4 inline-flex rounded-full border border-cyan-300/60 bg-cyan-300/12 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-100/80 hover:text-white"
                    download
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download
                  </a>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </main>
    </AuthGuard>
  );
}
