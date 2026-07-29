// src/components/HandwashingGame.jsx
import { useState, useEffect } from 'react';

const SCRUB_SECONDS = 20;
const GERM_COUNT = 6;

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phc-gold';

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

  /* ---------- intro ---------- */
  if (phase === 'intro') {
    return (
      <div className="flex-1 bg-phc-navy p-6 flex flex-col justify-between h-full text-white overflow-y-auto">
        <div className="my-auto text-center">
          <div className="text-6xl mb-3">🧼</div>
          <h2 className="text-xl font-black">The 20-Second Scrub</h2>
          <p className="text-sm text-white/90 mt-3 leading-relaxed px-2">
            Germs are hiding on your hands. Tap every one you see and keep
            scrubbing for a full 20 seconds — that's how long it really takes.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={start}
            className={`w-full min-h-[52px] bg-phc-gold text-phc-navy font-black py-3 rounded-xl uppercase text-sm tracking-wider shadow-lg active:scale-95 ${focusRing}`}
          >
            Start Scrubbing! 🫧
          </button>
          <button
            onClick={onExit}
            className={`w-full min-h-[44px] bg-white/20 text-white font-bold py-2 rounded-xl text-xs uppercase active:scale-95 ${focusRing}`}
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
      <div className="flex-1 bg-phc-navy p-6 flex flex-col justify-between h-full text-white overflow-y-auto">
        <div className="my-auto text-center">
          <div className="text-6xl mb-3">✨</div>
          <h2 className="text-xl font-black text-phc-gold">Squeaky Clean!</h2>
          <p className="text-sm text-white/90 mt-2">
            You scrubbed the full 20 seconds and zapped{' '}
            <strong className="text-phc-gold">{zapped}</strong> germs.
          </p>

          <div className="bg-white rounded-2xl p-4 mt-5 text-left">
            <h3 className="text-xs font-black uppercase tracking-wider text-phc-navy mb-2">
              Why 20 seconds?
            </h3>
            <ul className="text-xs text-slate-800 leading-relaxed space-y-1.5">
              <li>• That's about how long it takes to sing "Happy Birthday" twice.</li>
              <li>• Scrub the backs of your hands, between your fingers, and under your nails.</li>
              <li>• Washing your hands is the single best way to stop germs from spreading.</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <button
            onClick={start}
            className={`w-full min-h-[48px] bg-phc-gold text-phc-navy font-black py-3 rounded-xl uppercase text-xs tracking-wider shadow-lg active:scale-95 ${focusRing}`}
          >
            Wash Again 🔄
          </button>
          <button
            onClick={onExit}
            className={`w-full min-h-[44px] bg-white/20 text-white font-bold py-2 rounded-xl text-xs uppercase active:scale-95 ${focusRing}`}
          >
            Back to Arcade ➔
          </button>
        </div>
      </div>
    );
  }

  /* ---------- scrubbing ---------- */
  return (
    <div className="flex-1 bg-phc-navy p-4 flex flex-col h-full text-white overflow-hidden">
      <div className="text-center flex-shrink-0">
        <h2 className="text-base font-black">Keep Scrubbing!</h2>
        <p className="text-4xl font-black text-phc-gold tabular-nums mt-1">
          {secondsLeft}
        </p>
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {secondsLeft} seconds left
        </span>
      </div>

      {/* suds meter */}
      <div className="h-3 bg-white/20 rounded-full overflow-hidden mt-2 flex-shrink-0">
        <div
          className="h-full bg-phc-gold transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* germ field */}
      <div className="relative flex-1 my-3 bg-white/10 border-2 border-white/25 rounded-3xl overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center text-[7rem] opacity-25 pointer-events-none">
          🤲
        </div>
        {germs.map((germ, i) => (
          <button
            key={germ.id}
            onClick={() => popGerm(i)}
            aria-label="Zap a germ"
            className={`absolute w-14 h-14 text-3xl flex items-center justify-center rounded-full bg-white/90 shadow-lg active:scale-75 transition-transform ${focusRing}`}
            style={{ top: `${germ.top}%`, left: `${germ.left}%` }}
          >
            🦠
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-white/80 font-bold flex-shrink-0">
        Zapped: {zapped}
      </p>
    </div>
  );
}