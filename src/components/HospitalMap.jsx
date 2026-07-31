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

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.35, 2.1));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.35, 1));
  const handleResetZoom = () => setZoomLevel(1);

  // All 14 stops mapped to your custom SVG filenames in public/icons/
  const stops = [
    { id: 4.0,  label: 'PT & Rehab',  iconSrc: 'clinic.svg',           key: 'PT',          top: '6%',   left: '20%' },
    { id: 5.0,  label: 'Clinic',      iconSrc: 'clinic.svg',           key: 'CLINIC',      top: '12%',  left: '60%' },
    { id: 6.0,  label: 'Behavioral',  iconSrc: 'behavioralhealth.svg', key: 'BEHAVIORAL',  top: '19%',  left: '22%' },
    { id: 7.0,  label: 'Lab',         iconSrc: 'lab.svg',              key: 'LAB',         top: '26%',  left: '65%' },
    { id: 8.0,  label: 'Surgery',     iconSrc: 'surgery.svg',      key: 'SURGERY',     top: '33%',  left: '18%' },
    { id: 9.0,  label: 'Radiology',   iconSrc: 'radiology.svg',        key: 'RADIOLOGY',   top: '40%',  left: '62%' },
    { id: 10.0, label: 'Café',        iconSrc: 'cafe.svg',             key: 'CAFE',        top: '47%',  left: '25%' },
    { id: 11.0, label: 'Business',    iconSrc: 'business.svg',         key: 'BUSINESS',    top: '54%',  left: '68%' },
    { id: 12.0, label: 'IT Dept',     iconSrc: 'it.svg',               key: 'MECHANICAL',  top: '61%',  left: '20%' },
    { id: 13.0, label: 'Emergency',   iconSrc: 'ED.svg',               key: 'EMERGENCY',   top: '68%',  left: '60%' },
    { id: 14.0, label: 'HR',          iconSrc: 'hr.svg',               key: 'ADMIN',       top: '74%',  left: '18%' },
    { id: 15.0, label: 'Hospital',    iconSrc: 'hospital.svg',         key: 'HOSPITAL',    top: '80%',  left: '62%' },
    { id: 16.0, label: 'Marketing',   iconSrc: 'marketing.svg',        key: 'COMMUNITY',   top: '86%',  left: '24%' },
    { id: 17.0, label: 'Maintenance', iconSrc: 'maintenance.svg',      key: 'MAINTENANCE', top: '92%',  left: '58%' }
  ];

  return (
    <div className="flex-1 bg-[#3b0764] p-3 flex flex-col justify-between overflow-y-auto h-full">
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

      {/* Map Box Frame */}
      <div className="relative w-full flex-1 min-h-[380px] max-h-[520px] my-auto rounded-2xl overflow-auto border-2 border-white/20 shadow-2xl touch-pan-x touch-pan-y bg-[#260242]">
        
        {/* Floating Zoom Controls in Top Right */}
        <div className="sticky top-2 right-2 float-right z-30 flex flex-col gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl border border-white/20 shadow-lg">
          <button
            onClick={handleZoomIn}
            aria-label="Zoom in map"
            className="w-8 h-8 bg-white text-[#3b0764] font-black text-base rounded-lg flex items-center justify-center active:scale-90 transition-transform shadow"
          >
            ➕
          </button>
          <button
            onClick={handleZoomOut}
            aria-label="Zoom out map"
            className="w-8 h-8 bg-white text-[#3b0764] font-black text-base rounded-lg flex items-center justify-center active:scale-90 transition-transform shadow"
          >
            ➖
          </button>
          {zoomLevel > 1 && (
            <button
              onClick={handleResetZoom}
              aria-label="Reset zoom"
              className="w-8 h-8 bg-[#fbbf24] text-[#3b0764] font-black text-[10px] rounded-lg flex items-center justify-center active:scale-90 transition-transform shadow"
            >
              RESET
            </button>
          )}
        </div>

        {/* Scalable Canvas Container */}
        <div 
          className="relative w-full h-full transition-transform duration-200 origin-top-left"
          style={{ 
            transform: `scale(${zoomLevel})`,
            minWidth: zoomLevel > 1 ? `${zoomLevel * 100}%` : '100%',
            minHeight: zoomLevel > 1 ? `${zoomLevel * 100}%` : '100%'
          }}
        >
          {/* Background Map Graphic */}
          <img 
            src="/icons/hospital-map.svg" 
            alt="Hospital Map" 
            className="w-full h-full object-cover pointer-events-none"
          />

          {/* All 14 Floating SVG Building Markers */}
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