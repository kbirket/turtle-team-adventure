// src/components/HospitalMap.jsx
import React, { useState } from 'react';
import MapIcon from './MapIcon';

export function HospitalMap({
  childName,
  assignedPin,
  completedCount,
  totalCount,
  isCompleted,
  onSelectStop,
  onStartQuiz
}) {
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.3, 1.8));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.3, 1));

  // All 14 stops mapped to custom SVG filenames
// All 14 stops spread across Left, Middle, and Right path areas
  const stops = [
    { id: 4.0,  label: 'PT & Rehab',  iconSrc: 'clinic.svg',           key: 'PT',          top: '5%',   left: '28%' },
    { id: 5.0,  label: 'Clinic',      iconSrc: 'clinic.svg',           key: 'CLINIC',      top: '10%',  left: '60%' },
    { id: 6.0,  label: 'Behavioral',  iconSrc: 'behavioralhealth.svg', key: 'BEHAVIORAL',  top: '17%',  left: '42%' }, // 👈 Middle
    { id: 7.0,  label: 'Lab',         iconSrc: 'lab.svg',              key: 'LAB',         top: '23%',  left: '66%' },
    { id: 8.0,  label: 'Surgery',     iconSrc: 'surgery.svg',          key: 'SURGERY',     top: '30%',  left: '25%' },
    { id: 9.0,  label: 'Radiology',   iconSrc: 'radiology.svg',        key: 'RADIOLOGY',   top: '37%',  left: '60%' },
    { id: 10.0, label: 'Café',        iconSrc: 'cafe.svg',             key: 'CAFE',        top: '43%',  left: '40%' }, // 👈 Middle
    { id: 11.0, label: 'Business',    iconSrc: 'business.svg',         key: 'BUSINESS',    top: '50%',  left: '65%' },
    { id: 12.0, label: 'IT Dept',     iconSrc: 'it.svg',               key: 'MECHANICAL',  top: '57%',  left: '22%' },
    { id: 13.0, label: 'Emergency',   iconSrc: 'ED.svg',               key: 'EMERGENCY',   top: '64%',  left: '52%' }, // 👈 Middle-Right
    { id: 14.0, label: 'HR',          iconSrc: 'hr.svg',               key: 'ADMIN',       top: '71%',  left: '22%' },
    { id: 15.0, label: 'Hospital',    iconSrc: 'hospital.svg',         key: 'HOSPITAL',    top: '78%',  left: '58%' },
    { id: 16.0, label: 'Marketing',   iconSrc: 'marketing.svg',        key: 'COMMUNITY',   top: '84%',  left: '26%' },
    { id: 17.0, label: 'Maintenance', iconSrc: 'maintenance.svg',      key: 'MAINTENANCE', top: '89%',  left: '50%' }  // 👈 Tucked inside map frame
  ];

  return (
    <div className="flex-1 bg-[#3b0764] p-3 flex flex-col justify-between overflow-hidden h-full">
      {/* Explorer strip */}
      <div className="flex justify-between items-center bg-white/10 border border-white/20 p-2.5 rounded-2xl flex-shrink-0 mb-2">
        <div className="text-left">
          <h2 className="text-xs font-black text-white">
            Explorer: {childName}
          </h2>
          <p className="text-[10px] text-white/70">
            {completedCount} of {totalCount} stamps collected
          </p>
        </div>
        <span className="text-xs bg-[#fbbf24] text-[#3b0764] font-black px-2.5 py-1 rounded-lg font-mono tracking-wider">
          {assignedPin}
        </span>
      </div>

      {/* Map Outer Frame — Strictly Clips Overflow */}
      <div className="relative w-full flex-1 my-auto rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-[#260242]">
        
        {/* Zoom Controls */}
        <div className="absolute top-2 right-2 z-30 flex flex-col gap-1 bg-slate-900/80 backdrop-blur-md p-1 rounded-xl border border-white/20 shadow-lg">
          <button
            onClick={handleZoomIn}
            aria-label="Zoom in map"
            className="w-7 h-7 bg-white text-[#3b0764] font-black text-sm rounded-lg flex items-center justify-center active:scale-90 transition-transform"
          >
            ➕
          </button>
          <button
            onClick={handleZoomOut}
            aria-label="Zoom out map"
            className="w-7 h-7 bg-white text-[#3b0764] font-black text-sm rounded-lg flex items-center justify-center active:scale-90 transition-transform"
          >
            ➖
          </button>
        </div>

        {/* Scrollable / Zoomable Inner Viewport */}
        <div className="w-full h-full overflow-auto">
          <div 
            className="relative w-full h-full transition-transform duration-200 origin-top"
            style={{ 
              transform: `scale(${zoomLevel})`,
              transformOrigin: '50% 0%'
            }}
          >
            {/* Background Graphic */}
            <img 
              src="/icons/hospital-map.svg" 
              alt="Hospital Map" 
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* All 14 Map Markers */}
            {stops.map((s) => (
              <div 
                key={s.id} 
                className="absolute z-20" 
                style={{ top: s.top, left: s.left }}
              >
                <MapIcon 
                  label={s.label} 
                  iconSrc={s.iconSrc} 
                  done={isCompleted(s.key)} 
                  onClick={() => onSelectStop(s.id)} 
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quiz Action Button */}
      <button
        onClick={onStartQuiz}
        className="w-full min-h-[48px] py-3 mt-2 rounded-2xl text-sm uppercase tracking-wide flex-shrink-0 bg-[#e11d48] active:bg-[#be123c] text-white font-black shadow-lg active:scale-95 transition-all"
      >
        🎓 Find My Hospital Job
      </button>
    </div>
  );
}