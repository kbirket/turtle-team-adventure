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

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phc-navy';

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

  /* ---------- results ---------- */
  if (finished) {
    return (
      <div className="flex-1 bg-gradient-to-b from-phc-navy to-[#00263f] p-6 flex flex-col justify-between h-full text-white overflow-y-auto">
        <div className="my-auto text-center">
          <div className="text-5xl mb-3">🩺</div>
          <h2 className="text-xl font-black">
            {score} out of {deck.length}
          </h2>
          <p className="text-sm text-white/85 mt-2 leading-relaxed px-2">
            {score === deck.length
              ? "Perfect! You know exactly where to go."
              : score >= deck.length - 2
                ? "Really close — you've got the idea."
                : "Nice try! The big rule: if it's sudden, severe, or scary, choose the ER."}
          </p>

          <div className="bg-white/10 border border-white/20 rounded-2xl p-4 mt-5 text-left">
            <h3 className="text-xs font-black uppercase tracking-wider text-phc-gold mb-2">
              The short version
            </h3>
            <ul className="text-xs text-white/90 leading-relaxed space-y-1.5">
              <li>• <strong>Walk-in clinic:</strong> coughs, earaches, sprains, rashes, physicals, stitches for small cuts.</li>
              <li>• <strong>Emergency room:</strong> trouble breathing, chest pain, bleeding that won't stop, head injuries, bones out of place.</li>
              <li>• <strong>Call 911</strong> for anything sudden and severe. Never drive yourself.</li>
            </ul>
          </div>

          <p className="text-[11px] text-white/70 mt-4 leading-snug">
            When you're not sure, call the clinic and ask. That's what we're here for.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={startGame}
            className={`w-full min-h-[48px] bg-phc-gold text-phc-navy font-black py-3 rounded-xl uppercase text-xs tracking-wider shadow-lg active:scale-95 ${focusRing}`}
          >
            Play Again 🔄
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

  /* ---------- question ---------- */
  const isCorrect = choice === current.answer;

  return (
    <div className="flex-1 bg-slate-50 p-4 flex flex-col justify-between h-full overflow-y-auto">
      <div className="text-center">
        <span className="text-[11px] uppercase bg-phc-blue/15 text-phc-navy px-3 py-1 rounded-full font-black tracking-wider">
          Right Place, Right Care
        </span>
        <p className="text-[11px] text-slate-600 font-bold mt-1.5">
          {index + 1} of {deck.length}
        </p>
      </div>

      <div className="my-auto">
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm text-center min-h-[120px] flex items-center justify-center">
          <p className="text-base font-bold text-phc-navy leading-relaxed">
            {current.text}
          </p>
        </div>

        {!choice ? (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={() => handleChoice('er')}
              className={`min-h-[80px] bg-phc-orange text-white font-black rounded-2xl uppercase text-sm tracking-wide shadow-md active:scale-95 transition-all ${focusRing}`}
            >
              🚨<br />Emergency<br />Room
            </button>
            <button
              onClick={() => handleChoice('clinic')}
              className={`min-h-[80px] bg-phc-blue text-white font-black rounded-2xl uppercase text-sm tracking-wide shadow-md active:scale-95 transition-all ${focusRing}`}
            >
              🩺<br />Walk-In<br />Clinic
            </button>
          </div>
        ) : (
          <div
            role="status"
            aria-live="polite"
            className={`mt-4 rounded-2xl p-4 border-2 animate-fade-in ${
              isCorrect
                ? 'bg-emerald-50 border-emerald-600'
                : 'bg-amber-50 border-phc-orange'
            }`}
          >
            <p className={`text-sm font-black uppercase tracking-wide ${
              isCorrect ? 'text-emerald-800' : 'text-phc-navy'
            }`}>
              {isCorrect ? '✅ That\'s right!' : '↪️ Actually — '}
              {!isCorrect && (current.answer === 'er' ? 'Emergency Room' : 'Walk-In Clinic')}
            </p>
            <p className="text-xs text-slate-800 leading-relaxed mt-1.5">
              {current.why}
            </p>
            {current.urgent && (
              <p className="text-xs font-black text-phc-orange mt-2">
                📞 Call 911 for this one — don't drive.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {choice && (
          <button
            onClick={handleNext}
            className={`w-full min-h-[48px] bg-phc-navy text-white font-black py-3 rounded-xl uppercase text-xs tracking-wider shadow-md active:scale-95 ${focusRing}`}
          >
            {index + 1 >= deck.length ? 'See My Score ➔' : 'Next One ➔'}
          </button>
        )}
        <button
          onClick={onExit}
          className={`w-full min-h-[44px] bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs uppercase active:scale-95 ${focusRing}`}
        >
          Back to Arcade
        </button>
      </div>
    </div>
  );
}