// src/components/MedicalMythBusters.jsx
import React, { useState } from 'react';

const MYTHS = [
  {
    question: "Myth or Fact: Sitting too close to the TV will permanently ruin your vision.",
    isFact: false,
    explanation: "MYTH! It may cause temporary eyestrain or headaches, but it won't cause permanent structural damage to your eyes."
  },
  {
    question: "Myth or Fact: You should put butter or ice on a fresh skin burn.",
    isFact: false,
    explanation: "MYTH! Butter traps heat, and ice can cause tissue damage. Use cool (not freezing) running water for 10–15 minutes."
  },
  {
    question: "Myth or Fact: Cracking your knuckles causes arthritis.",
    isFact: false,
    explanation: "MYTH! The 'pop' sound is just gas bubbles bursting in synovial fluid. Studies show no link to arthritis."
  },
  {
    question: "Myth or Fact: Antibiotics can kill both bacteria and viruses.",
    isFact: false,
    explanation: "MYTH! Antibiotics only kill bacteria. They have zero effect against viral infections like colds or the flu."
  },
  {
    question: "Myth or Fact: Drinking water helps lower blood pressure and improve circulation.",
    isFact: true,
    explanation: "FACT! Proper hydration keeps blood vessels dilated and helps your heart pump blood much more efficiently."
  }
];

export default function MedicalMythBusters({ onExit, onLogEvent }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);

  const current = MYTHS[currentIndex];

  const handleAnswer = (choice) => {
    const correct = choice === current.isFact;
    if (correct) setScore((s) => s + 1);
    setSelectedAnswer(choice);
    onLogEvent?.('mythbusters_answer', { index: currentIndex, correct });
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    if (currentIndex + 1 < MYTHS.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(MYTHS.length); // Game over screen
    }
  };

  return (
    <div className="flex-1 bg-[#1e1b4b] p-4 flex flex-col justify-between h-full text-white">
      {/* Header */}
      <div className="flex justify-between items-center bg-white/10 p-3 rounded-2xl">
        <h2 className="text-xs font-black text-[#22d3ee] uppercase tracking-wider">
          🩺 Medical MythBusters
        </h2>
        <button
          onClick={onExit}
          className="text-xs bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1.5 rounded-xl"
        >
          ◀ Back
        </button>
      </div>

      {currentIndex < MYTHS.length ? (
        <div className="my-auto flex flex-col gap-4 max-w-[320px] mx-auto w-full">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#fbbf24] text-center">
            Question {currentIndex + 1} of {MYTHS.length}
          </span>
          
          <div className="bg-white/10 border border-white/20 p-4 rounded-2xl text-center">
            <h3 className="text-sm font-bold text-white leading-relaxed">
              "{current.question}"
            </h3>
          </div>

          {selectedAnswer === null ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleAnswer(false)}
                className="py-3 bg-[#e11d48] active:bg-[#be123c] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all"
              >
                🚫 MYTH
              </button>
              <button
                onClick={() => handleAnswer(true)}
                className="py-3 bg-[#10b981] active:bg-[#059669] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all"
              >
                ✅ FACT
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className={`p-3 rounded-xl border text-center ${
                selectedAnswer === current.isFact 
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-rose-500/20 border-rose-400 text-rose-300'
              }`}>
                <span className="font-black text-xs block mb-1">
                  {selectedAnswer === current.isFact ? '🎯 CORRECT!' : '❌ NOT QUITE!'}
                </span>
                <p className="text-xs text-white/90 leading-snug">
                  {current.explanation}
                </p>
              </div>

              <button
                onClick={nextQuestion}
                className="w-full py-3 bg-[#fbbf24] active:bg-[#f59e0b] text-[#1e1b4b] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg"
              >
                Next Challenge ➔
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Results Screen */
        <div className="my-auto bg-white/10 border border-white/20 p-6 rounded-3xl text-center max-w-[300px] mx-auto">
          <span className="text-5xl block mb-2">🏆</span>
          <h3 className="text-lg font-black text-white">Challenge Complete!</h3>
          <p className="text-xs text-white/80 mt-1">
            You scored <strong>{score}</strong> out of {MYTHS.length}!
          </p>
          <button
            onClick={() => { setCurrentIndex(0); setScore(0); setSelectedAnswer(null); }}
            className="mt-5 w-full py-3 bg-[#e11d48] text-white font-black text-xs uppercase rounded-xl"
          >
            Play Again 🔄
          </button>
        </div>
      )}

      <div className="text-center text-[10px] text-white/50">
        Patterson Health Center · Community Education
      </div>
    </div>
  );
}