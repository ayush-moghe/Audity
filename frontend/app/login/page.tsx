"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../components/AuthProvider";

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const nextPath = searchParams.get("next") || "/dashboard";

  useEffect(() => {
    if (!loading && user) {
      router.replace(nextPath);
    }
  }, [loading, nextPath, router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    try {
      await signIn(email, password);
      router.replace(nextPath);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign in.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(59,18,130,0.35),transparent_35%),radial-gradient(circle_at_86%_78%,rgba(27,97,237,0.32),transparent_34%)]" />
      <section className="relative z-10 w-full max-w-md rounded-3xl border border-cyan-300/25 bg-[linear-gradient(160deg,rgba(4,8,20,0.94),rgba(19,14,58,0.95)_45%,rgba(8,28,88,0.88))] p-8 shadow-[0_20px_70px_rgba(32,99,255,0.22)]">
        <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-300">
          Log in to stamp, verify, and manage your authenticated audio library.
        </p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-blue-300/25 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-cyan-200">
              Password
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-blue-300/25 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20"
              placeholder="••••••••"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-lg border border-red-300/40 bg-red-900/25 px-3 py-2 text-sm text-red-200">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl border border-cyan-300/60 bg-[linear-gradient(100deg,rgba(10,11,48,0.96),rgba(36,12,84,0.96)_42%,rgba(10,75,198,0.96))] px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_22px_rgba(67,160,255,0.35)] transition-all duration-300 hover:scale-[1.01] hover:border-cyan-100/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Logging In..." : "Login"}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-300">
          No account yet?{" "}
          <Link href="/register" className="font-semibold text-cyan-200 hover:text-cyan-100">
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}
