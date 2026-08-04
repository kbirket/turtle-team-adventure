// src/components/RightPlaceRightCare.jsx
import { useState, useEffect } from 'react';

/* ----------------------------------------------------------------
   SCENARIOS — review with ED/Trauma before the fair.
   answer: 'er' | 'clinic'
   why:    one plain sentence, shown after they choose.
   urgent: true adds a "call 911" line to the explanation.
------------------------------------------------------------------ */
const SCENARIOS = [
  {
    text: "You've had a sore throat and a low fever since yesterday.",
    answer: 'clinic',
    why: "A sore throat and mild fever can wait for the clinic — they can swab for strep and get you started."
  },
  {
    text: "Someone is having trouble breathing and can't catch their breath.",
    answer: 'er',
    urgent: true,
    why: "Trouble breathing is always an emergency. Don't wait for an appointment."
  },
  {
    text: "You rolled your ankle at soccer. It's puffy, but you can still limp on it.",
    answer: 'clinic',
    why: "The clinic can check it and X-ray it. If a bone is poking out or the foot looks crooked, that's the ER."
  },
  {
    text: "A grown-up has pressure or squeezing in their chest.",
    answer: 'er',
    urgent: true,
    why: "Chest pressure can be a heart attack. Every minute counts."
  },
  {
    text: "Your ear has hurt since bedtime and you keep tugging on it.",
    answer: 'clinic',
    why: "Ear infections are one of the most common clinic visits there is."
  },
  {
    text: "You cut your hand and it's still bleeding through the towel after 10 minutes.",
    answer: 'er',
    why: "Bleeding that won't stop with pressure needs the ER."
  },
  {
    text: "You've had a cough and runny nose for about a week.",
    answer: 'clinic',
    why: "Colds that hang around are a clinic visit — no need to sit in the ER waiting room."
  },
  {
    text: "Someone's face is drooping on one side and their words came out wrong.",
    answer: 'er',
    urgent: true,
    why: "That can be a stroke. Getting there fast changes everything."
  },
  {
    text: "You need a sports physical before the season starts.",
    answer: 'clinic',
    why: "Schedule that at the clinic — the ER is for things that can't wait."
  },
  {
    text: "You fell off the monkey bars and your arm is bent the wrong way.",
    answer: 'er',
    why: "A bone that looks out of place needs the ER right away."
  }
];

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const FOCUS =
  'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#22d3ee]';

export default function RightPlaceRightCare({ onExit, onLogEvent }) {
  const [deck, setDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const startGame = () => {
    setDeck(shuffle(SCENARIOS));
    setIndex(0);
    setChoice(null);
    setScore(0);
    setFinished(false);
    onLogEvent?.('rprc_started');
  };

  useEffect(() => { startGame(); }, []);

  const current = deck[index];
  if (!current && !finished) return null;

  const handleChoice = (picked) => {
    if (choice) return;
    setChoice(picked);
    if (picked === current.answer) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (index + 1 >= deck.length) {
      setFinished(true);
      onLogEvent?.('rprc_completed', { score, total: deck.length });
      return;
    }
    setIndex(index + 1);
    setChoice(null);
  };

  const Styles = () => (
    <style>{`
      @keyframes rprcPop {
        0%   { opacity: 0; transform: scale(0.92) translateY(8px); }
        60%  { transform: scale(1.03); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }
      .rprc-pop { animation: rprcPop 0.28s ease-out; }
    `}</style>
  );

  /* ---------- results ---------- */
  if (finished) {
    return (
      <div className="flex-1 bg-[#3b0764] p-6 flex flex-col justify-between h-full text-white overflow-y-auto">
        <Styles />
        <div className="my-auto text-center">
          <div className="text-6xl mb-3">🩺</div>
          <h2 className="text-3xl font-black text-[#22d3ee]">
            {score} / {deck.length}
          </h2>
          <p className="text-sm text-white mt-2 leading-relaxed px-2 font-bold">
            {score === deck.length
              ? "Perfect! You know exactly where to go."
              : score >= deck.length - 2
                ? "Really close — you've got the idea."
                : "Nice try! The big rule: if it's sudden, severe, or scary, choose the ER."}
          </p>

          <div className="bg-white rounded-3xl p-4 mt-5 text-left border-4 border-[#22d3ee] shadow-2xl">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#5b21b6] mb-2">
              The short version
            </h3>
            <ul className="text-xs text-slate-900 leading-relaxed space-y-2 font-medium">
              <li>🩺 <strong>Clinic:</strong> coughs, earaches, sprains, rashes, physicals, stitches for small cuts.</li>
              <li>🚨 <strong>Emergency room:</strong> trouble breathing, chest pain, bleeding that won't stop, head injuries, bones out of place.</li>
              <li>📞 <strong>Call 911</strong> for anything sudden and severe. Never drive yourself.</li>
            </ul>
          </div>

          <p className="text-xs text-white/90 mt-4 leading-snug font-bold">
            When you're not sure, call the clinic and ask. That's what we're here for.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 mt-4">
          <button
            onClick={startGame}
            className={`w-full min-h-[52px] bg-[#fbbf24] active:bg-[#f59e0b] text-[#3b0764] font-black py-3 rounded-2xl uppercase text-sm tracking-wider shadow-lg active:scale-95 transition-all ${FOCUS}`}
          >
            Play Again 🔄
          </button>
          <button
            onClick={onExit}
            className={`w-full min-h-[48px] bg-white/15 active:bg-white/25 border-2 border-white/40 text-white font-black py-2.5 rounded-2xl text-xs uppercase active:scale-95 transition-all ${FOCUS}`}
          >
            Back to Arcade ➔
          </button>
        </div>
      </div>
    );
  }

  /* ---------- question ---------- */
  const isCorrect = choice === current.answer;

  return (
    <div className="flex-1 bg-[#3b0764] p-4 flex flex-col justify-between h-full overflow-y-auto">
      <Styles />

      <div className="text-center flex-shrink-0">
        <span className="text-[11px] uppercase bg-[#22d3ee] text-[#3b0764] px-3 py-1 rounded-full font-black tracking-wider">
          Right Place, Right Care
        </span>
        <p className="text-xs text-white font-black mt-2">
          {index + 1} of {deck.length}
        </p>
      </div>

      <div className="my-auto">
        <div className="bg-white border-4 border-[#7c3aed] rounded-3xl p-5 shadow-2xl text-center min-h-[130px] flex items-center justify-center rprc-pop">
          <p className="text-base font-black text-[#3b0764] leading-relaxed">
            {current.text}
          </p>
        </div>

        {!choice ? (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={() => handleChoice('er')}
              className={`min-h-[92px] bg-[#e11d48] active:bg-[#be123c] text-white font-black rounded-3xl uppercase text-sm tracking-wide shadow-xl active:scale-95 transition-all border-4 border-white/30 ${FOCUS}`}
            >
              <span className="text-3xl block" aria-hidden="true">🚨</span>
              Emergency<br />Room
            </button>
            <button
              onClick={() => handleChoice('clinic')}
              className={`min-h-[92px] bg-[#22d3ee] active:bg-[#06b6d4] text-[#3b0764] font-black rounded-3xl uppercase text-sm tracking-wide shadow-xl active:scale-95 transition-all border-4 border-white/40 ${FOCUS}`}
            >
              <span className="text-3xl block" aria-hidden="true">🩺</span>
              <br />Clinic
            </button>
          </div>
        ) : (
          <div
            role="status"
            aria-live="polite"
            className={`mt-4 rounded-3xl p-4 border-4 shadow-xl rprc-pop ${
              isCorrect
                ? 'bg-[#4ade80] border-white'
                : 'bg-[#fbbf24] border-white'
            }`}
          >
            <p className="text-base font-black uppercase tracking-wide text-[#14532d]">
              {isCorrect
                ? '✅ That\'s right!'
                : `↪️ Actually — ${current.answer === 'er' ? 'Emergency Room' : 'Clinic'}`}
            </p>
            <p className="text-sm text-slate-900 leading-relaxed mt-1.5 font-medium">
              {current.why}
            </p>
            {current.urgent && (
              <p className="text-sm font-black text-[#9f1239] mt-2 bg-white rounded-xl px-2 py-1.5">
                📞 Call 911 for this one — don't drive.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 flex-shrink-0">
        {choice && (
          <button
            onClick={handleNext}
            className={`w-full min-h-[52px] bg-[#fbbf24] active:bg-[#f59e0b] text-[#3b0764] font-black py-3 rounded-2xl uppercase text-sm tracking-wider shadow-lg active:scale-95 transition-all ${FOCUS}`}
          >
            {index + 1 >= deck.length ? 'See My Score ➔' : 'Next One ➔'}
          </button>
        )}
        <button
          onClick={onExit}
          className={`w-full min-h-[44px] bg-white/15 active:bg-white/25 border-2 border-white/40 text-white font-black py-2 rounded-2xl text-xs uppercase active:scale-95 transition-all ${FOCUS}`}
        >
          Back to Arcade
        </button>
        {/* MEDICAL DISCLAIMER BANNER */}
<div className="bg-slate-100 border border-slate-300 rounded-xl p-2 mb-3 text-center">
  <p className="text-[10px] text-slate-700 leading-tight font-medium">
    📋 <strong>Note:</strong> This game is for educational purposes only and does not constitute medical advice. In a real medical emergency, always call 911 immediately.
  </p>
</div>
      </div>
    </div>
  );
}