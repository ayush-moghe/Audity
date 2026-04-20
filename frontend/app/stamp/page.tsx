import AuthGuard from "../components/AuthGuard";

export default function StampPage() {
  return (
    <AuthGuard>
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-10">
        <section className="w-full rounded-2xl border border-fuchsia-300/20 bg-[linear-gradient(150deg,rgba(14,9,38,0.92),rgba(42,11,74,0.86)_45%,rgba(15,45,114,0.82))] p-6 shadow-[0_15px_50px_rgba(145,82,255,0.18)]">
          <h1 className="text-3xl font-bold text-white">Stamp Audio</h1>
          <p className="mt-3 max-w-2xl text-slate-200">
            This protected page will host audio upload, AudioSeal stamping, and
            MOS scoring.
          </p>
        </section>
      </main>
    </AuthGuard>
  );
}
