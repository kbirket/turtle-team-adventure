// src/components/MapIcon.jsx
import React from 'react';

export default function MapIcon({ label, iconSrc, done, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="relative group focus:outline-none transition-transform duration-150 active:scale-90"
    >
      {/* The Pure Custom SVG Graphic */}
      <img 
        src={`/icons/${iconSrc}`} 
        alt={label} 
        className={`w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-md transition-all ${
          done ? 'filter brightness-110' : 'hover:scale-105'
        }`}
      />

      {/* Floating Completed Star Badge */}
      {done && (
        <span className="absolute -top-1 -right-1 bg-[#fbbf24] text-[#3b0764] text-xs font-black rounded-full w-5 h-5 flex items-center justify-center shadow-lg border border-white animate-bounce">
          ⭐
        </span>
      )}
    </button>
  );
}