// src/components/HandwashingGame.jsx
import { useState, useEffect } from 'react';

const SCRUB_SECONDS = 20;
const GERM_COUNT = 6;

const FOCUS =
  'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#22d3ee]';

const randomSpot = () => ({
  top: 14 + Math.random() * 56,
  left: 10 + Math.random() * 70
});

export default function HandwashingGame({ onExit, onLogEvent }) {
  const [phase, setPhase] = useState('intro'); // intro | scrubbing | done
  const [secondsLeft, setSecondsLeft] = useState(SCRUB_SECONDS);
  const [germs, setGerms] = useState([]);
  const [zapped, setZapped] = useState(0);

  const start = () => {
    setGerms(
      Array.from({ length: GERM_COUNT }, (_, i) => ({ id: i, ...randomSpot() }))
    );
    setZapped(0);
    setSecondsLeft(SCRUB_SECONDS);
    setPhase('scrubbing');
    onLogEvent?.('handwash_started');
  };

  useEffect(() => {
    if (phase !== 'scrubbing') return;
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(tick);
          setPhase('done');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [phase]);

  useEffect(() => {
    if (phase === 'done') onLogEvent?.('handwash_completed', { zapped });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Germs respawn instead of running out — the point is scrubbing the
  // full 20 seconds, not clearing the board fast.
  const popGerm = (index) => {
    setZapped((z) => z + 1);
    setGerms((list) =>
      list.map((g, i) =>
        i === index ? { id: g.id + GERM_COUNT, ...randomSpot() } : g
      )
    );
  };

  const pct = ((SCRUB_SECONDS - secondsLeft) / SCRUB_SECONDS) * 100;

  const Styles = () => (
    <style>{`
      @keyframes hwWiggle {
        0%, 100% { transform: rotate(-6deg); }
        50%      { transform: rotate(6deg); }
      }
      .hw-wiggle { animation: hwWiggle 1.1s ease-in-out infinite; }
      @keyframes hwPop {
        0%   { opacity: 0; transform: scale(0.8); }
        100% { opacity: 1; transform: scale(1); }
      }
      .hw-pop { animation: hwPop 0.2s ease-out; }
    `}</style>
  );

  /* ---------- intro ---------- */
  if (phase === 'intro') {
    return (
      <div className="flex-1 bg-[#3b0764] p-6 flex flex-col justify-between h-full text-white overflow-y-auto">
        <Styles />
        <div className="my-auto text-center">
          <div className="text-7xl mb-3 hw-wiggle">🧼</div>
          <h2 className="text-2xl font-black text-[#22d3ee]">The 20-Second Scrub</h2>
          <p className="text-sm text-white mt-3 leading-relaxed px-2 font-bold">
            Germs are hiding on your hands. Tap every one you see and keep
            scrubbing for a full 20 seconds — that's how long it really takes.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={start}
            className={`w-full min-h-[56px] bg-[#e11d48] active:bg-[#be123c] text-white font-black py-3 rounded-3xl uppercase text-base tracking-wider shadow-xl active:scale-95 transition-all border-4 border-white/30 ${FOCUS}`}
          >
            Start Scrubbing! 🫧
          </button>
          <button
            onClick={onExit}
            className={`w-full min-h-[44px] bg-white/15 active:bg-white/25 border-2 border-white/40 text-white font-black py-2 rounded-2xl text-xs uppercase active:scale-95 transition-all ${FOCUS}`}
          >
            Back to Arcade
          </button>
        </div>
      </div>
    );
  }

  /* ---------- results ---------- */
  if (phase === 'done') {
    return (
      <div className="flex-1 bg-[#3b0764] p-6 flex flex-col justify-between h-full text-white overflow-y-auto">
        <Styles />
        <div className="my-auto text-center">
          <div className="text-7xl mb-3">✨</div>
          <h2 className="text-2xl font-black text-[#22d3ee]">Squeaky Clean!</h2>
          <p className="text-sm text-white mt-2 font-bold">
            You scrubbed the full 20 seconds and zapped{' '}
            <span className="text-[#fbbf24] text-lg">{zapped}</span> germs.
          </p>

          <div className="bg-white rounded-3xl p-4 mt-5 text-left border-4 border-[#22d3ee] shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#5b21b6] mb-2">
              Why 20 seconds?
            </h3>
            <ul className="text-xs text-slate-900 leading-relaxed space-y-2 font-medium">
              <li>🎂 That's about how long it takes to sing "Happy Birthday" twice.</li>
              <li>🫧 Scrub the backs of your hands, between your fingers, and under your nails.</li>
              <li>🦠 Washing your hands is the single best way to stop germs from spreading.</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 mt-4">
          <button
            onClick={start}
            className={`w-full min-h-[52px] bg-[#fbbf24] active:bg-[#f59e0b] text-[#3b0764] font-black py-3 rounded-2xl uppercase text-sm tracking-wider shadow-lg active:scale-95 transition-all ${FOCUS}`}
          >
            Wash Again 🔄
          </button>
          <button
            onClick={onExit}
            className={`w-full min-h-[44px] bg-white/15 active:bg-white/25 border-2 border-white/40 text-white font-black py-2 rounded-2xl text-xs uppercase active:scale-95 transition-all ${FOCUS}`}
          >
            Back to Arcade ➔
          </button>
        </div>
      </div>
    );
  }

  /* ---------- scrubbing ---------- */
  return (
    <div className="flex-1 bg-[#3b0764] p-4 flex flex-col h-full text-white overflow-hidden">
      <Styles />

      <div className="text-center flex-shrink-0">
        <h2 className="text-lg font-black text-[#22d3ee]">Keep Scrubbing!</h2>
        <p className="text-6xl font-black text-[#fbbf24] tabular-nums leading-none mt-1">
          {secondsLeft}
        </p>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {secondsLeft} seconds left
        </span>
      </div>

      {/* suds meter */}
      <div className="h-4 bg-white/20 rounded-full overflow-hidden mt-3 flex-shrink-0 border-2 border-white/30">
        <div
          className="h-full bg-[#22d3ee] transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* germ field */}
      <div className="relative flex-1 my-3 bg-[#5b21b6] border-4 border-[#22d3ee] rounded-3xl overflow-hidden shadow-2xl">
        <div className="absolute inset-0 flex items-center justify-center text-[7rem] opacity-30 pointer-events-none">
          🤲
        </div>
        {germs.map((germ, i) => (
          <button
            key={germ.id}
            onClick={() => popGerm(i)}
            aria-label="Zap a germ"
            className={`absolute w-16 h-16 text-4xl flex items-center justify-center rounded-full bg-[#4ade80] border-4 border-white shadow-xl active:scale-75 transition-transform hw-pop ${FOCUS}`}
            style={{ top: `${germ.top}%`, left: `${germ.left}%` }}
          >
            🦠
          </button>
        ))}
      </div>

      <p className="text-center text-sm text-white font-black flex-shrink-0">
        Zapped: <span className="text-[#fbbf24]">{zapped}</span>
      </p>
    </div>
  );
}