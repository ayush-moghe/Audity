"use client";

import Link from "next/link";
import { Pacifico } from "next/font/google";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

const logoFont = Pacifico({
  weight: "400",
  subsets: ["latin"],
});

type NavLink = {
  href: string;
  label: string;
};

const protectedLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/stamp", label: "Watermark" },
  { href: "/detect", label: "Detect" },
  { href: "/library", label: "Library" },
];

export default function Navbar() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const isAuthenticated = Boolean(user);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b-2 border-blue-400/60 bg-[linear-gradient(110deg,rgba(74,8,122,0.82),rgba(18,34,102,0.88)_48%,rgba(8,149,255,0.68))] shadow-[0_10px_40px_rgba(55,120,255,0.24)] backdrop-blur-md">
      <nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className={`${logoFont.className} inline-flex items-center leading-none text-2xl text-cyan-300 drop-shadow-[0_0_10px_rgba(72,193,255,0.98)] sm:text-3xl lg:text-4xl`}
        >
          Audity
        </Link>

        <div className="hidden items-center gap-10 lg:gap-12 md:flex">
          {isAuthenticated &&
            protectedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-cyan-300/25 bg-cyan-300/8 px-4 py-2.5 text-base font-semibold tracking-[0.08em] text-cyan-100 shadow-[0_0_14px_rgba(33,145,255,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-200/80 hover:bg-cyan-300/20 hover:text-white hover:shadow-[0_0_20px_rgba(110,216,255,0.45)]"
              >
                {link.label}
              </Link>
            ))}
        </div>

        <div>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="group relative overflow-hidden rounded-full border border-cyan-300/60 bg-[linear-gradient(100deg,rgba(11,8,39,0.95),rgba(36,12,84,0.96)_42%,rgba(10,75,198,0.96))] px-6 py-2.5 text-sm font-bold uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_20px_rgba(67,160,255,0.35)] transition-all duration-300 hover:scale-[1.02] hover:border-cyan-100/80 hover:text-white hover:shadow-[0_0_30px_rgba(112,220,255,0.58)]"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="group relative overflow-hidden rounded-full border border-cyan-300/60 bg-[linear-gradient(100deg,rgba(11,8,39,0.95),rgba(36,12,84,0.96)_42%,rgba(10,75,198,0.96))] px-6 py-2.5 text-sm font-bold uppercase tracking-[0.14em] text-cyan-100 shadow-[0_0_20px_rgba(67,160,255,0.35)] transition-all duration-300 hover:scale-[1.02] hover:border-cyan-100/80 hover:text-white hover:shadow-[0_0_30px_rgba(112,220,255,0.58)]"
            >
              Login
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}