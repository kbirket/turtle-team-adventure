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
    <div className="flex-1 bg-[#3b0764] p-4 flex flex-col justify-between overflow-y-auto h-full">
      {/* Explorer strip */}
      <div className="flex justify-between items-center bg-white/10 border border-white/20 p-3 rounded-2xl flex-shrink-0">
        <div className="text-left">
          <h2 className="text-sm font-black text-white">
            Explorer: {childName}
          </h2>
          <p className="text-[11px] text-white/70">
            {completedCount} of {totalCount} stamps collected
          </p>
        </div>
        <span className="text-xs bg-[#fbbf24] text-[#3b0764] font-black px-2.5 py-1.5 rounded-lg font-mono tracking-wider">
          {assignedPin}
        </span>
      </div>

      {/* SVG Map Container with Overlay Icons */}
      <div className="relative w-full aspect-[4/3] my-auto bg-[#260242] rounded-2xl overflow-hidden border-2 border-white/20 shadow-inner flex items-center justify-center">
        {/* Base Hospital Map Graphic */}
        <img 
          src="/icons/hospital-map-base.svg" 
          alt="Hospital Floor Plan Base" 
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Example Overlay Building Icons positioned via absolute coordinates */}
        {/* You can adjust top/left percentages to match your floor plan layout */}
        <div className="absolute top-[20%]" style={{ left: '25%' }}>
          <MapIcon 
            label="Clinic" 
            icon="🩺" 
            done={isCompleted('CLINIC')} 
            onClick={() => onSelectStop(5.0)} 
          />
        </div>

        <div className="absolute top-[50%]" style={{ left: '60%' }}>
          <MapIcon 
            label="Lab" 
            icon="🔬" 
            done={isCompleted('LAB')} 
            onClick={() => onSelectStop(7.0)} 
          />
        </div>

        {/* Add your other MapIcon elements here mapped to your specific stop IDs */}
      </div>

      <button
        onClick={onStartQuiz}
        className="w-full min-h-[56px] py-3 rounded-2xl text-base uppercase tracking-wide flex-shrink-0 bg-[#e11d48] active:bg-[#be123c] text-white font-black shadow-lg active:scale-95 transition-all"
      >
        🎓 Find My Hospital Job
      </button>
    </div>
  );
}