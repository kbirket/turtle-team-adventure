// src/components/MedicalWordSearch.jsx
import React, { useState, useMemo } from 'react';

const PUZZLES = [
  {
    theme: '🏥 Hospital Careers',
    words: ['NURSE', 'DOCTOR', 'RADIOLOGY', 'DIETARY', 'REHAB', 'LABTECH']
  },
  {
    theme: '🧠 Human Anatomy',
    words: ['HEART', 'BRAIN', 'VERTEBRA', 'FEMUR', 'ARTERY', 'MUSCLE']
  },
  {
    theme: '🌻 Everyday Wellness',
    words: ['HEALTH', 'HYDRATE', 'SLEEP', 'VITAMIN', 'FITNESS', 'ENERGY']
  }
];

// Grid generation helper
const GRID_SIZE = 10;

function generateWordSearchGrid(words) {
  const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(''));
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // Attempt to place each word
  words.forEach((word) => {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      attempts++;
      const dir = Math.floor(Math.random() * 2); // 0: horizontal, 1: vertical
      const row = Math.floor(Math.random() * (dir === 1 ? GRID_SIZE - word.length : GRID_SIZE));
      const col = Math.floor(Math.random() * (dir === 0 ? GRID_SIZE - word.length : GRID_SIZE));

      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const r = dir === 1 ? row + i : row;
        const c = dir === 0 ? col + i : col;
        if (grid[r][c] !== '' && grid[r][c] !== word[i]) {
          fits = false;
          break;
        }
      }

      if (fits) {
        for (let i = 0; i < word.length; i++) {
          const r = dir === 1 ? row + i : row;
          const c = dir === 0 ? col + i : col;
          grid[r][c] = word[i];
        }
        placed = true;
      }
    }
  });

  // Fill empty spots with random letters
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) {
        grid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
    }
  }

  return grid;
}

export default function MedicalWordSearch({ onExit, onLogEvent }) {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [selectedCells, setSelectedCells] = useState([]); // [{r, c}]
  const [foundWords, setFoundWords] = useState([]);

  const currentPuzzle = PUZZLES[puzzleIndex];

  // Generate grid when puzzle theme changes
  const grid = useMemo(() => generateWordSearchGrid(currentPuzzle.words), [puzzleIndex]);

  const handleCellClick = (r, c) => {
    const isSelected = selectedCells.some((cell) => cell.r === r && cell.c === c);
    let newSelection = [];

    if (isSelected) {
      newSelection = selectedCells.filter((cell) => !(cell.r === r && cell.c === c));
    } else {
      newSelection = [...selectedCells, { r, c }];
    }

    setSelectedCells(newSelection);

    // Form selected word string
    const currentString = newSelection.map((cell) => grid[cell.r][cell.c]).join('');
    const reverseString = currentString.split('').reverse().join('');

    // Check match against word list
    const matched = currentPuzzle.words.find(
      (w) => (w === currentString || w === reverseString) && !foundWords.includes(w)
    );

    if (matched) {
      setFoundWords((prev) => [...prev, matched]);
      setSelectedCells([]);
      onLogEvent?.('wordsearch_word_found', { word: matched });
    }
  };

  const isSolved = foundWords.length === currentPuzzle.words.length;

  const nextPuzzle = () => {
    setFoundWords([]);
    setSelectedCells([]);
    setPuzzleIndex((prev) => (prev + 1) % PUZZLES.length);
  };

  return (
    <div className="flex-1 bg-[#1e1b4b] p-3 flex flex-col justify-between h-full text-white overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center bg-white/10 p-2.5 rounded-2xl flex-shrink-0 mb-1">
        <div>
          <h2 className="text-xs font-black text-[#22d3ee] uppercase tracking-wider">
            🔍 Medical Word Search
          </h2>
          <p className="text-[10px] text-white/70">{currentPuzzle.theme}</p>
        </div>
        <button
          onClick={onExit}
          className="text-xs bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1.5 rounded-xl"
        >
          ◀ Back
        </button>
      </div>

      {/* Word List Checklist */}
      <div className="flex flex-wrap gap-1.5 justify-center bg-white/10 p-2 rounded-xl border border-white/20">
        {currentPuzzle.words.map((w) => {
          const isFound = foundWords.includes(w);
          return (
            <span
              key={w}
              className={`text-[10px] font-black px-2 py-0.5 rounded-lg transition-all ${
                isFound
                  ? 'bg-emerald-500/30 text-emerald-300 line-through border border-emerald-400/50'
                  : 'bg-white/10 text-white/90'
              }`}
            >
              {isFound ? `✓ ${w}` : w}
            </span>
          );
        })}
      </div>

      {/* 10x10 Touch Grid */}
      <div className="my-auto max-w-[310px] mx-auto w-full">
        <div className="grid grid-cols-10 gap-1 bg-white/10 p-2 rounded-2xl border border-white/20 shadow-2xl">
          {grid.map((row, rIdx) =>
            row.map((letter, cIdx) => {
              const isSelected = selectedCells.some((cell) => cell.r === rIdx && cell.c === cIdx);

              return (
                <button
                  key={`${rIdx}-${cIdx}`}
                  onClick={() => handleCellClick(rIdx, cIdx)}
                  className={`aspect-square rounded-lg font-black text-xs sm:text-sm flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#fbbf24] text-[#1e1b4b] scale-105 shadow-md'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {letter}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Solved Banner / Clear Button */}
      {isSolved ? (
        <div className="bg-emerald-500/20 border border-emerald-400 p-3 rounded-2xl text-center text-emerald-300 my-1 animate-bounce">
          <span className="text-xs font-black block">🎉 ALL WORDS FOUND!</span>
          <button
            onClick={nextPuzzle}
            className="mt-2 w-full py-2 bg-[#fbbf24] active:bg-[#f59e0b] text-[#1e1b4b] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg"
          >
            Next Theme ➔
          </button>
        </div>
      ) : (
        <div className="flex justify-between items-center text-[10px] text-white/60 px-1 my-1">
          <span>Tap letters to select words</span>
          {selectedCells.length > 0 && (
            <button
              onClick={() => setSelectedCells([])}
              className="text-[#fbbf24] font-bold underline"
            >
              Clear Selection
            </button>
          )}
        </div>
      )}

      {/* FOOTER & MEDICAL DISCLAIMER */}
      <div className="mt-1 text-center flex flex-col gap-0.5 flex-shrink-0">
        <p className="text-[9px] text-white/50 leading-tight">
          📋 <em>Educational wellness game. Does not constitute medical advice. In an emergency, call 911.</em>
        </p>
        <div className="text-[10px] text-white/40 font-bold">
          Patterson Health Center · Community Education
        </div>
      </div>
    </div>
  );
}