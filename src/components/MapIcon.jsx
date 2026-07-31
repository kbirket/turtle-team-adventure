// src/components/MapIcon.jsx
import React from 'react';

export default function MapIcon({ label, iconSrc, done, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-1.5 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border-2 transition-all active:scale-90 ${
        done ? 'border-amber-400 ring-2 ring-amber-400' : 'border-purple-300'
      }`}
    >
      {/* Custom SVG Building Image */}
      <img 
        src={`/icons/${iconSrc}`} 
        alt={label} 
        className="w-10 h-10 object-contain drop-shadow-sm"
      />
      <span className="text-[10px] font-black text-purple-950 whitespace-nowrap mt-0.5">
        {label} {done && '⭐'}
      </span>
    </button>
  );
}