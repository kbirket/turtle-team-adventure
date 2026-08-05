// src/components/CareOGrams.jsx
import React, { useState } from 'react';

const PUZZLES = [
  {
    scrambled: "X - R - A - Y",
    answer: "XRAY",
    service: "Radiology & Imaging",
    spotlight: "Patterson Health Center offers 3D Mammography, Ultrasound, and CT scans right here in Harper County—no long drive required!"
  },
  {
    scrambled: "R - E - H - A - B",
    answer: "REHAB",
    service: "Physical & Occupational Therapy",
    spotlight: "Recover from surgery or injury close to home with our expert local physical and occupational therapy team."
  },
  {
    scrambled: "S - C - R - U - B",
    answer: "SCRUB",
    service: "Surgical Services",
    spotlight: "From outpatient procedures to specialist surgeries, our surgical suite is equipped with modern medical technology."
  },
  {
    scrambled: "C - L - I - N - I - C",
    answer: "CLINIC",
    service: "Family Medicine & Rural Health",
    spotlight: "Need a wellness check or same-day care? Our primary care clinics in Harper and Anthony are here for your whole family."
  }
];

export default function CareOGrams({ onExit, onLogEvent }) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [solved, setSolved] = useState(false);
  const [error, setError] = useState(false);

  const current = PUZZLES[index];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim().toUpperCase() === current.answer) {
      setSolved(true);
      setError(false);
      onLogEvent?.('anagram_solved', { service: current.service });
    } else {
      setError(true);
    }
  };

  const nextPuzzle = () => {
    setInput('');
    setSolved(false);
    setError(false);
    setIndex((prev) => (prev + 1) % PUZZLES.length);
  };

  return (
    <div className="flex-1 bg-[#1e1b4b] p-4 flex flex-col justify-between h-full text-white overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center bg-white/10 p-3 rounded-2xl flex-shrink-0">
        <div>
          <h2 className="text-xs font-black text-[#22d3ee] uppercase tracking-wider">
            🔤 Care-O-Grams
          </h2>
          <p className="text-[10px] text-white/70">Unscramble the service word!</p>
        </div>
        <button
          onClick={onExit}
          className="text-xs bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1.5 rounded-xl"
        >
          ◀ Back
        </button>
      </div>

      {/* Main Game Box */}
      <div className="my-auto max-w-[320px] mx-auto w-full text-center">
        {!solved ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 bg-white/10 p-5 rounded-2xl border border-white/20 shadow-xl">
            <span className="text-[10px] uppercase font-bold text-[#fbbf24] tracking-widest">
              Scrambled Word {index + 1} of {PUZZLES.length}
            </span>
            
            <div className="text-2xl font-black text-white tracking-widest my-2 bg-white/10 py-3 rounded-xl border border-white/20">
              {current.scrambled}
            </div>

            <input
              type="text"
              placeholder="TYPE YOUR ANSWER"
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              className="w-full bg-white text-[#1e1b4b] font-black text-center text-sm py-3 rounded-xl uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-[#22d3ee]"
              autoFocus
            />

            {error && (
              <p className="text-xs font-bold text-rose-400 bg-rose-500/20 py-1 rounded-lg">
                Not quite! Try again.
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#e11d48] active:bg-[#be123c] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg"
            >
              Check Answer ➔
            </button>
          </form>
        ) : (
          /* Service Spotlight Reveal Card */
          <div className="bg-white text-[#1e1b4b] p-5 rounded-2xl shadow-2xl flex flex-col gap-3 animate-fade-in">
            <span className="text-3xl">🌟</span>
            <h3 className="font-black text-base text-[#5b21b6]">{current.service}</h3>
            <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-800 leading-relaxed font-medium border border-slate-200">
              {current.spotlight}
            </div>
            <button
              onClick={nextPuzzle}
              className="w-full py-3 bg-[#fbbf24] active:bg-[#f59e0b] text-[#3b0764] font-black text-xs uppercase tracking-wider rounded-xl shadow-md"
            >
              Next Care-O-Gram ➔
            </button>
          </div>
        )}
      </div>

      {/* FOOTER & MEDICAL DISCLAIMER */}
      <div className="mt-2 text-center flex flex-col gap-0.5 flex-shrink-0">
        <p className="text-[9px] text-white/50 leading-tight">
          📋 <em>Educational game highlighting local community healthcare. Does not constitute medical advice. In an emergency, call 911.</em>
        </p>
        <div className="text-[10px] text-white/40 font-bold">
          Patterson Health Center · Community Education
        </div>
      </div>
    </div>
  );
}