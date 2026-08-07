// src/components/BadgeCard.jsx
export default function BadgeCard({
  name,
  careerTitle,
  avatarSrc,
  badgeCode,
  qrSrc = '/qr-pediatrics.png',
  variant = 'screen', // 'screen' | 'print'
}) {
  const nameSize = variant === 'print' ? 'text-2xl' : 'text-2xl sm:text-3xl';

  // Dynamic font sizing so long career titles fit without truncation
  const getTitleSize = (title = '') => {
    const len = title.length;
    if (variant === 'print') {
      if (len > 15) return 'text-[8px] tracking-tighter';  // BEHAVIORAL HEALTH, PHYSICAL THERAPY
      if (len > 11) return 'text-[9.5px] tracking-tight';   // THERAPY & REHAB, HUMAN RESOURCES
      return 'text-xs tracking-wider';                     // DOCTOR, NURSE
    }
    // Screen Variant
    if (len > 15) return 'text-[8px] sm:text-[10px] tracking-tighter';
    if (len > 11) return 'text-[10px] sm:text-xs tracking-tight';
    return 'text-xs sm:text-sm tracking-wider';
  };

  return (
    <>
      {/* CIRCULAR PHOTO WITH GOLD MEDALLION BORDER — SHIFTED DOWN & SIZED TO FIT */}
      <div className="absolute top-[28.5%] left-[5%] w-[30.5%] aspect-square rounded-full bg-white p-0.5 border-4 border-[#fbbf24] ring-2 ring-[#b45309]/20 shadow-md flex items-center justify-center overflow-hidden z-10">
        <img 
          src={avatarSrc || '/characters/doctor/avatar.webp'} 
          alt="" 
          className="w-full h-full object-cover rounded-full" 
        />
      </div>

      <div className="absolute top-[26.5%] left-[39.5%] right-[19.5%] text-center">
        <h2 className={`${nameSize} font-black text-[#0c2340] tracking-tight uppercase truncate leading-none`}>
          {name || 'EXPLORER'}
        </h2>
      </div>

      <div className="absolute top-[48.5%] left-[39.5%] right-[19.5%] text-center">
        <div className={`${getTitleSize(careerTitle)} text-[#d93856] font-black uppercase leading-none whitespace-nowrap`}>
          {careerTitle}
        </div>
      </div>

      <div className="absolute bottom-[14%] left-[44.5%] leading-none text-left">
        <span className="text-[7px] font-bold text-slate-500 block tracking-wider uppercase mb-0.5">
          BADGE #
        </span>
        <span className="text-[9px] font-mono font-black text-[#d93856] tracking-wide block">
          {badgeCode}
        </span>
      </div>

      <div className="absolute bottom-[10%] left-[58.5%] w-[11%] aspect-square bg-white rounded-md p-0.5 flex items-center justify-center border border-slate-300 shadow-sm">
        <img src={qrSrc} alt="" className="w-full h-full object-contain" />
      </div>
    </>
  );
}