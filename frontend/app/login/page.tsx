"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "../components/AuthProvider";

function LoginPageContent() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    } catch {
      setErrorMessage("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(59,18,130,0.35),transparent_35%),radial-gradient(circle_at_86%_78%,rgba(27,97,237,0.32),transparent_34%)]" />
      <section className="relative z-10 w-full max-w-2xl rounded-3xl border border-cyan-300/25 bg-[linear-gradient(160deg,rgb(4,8,20),rgb(19,14,58)_45%,rgb(8,28,88))] px-12 py-16 shadow-[0_20px_70px_rgba(32,99,255,0.22)]">
        <h1 className="text-4xl font-bold tracking-tight text-white">Welcome back</h1>
        <p className="mt-3 text-base text-slate-300">
          Log in to stamp, verify, and manage your authenticated audio library.
        </p>

        <form className="mt-9 space-y-6" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2.5 block text-sm font-semibold uppercase tracking-[0.12em] text-cyan-200">
              Email
            </span>
            <div className="relative">
              <Mail
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-200/70"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-blue-300/25 bg-[#070916] py-4 pl-12 pr-4 text-base text-white outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20"
                placeholder="you@example.com"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2.5 block text-sm font-semibold uppercase tracking-[0.12em] text-cyan-200">
              Password
            </span>
            <div className="relative">
              <Lock
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-200/70"
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-blue-300/25 bg-[#070916] py-4 pl-12 pr-14 text-base text-white outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-cyan-200/80 transition hover:bg-cyan-300/10 hover:text-cyan-100"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {errorMessage ? (
            <p className="rounded-lg border border-red-300/40 bg-red-900/25 px-3 py-2 text-sm text-red-200">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl border border-cyan-300/60 bg-[linear-gradient(100deg,rgba(10,11,48,0.96),rgba(36,12,84,0.96)_42%,rgba(10,75,198,0.96))] px-6 py-4 text-base font-bold uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_22px_rgba(67,160,255,0.35)] transition-all duration-300 hover:scale-[1.01] hover:border-cyan-100/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Logging In..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-base text-slate-300">
          No account yet?{" "}
          <Link href="/register" className="font-semibold text-cyan-200 hover:text-cyan-100">
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center px-6 py-10 text-cyan-100">
          Loading login...
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
