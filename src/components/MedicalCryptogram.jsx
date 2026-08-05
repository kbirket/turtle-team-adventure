// src/components/MedicalCryptogram.jsx
import React, { useState, useMemo } from 'react';

const PUZZLES = [
  {
    quote: "WHEREVER THE ART OF MEDICINE IS LOVED, THERE IS ALSO A LOVE OF HUMANITY.",
    author: "Hippocrates"
  },
  {
    quote: "THE GOOD PHYSICIAN TREATS THE DISEASE; THE GREAT PHYSICIAN TREATS THE PATIENT WHO HAS THE DISEASE.",
    author: "William Osler"
  },
  {
    quote: "THE ART OF MEDICINE CONSISTS OF AMUSING THE PATIENT WHILE NATURE CURES THE DISEASE.",
    author: "Voltaire"
  },
  {
    quote: "CURE SOMETIMES, TREAT OFTEN, COMFORT ALWAYS.",
    author: "Hippocrates"
  },
  {
    quote: "THE FIRST DUTY OF MEDICINE IS TO PRESERVE HEALTH AND PREVENT DISEASE.",
    author: "Francis Bacon"
  }
];

export default function MedicalCryptogram({ onExit, onLogEvent }) {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [selectedCipherLetter, setSelectedCipherLetter] = useState(null);
  const [guesses, setGuesses] = useState({}); // { CIPHER_LETTER: GUESSED_LETTER }

  const currentPuzzle = PUZZLES[puzzleIndex];

  // Generate a deterministic substitution cipher map for the quote
  const cipherMap = useMemo(() => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const shuffled = [...alphabet].sort(() => 0.5 - Math.random());
    const map = {};
    alphabet.forEach((char, idx) => {
      map[char] = shuffled[idx];
    });
    return map;
  }, [puzzleIndex]);

  // Inverse cipher to know what code letter represents what true letter
  const reverseCipher = useMemo(() => {
    const rev = {};
    Object.entries(cipherMap).forEach(([plain, code]) => {
      rev[code] = plain;
    });
    return rev;
  }, [cipherMap]);

  const handleCipherClick = (codeLetter) => {
    setSelectedCipherLetter(codeLetter);
  };

  const handleGuess = (plainLetter) => {
    if (!selectedCipherLetter) return;
    setGuesses((prev) => ({
      ...prev,
      [selectedCipherLetter]: plainLetter
    }));
    setSelectedCipherLetter(null);
  };

  const handleClearGuess = (codeLetter) => {
    setGuesses((prev) => {
      const copy = { ...prev };
      delete copy[codeLetter];
      return copy;
    });
  };

  // Check if solved
  const isSolved = useMemo(() => {
    const uniqueChars = new Set(currentPuzzle.quote.replace(/[^A-Z]/g, '').split(''));
    for (let char of uniqueChars) {
      const code = cipherMap[char];
      if (guesses[code] !== char) return false;
    }
    return true;
  }, [currentPuzzle, cipherMap, guesses]);

  const nextPuzzle = () => {
    setGuesses({});
    setSelectedCipherLetter(null);
    setPuzzleIndex((prev) => (prev + 1) % PUZZLES.length);
  };

  return (
    <div className="flex-1 bg-[#1e1b4b] p-4 flex flex-col justify-between h-full text-white overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center bg-white/10 p-3 rounded-2xl flex-shrink-0 mb-2">
        <div>
          <h2 className="text-xs font-black text-[#22d3ee] uppercase tracking-wider">
            🔐 Medical Cryptogram
          </h2>
          <p className="text-[10px] text-white/70">Decode the famous quote!</p>
        </div>
        <button
          onClick={onExit}
          className="text-xs bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1.5 rounded-xl"
        >
          ◀ Back
        </button>
      </div>

      {/* Quote Display Grid */}
      <div className="bg-white/10 border border-white/20 p-3 rounded-2xl my-auto text-center">
        <div className="flex flex-wrap justify-center gap-x-2 gap-y-3 max-h-[220px] overflow-y-auto p-1">
          {currentPuzzle.quote.split(' ').map((word, wordIdx) => (
            <div key={wordIdx} className="flex gap-1 mb-1">
              {word.split('').map((char, charIdx) => {
                const isLetter = /[A-Z]/.test(char);
                if (!isLetter) {
                  return (
                    <span key={charIdx} className="text-sm font-black self-end px-0.5 text-[#fbbf24]">
                      {char}
                    </span>
                  );
                }

                const code = cipherMap[char];
                const guess = guesses[code] || '';
                const isSelected = selectedCipherLetter === code;

                return (
                  <button
                    key={charIdx}
                    onClick={() => handleCipherClick(code)}
                    className={`flex flex-col items-center w-6 sm:w-7 rounded-lg p-0.5 transition-all ${
                      isSelected
                        ? 'bg-[#fbbf24] text-[#1e1b4b] ring-2 ring-white scale-110'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    <span className="text-xs font-black h-4 border-b border-white/30 w-full text-center text-[#22d3ee]">
                      {guess || '_'}
                    </span>
                    <span className="text-[10px] font-mono text-white/60 mt-0.5">
                      {code}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {isSolved && (
          <div className="mt-3 p-2 bg-emerald-500/20 border border-emerald-400 rounded-xl text-emerald-300 animate-bounce">
            <span className="text-xs font-black block">🎉 PUZZLE SOLVED!</span>
            <span className="text-[11px] text-white">
              — {currentPuzzle.author}
            </span>
          </div>
        )}
      </div>

      {/* Letter Picker Keyboard */}
      {!isSolved ? (
        <div className="flex flex-col gap-2 flex-shrink-0 my-2">
          <p className="text-[10px] text-center text-white/70">
            {selectedCipherLetter
              ? `Select real letter for coded letter "${selectedCipherLetter}":`
              : 'Tap any coded letter above, then choose a replacement below:'}
          </p>
          <div className="grid grid-cols-7 gap-1 max-w-[320px] mx-auto">
            {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
              <button
                key={letter}
                disabled={!selectedCipherLetter}
                onClick={() => handleGuess(letter)}
                className="py-1.5 bg-white/20 active:bg-white/40 disabled:opacity-30 rounded-lg text-xs font-black text-white hover:bg-[#22d3ee] hover:text-[#1e1b4b] transition-all"
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={nextPuzzle}
          className="w-full py-3 bg-[#fbbf24] active:bg-[#f59e0b] text-[#1e1b4b] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg my-2"
        >
          Next Quote ➔
        </button>
      )}

      {/* FOOTER & MEDICAL DISCLAIMER */}
      <div className="mt-2 text-center flex flex-col gap-1 flex-shrink-0">
        <p className="text-[9px] text-white/50 leading-tight">
          📋 <em>Educational quote puzzle only. Does not constitute medical advice. In an emergency, call 911.</em>
        </p>
        <div className="text-[10px] text-white/40 font-bold">
          Patterson Health Center · Community Education
        </div>
      </div>
    </div>
  );
}