// src/components/BadgeCard.jsx
import React from 'react';

// Auto-scale font size based on Name length
const getNameFontSize = (name = '') => {
  const len = name.length;
  if (len > 12) return 'text-xs leading-none';     // Long names (e.g. CHRISTOPHER)
  if (len > 8)  return 'text-sm leading-none';     // Medium names (e.g. ALEXANDER)
  return 'text-lg leading-none';                   // Short names (e.g. K, SARAH, SAM)
};

// Auto-scale font size based on Career Title length
const getTitleFontSize = (title = '') => {
  const len = title.length;
  if (len > 18) return 'text-[9px] leading-tight';  // Very long (e.g. BEHAVIORAL HEALTH)
  if (len > 12) return 'text-[11px] leading-tight'; // Long (e.g. HUMAN RESOURCES)
  if (len > 8)  return 'text-xs leading-tight';     // Medium (e.g. RADIOLOGY, LAB TECH)
  return 'text-sm leading-tight';                   // Short (e.g. DOCTOR, NURSE)
};

export default function BadgeCard({ name, careerTitle, avatarSrc, badgeCode, variant = 'display' }) {
  const isPrint = variant === 'print';

  return (
    <div className={`w-full h-full relative flex flex-col justify-between p-3 select-none ${isPrint ? 'print-card' : ''}`}>
      
      {/* Top Header Row */}
      <div className="flex justify-between items-start pt-1 px-1">
        <img src="/logo-patterson.png" alt="Patterson Health Center" className="h-7 object-contain" />
        <div className="text-right">
          <div className="text-[9px] font-black tracking-widest text-[#5b21b6] uppercase">TURTLE TEAM</div>
          <div className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">HONORARY MEMBER</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex items-center gap-2 my-auto px-1">
        {/* Avatar / Selfie Photo */}
        <div className="w-20 h-20 rounded-full border-2 border-[#5b21b6] overflow-hidden bg-slate-100 flex-shrink-0 shadow-inner flex items-center justify-center">
          <img src={avatarSrc || '/characters/doctor/avatar.png'} alt="" className="w-full h-full object-cover" />
        </div>

        {/* Name & Title Block */}
        <div className="flex-1 text-center overflow-hidden flex flex-col justify-center">
          {/* Scaled Child Name */}
          <div className="h-6 flex items-center justify-center">
            <h1 className={`font-black text-[#3b0764] uppercase tracking-wide text-center ${getNameFontSize(name)}`}>
              {name || 'EXPLORER'}
            </h1>
          </div>

          {/* Star Divider Line */}
          <div className="flex items-center justify-center gap-1 my-0.5 opacity-60">
            <div className="h-[1px] bg-rose-500 flex-1"></div>
            <span className="text-[8px] text-rose-500">★</span>
            <div className="h-[1px] bg-rose-500 flex-1"></div>
          </div>

          {/* Scaled Career Title */}
          <div className="h-6 flex items-center justify-center px-1">
            <h2 className={`font-black text-rose-600 uppercase tracking-tight text-center ${getTitleFontSize(careerTitle)}`}>
              {careerTitle || 'EXPLORER'}
            </h2>
          </div>

          {/* Subtitle */}
          <div className="text-[7px] font-extrabold text-slate-700 tracking-wider uppercase mt-0.5">
            HONORARY PATTERSON HEALTH CENTER
            <br />
            <span className="text-[#5b21b6]">★ TURTLE TEAM MEMBER ★</span>
          </div>
        </div>
      </div>

      {/* Footer Info / Badge Code */}
      <div className="flex justify-between items-end pb-1 px-1 text-[8px] font-mono font-bold text-slate-600">
        <div>
          <span className="text-[7px] text-slate-400 block font-sans uppercase">BADGE #</span>
          <span className="text-[#3b0764] font-black">{badgeCode || '2026-XXXX'}</span>
        </div>
        <img src="/official-seal.png" alt="" className="h-7 object-contain opacity-90" />
      </div>
    </div>
  );
}