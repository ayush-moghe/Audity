import AuthGuard from "../components/AuthGuard";

export default function DetectPage() {
  return (
    <AuthGuard>
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-10">
        <section className="w-full rounded-2xl border border-cyan-300/20 bg-[linear-gradient(150deg,rgba(10,12,36,0.9),rgba(13,29,84,0.86)_45%,rgba(9,59,122,0.84))] p-6 shadow-[0_15px_50px_rgba(64,154,255,0.18)]">
          <h1 className="text-3xl font-bold text-white">Detect Stamp</h1>
          <p className="mt-3 max-w-2xl text-slate-200">
            This protected page will check uploaded audio and report whether an
            AudioSeal signature is present.
          </p>
        </section>
      </main>
    </AuthGuard>
  );
}
