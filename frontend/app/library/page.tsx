import AuthGuard from "../components/AuthGuard";

export default function LibraryPage() {
  return (
    <AuthGuard>
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-10">
        <section className="w-full rounded-2xl border border-blue-300/20 bg-[linear-gradient(150deg,rgba(8,12,34,0.9),rgba(20,17,72,0.86)_45%,rgba(6,45,108,0.82))] p-6 shadow-[0_15px_50px_rgba(56,111,255,0.18)]">
          <h1 className="text-3xl font-bold text-white">Library</h1>
          <p className="mt-3 max-w-2xl text-slate-200">
            This protected page will list each stamped file, storage path, and
            MOS values associated with your account.
          </p>
        </section>
      </main>
    </AuthGuard>
  );
}
