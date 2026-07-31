// src/components/MapIcon.jsx
import React from 'react';

export default function MapIcon({ label, iconSrc, done, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="relative group focus:outline-none transition-transform duration-150 active:scale-90"
    >
      {/* Custom Building Graphic - Bumped up to w-16 h-16 (or w-20 h-20 for extra pop) */}
      <img 
        src={`/icons/${iconSrc}`} 
        alt={label} 
        className={`w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-lg transition-all ${
          done ? 'filter brightness-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'hover:scale-105'
        }`}
      />

      {/* Floating Completed Star Badge */}
      {done && (
        <span className="absolute -top-1 -right-1 bg-[#fbbf24] text-[#3b0764] text-xs font-black rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
          ⭐
        </span>
      )}
    </button>
  );
}