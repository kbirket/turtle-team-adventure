// src/components/MapIcon.jsx
import React from 'react';

export default function MapIcon({ label, iconSrc, done, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="relative group focus:outline-none transition-transform duration-150 active:scale-90"
    >
      {/* Custom Building Graphic with Dynamic Glow */}
      <img 
        src={`/icons/${iconSrc}`} 
        alt={label} 
        className={`w-16 h-16 sm:w-20 sm:h-20 object-contain transition-all duration-300 ${
          done
            ? 'filter drop-shadow-[0_0_12px_rgba(251,191,36,0.95)] brightness-110 scale-105' // Gold Glow for Completed ⭐
            : 'filter drop-shadow-[0_0_10px_rgba(34,211,238,0.7)] hover:drop-shadow-[0_0_14px_rgba(255,255,255,0.9)] hover:scale-105 animate-pulse' // Cyan Pulse for Unvisited ✨
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