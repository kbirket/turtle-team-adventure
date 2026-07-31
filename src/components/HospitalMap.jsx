// src/components/HospitalMap.jsx
import React from 'react';
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
  return (
    <div className="flex-1 bg-[#3b0764] p-3 sm:p-4 flex flex-col justify-between overflow-y-auto h-full">
      {/* Explorer strip */}
      <div className="flex justify-between items-center bg-white/10 border border-white/20 p-2.5 rounded-2xl flex-shrink-0 mb-2">
        <div className="text-left">
          <h2 className="text-xs sm:text-sm font-black text-white">
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

      {/* Map Container - Tall Vertical Aspect to Match Background */}
      <div className="relative w-full flex-1 min-h-[360px] max-h-[480px] my-auto bg-[#260242] rounded-2xl overflow-hidden border-2 border-white/20 shadow-inner">
        
        {/* Full-bleed Map Graphic */}
        <img 
          src="/icons/hospital-map.svg" 
          alt="Hospital Map" 
          className="w-full h-full object-cover pointer-events-none"
        />

        {/* --- OVERLAY BUILDING ICONS --- */}
        {/* Adjust percentages (top/left) to position each building right where you want it on the path! */}

        {/* 1. Clinic */}
        <div className="absolute top-[12%] left-[15%] z-20">
          <MapIcon 
            label="Clinic" 
            icon="🩺" 
            done={isCompleted('CLINIC')} 
            onClick={() => onSelectStop(5.0)} 
          />
        </div>

        {/* 2. Physical Therapy */}
        <div className="absolute top-[28%] left-[65%] z-20">
          <MapIcon 
            label="PT & Rehab" 
            icon="🏃" 
            done={isCompleted('PT')} 
            onClick={() => onSelectStop(4.0)} 
          />
        </div>

        {/* 3. Behavioral Health */}
        <div className="absolute top-[42%] left-[20%] z-20">
          <MapIcon 
            label="Behavioral" 
            icon="🧠" 
            done={isCompleted('BEHAVIORAL')} 
            onClick={() => onSelectStop(6.0)} 
          />
        </div>

        {/* 4. Lab Tech */}
        <div className="absolute top-[58%] left-[70%] z-20">
          <MapIcon 
            label="Lab" 
            icon="🔬" 
            done={isCompleted('LAB')} 
            onClick={() => onSelectStop(7.0)} 
          />
        </div>

        {/* 5. Emergency Room */}
        <div className="absolute top-[72%] left-[25%] z-20">
          <MapIcon 
            label="ER" 
            icon="🚨" 
            done={isCompleted('EMERGENCY')} 
            onClick={() => onSelectStop(13.0)} 
          />
        </div>

        {/* 6. Maintenance */}
        <div className="absolute top-[85%] left-[60%] z-20">
          <MapIcon 
            label="Maintenance" 
            icon="🛠️" 
            done={isCompleted('MAINTENANCE')} 
            onClick={() => onSelectStop(17.0)} 
          />
        </div>

      </div>

      {/* Career Button */}
      <button
        onClick={onStartQuiz}
        className="w-full min-h-[50px] py-3 mt-2 rounded-2xl text-sm uppercase tracking-wide flex-shrink-0 bg-[#e11d48] active:bg-[#be123c] text-white font-black shadow-lg active:scale-95 transition-all"
      >
        🎓 Find My Hospital Job
      </button>
    </div>
  );
}