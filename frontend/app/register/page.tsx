"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/lib/auth/validation";

export default function RegisterPage() {
  const { user, loading, signUp } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const usernameValidation = validateUsername(username);
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);
  const showUsernameError = usernameTouched && !usernameValidation.valid;
  const showEmailError = emailTouched && !emailValidation.valid;
  const showPasswordError = passwordTouched && !passwordValidation.valid;

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!usernameValidation.valid) {
      setUsernameTouched(true);
      setErrorMessage(usernameValidation.message ?? "Invalid username.");
      return;
    }

    if (!emailValidation.valid) {
      setEmailTouched(true);
      setErrorMessage(emailValidation.message ?? "Invalid email.");
      return;
    }

    if (!passwordValidation.valid) {
      setPasswordTouched(true);
      setErrorMessage(passwordValidation.message ?? "Invalid password.");
      return;
    }

    setSubmitting(true);

    try {
      await signUp({
        username,
        email,
        password,
      });
      router.replace("/dashboard");
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
      <section className="relative z-10 w-full max-w-2xl rounded-3xl border border-fuchsia-300/25 bg-[linear-gradient(160deg,rgb(4,8,20),rgb(36,10,74)_45%,rgb(10,33,98))] px-12 py-16 shadow-[0_20px_70px_rgba(51,110,255,0.22)]">
        <h1 className="text-4xl font-bold tracking-tight text-white">Create your Audity account</h1>
        <p className="mt-3 text-base text-slate-300">
          Register to start stamping and verifying audio provenance.
        </p>

        <form className="mt-9 space-y-6" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2.5 block text-sm font-semibold uppercase tracking-[0.12em] text-fuchsia-200">
              Username
            </span>
            <div className="relative">
              <UserRound
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200/80"
              />
              <input
                type="text"
                required
                minLength={3}
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setUsernameTouched(true);
                }}
                onBlur={() => setUsernameTouched(true)}
                className={`w-full rounded-xl border bg-[#070916] py-4 pl-12 pr-4 text-base text-white outline-none transition focus:ring-2 ${
                  showUsernameError
                    ? "border-red-400/80 focus:border-red-300 focus:ring-red-400/35 shadow-[0_0_18px_rgba(248,113,113,0.5)]"
                    : "border-fuchsia-200/25 focus:border-fuchsia-200/70 focus:ring-fuchsia-200/20"
                }`}
                placeholder="audity_creator"
                autoComplete="username"
              />
            </div>
            <p className={`mt-2 text-xs ${showUsernameError ? "text-red-300" : "text-slate-400"}`}>
              {showUsernameError
                ? usernameValidation.message
                : "3-32 chars, letters/numbers plus . _ -, and no spaces."}
            </p>
          </label>

          <label className="block">
            <span className="mb-2.5 block text-sm font-semibold uppercase tracking-[0.12em] text-fuchsia-200">
              Email
            </span>
            <div className="relative">
              <Mail
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200/80"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setEmailTouched(true);
                }}
                onBlur={() => setEmailTouched(true)}
                className={`w-full rounded-xl border bg-[#070916] py-4 pl-12 pr-4 text-base text-white outline-none transition focus:ring-2 ${
                  showEmailError
                    ? "border-red-400/80 focus:border-red-300 focus:ring-red-400/35 shadow-[0_0_18px_rgba(248,113,113,0.5)]"
                    : "border-fuchsia-200/25 focus:border-fuchsia-200/70 focus:ring-fuchsia-200/20"
                }`}
                placeholder="you@example.com"
              />
            </div>
            {showEmailError ? (
              <p className="mt-2 text-xs text-red-300">{emailValidation.message}</p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-2.5 block text-sm font-semibold uppercase tracking-[0.12em] text-fuchsia-200">
              Password
            </span>
            <div className="relative">
              <Lock
                size={20}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fuchsia-200/80"
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setPasswordTouched(true);
                }}
                onBlur={() => setPasswordTouched(true)}
                className={`w-full rounded-xl border bg-[#070916] py-4 pl-12 pr-14 text-base text-white outline-none transition focus:ring-2 ${
                  showPasswordError
                    ? "border-red-400/80 focus:border-red-300 focus:ring-red-400/35 shadow-[0_0_18px_rgba(248,113,113,0.5)]"
                    : "border-fuchsia-200/25 focus:border-fuchsia-200/70 focus:ring-fuchsia-200/20"
                }`}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-fuchsia-200/80 transition hover:bg-fuchsia-300/10 hover:text-fuchsia-100"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className={`mt-2 text-xs ${showPasswordError ? "text-red-300" : "text-slate-400"}`}>
              {showPasswordError
                ? passwordValidation.message
                : "Include uppercase, lowercase, and a number."}
            </p>
          </label>

          {errorMessage ? (
            <p className="rounded-lg border border-red-300/40 bg-red-900/25 px-3 py-2 text-sm text-red-200">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl border border-fuchsia-300/60 bg-[linear-gradient(100deg,rgba(40,9,70,0.96),rgba(27,10,107,0.96)_42%,rgba(21,102,210,0.96))] px-6 py-4 text-base font-bold uppercase tracking-[0.14em] text-fuchsia-100 shadow-[0_0_22px_rgba(182,109,255,0.32)] transition-all duration-300 hover:scale-[1.01] hover:border-fuchsia-100/80 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creating Account..." : "Register"}
          </button>
        </form>

        <p className="mt-6 text-base text-slate-300">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-cyan-200 hover:text-cyan-100">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
