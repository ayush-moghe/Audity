"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

  return (
    <AuthGuard>
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-10">
        <section className="w-full rounded-2xl border border-cyan-300/20 bg-[linear-gradient(150deg,rgb(8,12,34),rgb(18,12,64)_45%,rgb(11,38,110))] p-6 shadow-[0_15px_50px_rgba(36,102,255,0.2)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="mt-3 max-w-3xl text-slate-200">
                Your watermarked audio history appears below with file path and MOS score.
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
            <div className="mt-6 overflow-x-auto rounded-xl border border-cyan-300/20">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#081b39] text-cyan-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">MOS</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {audios.map((audio) => (
                    <tr key={audio.id} className="border-t border-cyan-300/10 text-slate-100">
                      <td className="px-4 py-3">{audio.name}</td>
                      <td className="px-4 py-3">{audio.mos ?? "-"}</td>
                      <td className="px-4 py-3">
                        {new Date(audio.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-300">{audio.file_path}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </main>
    </AuthGuard>
  );
}
