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
  const titleSize = variant === 'print' ? 'text-xs' : 'text-xs sm:text-sm';

  return (
    <>
      <div className="absolute top-[26%] left-[4%] w-[32.5%] h-[60%] flex items-center justify-center">
        <img src={avatarSrc} alt="" className="w-full h-full object-contain" />
      </div>

      <div className="absolute top-[26.5%] left-[39.5%] right-[19.5%] text-center">
        <h2 className={`${nameSize} font-black text-[#0c2340] tracking-tight uppercase truncate leading-none`}>
          {name || 'EXPLORER'}
        </h2>
      </div>

      <div className="absolute top-[48.5%] left-[39.5%] right-[19.5%] text-center">
        <div className={`${titleSize} text-[#d93856] font-black uppercase tracking-wider leading-none truncate`}>
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