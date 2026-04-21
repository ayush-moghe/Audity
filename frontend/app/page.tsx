import SynthwaveWave from "./components/SynthwaveWave";

export default function Home() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-12 sm:px-8 sm:py-16">
      <div className="pointer-events-none fixed inset-0 bg-black" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-[18vh] bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(7,18,47,0.72)_70%,rgba(7,18,47,1)_100%)]" />
      <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <div className="space-y-6 text-white">
          <p className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
            Trust Audio at Scale
          </p>
          <h1 className="max-w-xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            Stamp your audio with proof, then verify it instantly.
          </h1>
          <p className="max-w-xl text-base leading-8 text-slate-200 sm:text-lg">
            Audity helps creators and platforms watermark original audio using
            AudioSeal, monitor quality impact with MOS scoring, and detect
            whether incoming clips carry an authentic Audity stamp.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <a
              href="/login"
              className="rounded-full border border-cyan-200/60 bg-cyan-300/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-cyan-100 transition hover:bg-cyan-300/30"
            >
              Launch Audity
            </a>
          </div>
        </div>
        <SynthwaveWave />
      </section>
    </main>
  );
}
