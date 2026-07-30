// src/components/HospitalMap.jsx
import { useState } from 'react';
import { Star, List, Map as MapIcon } from 'lucide-react';

/* ------------------------------------------------------------------
   Set CALIBRATE to true to place the hotspots.

   With it on you'll see every hotspot outlined and labeled, and
   clicking anywhere on the map prints the exact percentages to the
   browser console:

       { left: '42.1%', top: '11.4%' }

   Nudge the numbers in HOTSPOTS below until the boxes sit over the
   buildings, then set CALIBRATE back to false. The values here are my
   estimates from the image — expect to adjust them a little.
------------------------------------------------------------------- */
const CALIBRATE = true;

const MAP_SRC = '/hospital-map.webp';

// Percentages of the image, so everything scales with the screen.
// `id` must match the Tour Stops id in Airtable.
const HOTSPOTS = [
  { id: 4.0,  name: 'PT',               left: 17.0, top: 10.5, width: 18.0, height: 14.0 },
  { id: 5.0,  name: 'Clinic',           left: 41.5, top: 10.5, width: 18.0, height: 14.0 },
  { id: 6.0,  name: 'Behavioral',       left: 64.0, top: 10.5, width: 19.0, height: 14.0 },

  { id: 7.0,  name: 'Lab',              left: 17.0, top: 28.0, width: 18.0, height: 14.0 },
  { id: 8.0,  name: 'Surgery',          left: 41.0, top: 28.0, width: 18.0, height: 14.0 },
  { id: 9.0,  name: 'Radiology',        left: 66.0, top: 28.0, width: 19.0, height: 14.0 },

  { id: 10.0, name: 'Cafe',             left: 29.0, top: 46.0, width: 17.5, height: 14.0 },
  { id: 11.0, name: 'Business',         left: 51.0, top: 46.0, width: 17.5, height: 14.0 },
  { id: 12.0, name: 'Housekeeping',     left: 73.0, top: 46.0, width: 18.0, height: 14.0 },

  { id: 13.0, name: 'Emergency',        left: 35.5, top: 62.5, width: 16.0, height: 13.5 },
  { id: 15.0, name: 'Hospital',         left: 57.0, top: 62.5, width: 15.0, height: 13.5 },
  { id: 18.0, name: 'IT',               left: 75.5, top: 62.5, width: 15.0, height: 13.5 },

  { id: 14.0, name: 'Admin',            left: 35.0, top: 78.0, width: 16.0, height: 12.5 },
  { id: 16.0, name: 'Marketing',        left: 62.0, top: 78.0, width: 17.0, height: 12.5 },

  { id: 17.0, name: 'Maintenance Crew', left: 28.0, top: 91.0, width: 42.0, height: 7.5 }
];

/* App.jsx imports this so the "x of y" counter can never drift out of
   sync with the map again. Add a building here, the total follows. */
export const MAP_STOP_COUNT = HOTSPOTS.length;

/* White inner ring + purple outer ring, so focus stays visible over any
   part of the illustration — grass, path, roof, sky. */
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_#ffffff,0_0_0_7px_#6d28d9]';

export default function HospitalMap({
  childName,
  assignedPin,
  completedCount,
  totalCount,
  isCompleted,          // (name) => boolean
  onSelectStop,         // (id) => void
  onStartQuiz
}) {
  const [listView, setListView] = useState(false);

  const handleCalibrationClick = (e) => {
    if (!CALIBRATE) return;
    const r = e.currentTarget.getBoundingClientRect();
    const left = (((e.clientX - r.left) / r.width) * 100).toFixed(1);
    const top = (((e.clientY - r.top) / r.height) * 100).toFixed(1);
    console.log({ left: `${left}%`, top: `${top}%` });
  };

  return (
    <div className="flex-1 bg-[#dceffb] flex flex-col h-full overflow-y-auto">

      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex justify-between items-start gap-2 flex-shrink-0">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#3b2d7d] leading-tight truncate">
            Hi, {childName}
          </h2>
          <p className="text-xs text-[#4a6b80]">Tap a building to explore</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="bg-white rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-sm">
            <Star size={15} className="text-[#e8a317] fill-[#f5c542]" aria-hidden="true" />
            <span className="text-sm font-bold text-[#3b2d7d]">{completedCount}</span>
            <span className="text-[11px] text-[#5b7c92]">/ {totalCount}</span>
          </span>
          <button
            onClick={() => setListView((v) => !v)}
            aria-label={listView ? 'Show picture map' : 'Show list of stops'}
            className={`bg-white rounded-full p-2 shadow-sm active:scale-95 transition-all ${FOCUS_RING}`}
          >
            {listView
              ? <MapIcon size={17} className="text-[#3b2d7d]" aria-hidden="true" />
              : <List size={17} className="text-[#3b2d7d]" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Badge code */}
      <div className="px-4 pb-2 flex-shrink-0">
        <div className="bg-white rounded-2xl px-3 py-2 flex justify-between items-center shadow-sm">
          <span className="text-[11px] text-[#5b7c92]">Your badge code</span>
          <span className="text-sm font-mono font-bold text-[#3b2d7d] tracking-wider">
            {assignedPin}
          </span>
        </div>
      </div>

      {/* ---------- picture map ---------- */}
      {!listView && (
        <div className="px-3 pb-3">
          <div
            onClick={handleCalibrationClick}
            className="relative w-full rounded-2xl overflow-hidden shadow-lg bg-[#cfe9c8]"
            style={{ aspectRatio: '1024 / 1536' }}
          >
            <img
              src={MAP_SRC}
              alt="Illustrated map of Patterson Health Center showing every department as a building."
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
              draggable="false"
            />

            {HOTSPOTS.map((spot) => {
              const done = isCompleted(spot.name);
              return (
                <button
                  key={spot.id}
                  onClick={() => onSelectStop(spot.id)}
                  aria-label={`${spot.name} — ${done ? 'stamp collected' : 'not visited yet'}`}
                  className={`absolute rounded-xl active:scale-95 active:bg-white/30 transition-all ${FOCUS_RING} ${
                    CALIBRATE ? 'bg-fuchsia-500/40 border-2 border-fuchsia-700' : ''
                  }`}
                  style={{
                    left: `${spot.left}%`,
                    top: `${spot.top}%`,
                    width: `${spot.width}%`,
                    height: `${spot.height}%`
                  }}
                >
                  {CALIBRATE && (
                    <span className="text-[9px] font-bold text-white drop-shadow">
                      {spot.name}
                    </span>
                  )}

                  {done && !CALIBRATE && (
                    <span
                      className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#f5b829] border-2 border-white flex items-center justify-center shadow"
                      aria-hidden="true"
                    >
                      <Star size={12} className="text-white fill-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------- list fallback ----------
          Same destinations, no spatial hunting. Also what everyone sees
          if the map image fails to load on fair wifi. */}
      {listView && (
        <div className="px-4 pb-3 flex flex-col gap-2">
          {HOTSPOTS.map((spot) => {
            const done = isCompleted(spot.name);
            return (
              <button
                key={spot.id}
                onClick={() => onSelectStop(spot.id)}
                aria-label={`${spot.name} — ${done ? 'stamp collected' : 'not visited yet'}`}
                className={`w-full min-h-[52px] bg-white rounded-2xl px-4 py-3 flex justify-between items-center shadow-sm active:scale-95 transition-all ${FOCUS_RING}`}
              >
                <span className="text-sm font-bold text-[#2c3e50]">{spot.name}</span>
                {done ? (
                  <Star size={18} className="text-[#e8a317] fill-[#f5c542]" aria-hidden="true" />
                ) : (
                  <Star size={18} className="text-[#c3d3de]" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Primary action */}
      <div className="px-4 pb-4 mt-auto flex-shrink-0">
        <button
          onClick={onStartQuiz}
          className={`w-full min-h-[54px] bg-[#7c3aed] active:bg-[#6d28d9] text-white font-bold py-3 rounded-2xl text-base shadow-lg active:scale-95 transition-all ${FOCUS_RING}`}
        >
          Find my hospital job
        </button>
      </div>
    </div>
  );
}