"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";

export default function RegisterPage() {
  const { user, loading, signUp } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setSubmitting(true);

    try {
      await signUp({
        username,
        email,
        password,
      });
      setSuccessMessage(
        "Account created. Check your email if confirmation is enabled, then login.",
      );
      setPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to register.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(68,20,145,0.38),transparent_38%),radial-gradient(circle_at_84%_82%,rgba(17,96,232,0.36),transparent_36%)]" />
      <section className="relative z-10 w-full max-w-md rounded-3xl border border-fuchsia-300/25 bg-[linear-gradient(160deg,rgba(4,8,20,0.94),rgba(36,10,74,0.95)_45%,rgba(10,33,98,0.9))] p-8 shadow-[0_20px_70px_rgba(51,110,255,0.22)]">
        <h1 className="text-3xl font-bold tracking-tight text-white">Create your Audity account</h1>
        <p className="mt-2 text-sm text-slate-300">
          Register to start stamping and verifying audio provenance.
        </p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-fuchsia-200">
              Username
            </span>
            <input
              type="text"
              required
              minLength={3}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-xl border border-fuchsia-200/25 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-200/70 focus:ring-2 focus:ring-fuchsia-200/20"
              placeholder="audity_creator"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-fuchsia-200">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-fuchsia-200/25 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-200/70 focus:ring-2 focus:ring-fuchsia-200/20"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-fuchsia-200">
              Password
            </span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-fuchsia-200/25 bg-black/35 px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-200/70 focus:ring-2 focus:ring-fuchsia-200/20"
              placeholder="At least 8 characters"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-lg border border-red-300/40 bg-red-900/25 px-3 py-2 text-sm text-red-200">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-lg border border-emerald-300/40 bg-emerald-900/25 px-3 py-2 text-sm text-emerald-200">
              {successMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl border border-fuchsia-300/60 bg-[linear-gradient(100deg,rgba(40,9,70,0.96),rgba(27,10,107,0.96)_42%,rgba(21,102,210,0.96))] px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-fuchsia-100 shadow-[0_0_22px_rgba(182,109,255,0.32)] transition-all duration-300 hover:scale-[1.01] hover:border-fuchsia-100/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating Account..." : "Register"}
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-300">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-cyan-200 hover:text-cyan-100">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
