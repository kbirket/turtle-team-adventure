// src/components/BadgeCard.jsx
import React from 'react';

const getNameFontSize = (name = '') => {
  const len = name.length;
  if (len > 12) return 'text-xs leading-none';
  if (len > 8)  return 'text-sm leading-none';
  return 'text-lg leading-none';
};

const getTitleFontSize = (title = '') => {
  const len = title.length;
  if (len > 15) return 'text-[8px] leading-tight tracking-tighter';
  if (len > 11) return 'text-[9.5px] leading-tight tracking-tight';
  if (len > 7)  return 'text-xs leading-tight tracking-tight';
  return 'text-sm leading-tight tracking-normal';
};

export default function BadgeCard({ name, careerTitle, avatarSrc, badgeCode, variant = 'display' }) {
  const isPrint = variant === 'print';

  return (
    <div className={`w-full h-full relative select-none p-2 flex flex-col justify-between ${isPrint ? 'print-card' : ''}`}>
      
      {/* Spacer for Top Logo Header baked into template */}
      <div className="h-6 w-full" />

      {/* Main Content Row */}
      <div className="flex items-center gap-2 my-auto px-2">
        {/* Avatar Circle */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-[#5b21b6] overflow-hidden bg-white flex-shrink-0 shadow-md flex items-center justify-center">
          <img 
            src={avatarSrc || '/characters/doctor/avatar.png'} 
            alt="" 
            className="w-full h-full object-cover" 
          />
        </div>

        {/* Dynamic Text Column */}
        <div className="flex-1 text-center overflow-hidden flex flex-col justify-center">
          {/* Child Name */}
          <h1 className={`font-black text-[#1e1b4b] uppercase text-center ${getNameFontSize(name)}`}>
            {name || 'EXPLORER'}
          </h1>

          {/* Red Accent Bar */}
          <div className="w-full h-[2px] bg-rose-600 my-1 rounded-full opacity-80" />

          {/* Dynamic Career Title */}
          <h2 className={`font-black text-rose-600 uppercase text-center whitespace-nowrap ${getTitleFontSize(careerTitle)}`}>
            {careerTitle || 'EXPLORER'}
          </h2>
        </div>
      </div>

      {/* Footer Row: Badge Code + Pediatrics QR Code */}
      <div className="flex justify-between items-end px-2 pb-1 text-left">
        <div>
          <span className="text-[7px] text-slate-500 font-bold block uppercase tracking-wider">BADGE #</span>
          <span className="text-xs font-mono font-black text-[#3b0764]">{badgeCode || '2026-XXXX'}</span>
        </div>

        {/* Pediatrics Web Page QR Code */}
        <div className="flex items-center gap-1 bg-white/80 p-0.5 rounded-md border border-slate-200">
          <img 
            src="/pediatrics-qr.png" 
            alt="Pediatrics Page QR Code" 
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain" 
          />
        </div>
      </div>
    </div>
  );
}