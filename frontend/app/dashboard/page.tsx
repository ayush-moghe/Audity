import AuthGuard from "../components/AuthGuard";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-6 py-10">
        <section className="w-full rounded-2xl border border-cyan-300/20 bg-[linear-gradient(150deg,rgba(8,12,34,0.9),rgba(18,12,64,0.85)_45%,rgba(11,38,110,0.82))] p-6 shadow-[0_15px_50px_rgba(36,102,255,0.2)]">
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-3 max-w-2xl text-slate-200">
            Your account is authenticated. Next, we will plug in stamped audio
            metrics and recent activity here.
          </p>
        </section>
      </main>
    </AuthGuard>
  );
}
