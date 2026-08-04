// src/App.jsx
import React, { useState, useEffect } from 'react';
import { HospitalMap } from './components/HospitalMap';
import ScavengerHunt from './components/ScavengerHunt';
import BadgeCard from './components/BadgeCard';

const AIRTABLE_PAT = import.meta.env.VITE_AIRTABLE_PAT;
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = import.meta.env.VITE_AIRTABLE_TABLE_NAME || 'Badge Orders';

const FOCUS = 'focus:outline-none focus:ring-4 focus:ring-amber-300';
const BTN_GHOST = 'bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-black border border-white/20 shadow-sm';

export default function App() {
  const [childName, setChildName] = useState('');
  const [isNameConfirmed, setIsNameConfirmed] = useState(false);
  const [assignedPin, setAssignedPin] = useState('');
  const [appMode, setAppMode] = useState('welcome'); // welcome, tour, careers, gamesHub, scavengerHunt, badge, reset
  const [arcadeGame, setArcadeGame] = useState(null);
  
  // Stamp Tracking State
  const [completedStamps, setCompletedStamps] = useState([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Badge Order State
  const [selectedCareer, setSelectedCareer] = useState(null);
  const [badgeOrdered, setBadgeOrdered] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [isOfflineQueued, setIsOfflineQueued] = useState(false);

  // Generate a random 4-character PIN for the child profile
  const generatePin = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `2026-${result}`;
  };

  const handleStartExplorer = (e) => {
    e?.preventDefault();
    if (!childName.trim()) return;
    setIsNameConfirmed(true);
    if (!assignedPin) {
      setAssignedPin(generatePin());
    }
    setAppMode('tour');
  };

  const toggleStamp = (stopKey) => {
    setCompletedStamps((prev) =>
      prev.includes(stopKey) ? prev.filter((k) => k !== stopKey) : [...prev, stopKey]
    );
  };

  const isCompleted = (stopKey) => completedStamps.includes(stopKey);

  // Reset entire app state for next child
  const handleFullReset = () => {
    setChildName('');
    setIsNameConfirmed(false);
    setAssignedPin('');
    setCompletedStamps([]);
    setSelectedCareer(null);
    setBadgeOrdered(false);
    setOrderCode('');
    setArcadeGame(null);
    setAppMode('welcome');
    setShowResetConfirm(false);
  };

  // Offline Order Queue Flush
  const flushOrderQueue = async () => {
    const queued = localStorage.getItem('tta_pending_orders_v2');
    if (!queued) return;

    try {
      const orders = JSON.parse(queued);
      if (!Array.isArray(orders) || orders.length === 0) return;

      const remaining = [];
      for (const order of orders) {
        try {
          const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${AIRTABLE_PAT}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fields: order }),
          });
          if (!res.ok) remaining.push(order);
        } catch {
          remaining.push(order);
        }
      }

      if (remaining.length > 0) {
        localStorage.setItem('tta_pending_orders_v2', JSON.stringify(remaining));
      } else {
        localStorage.removeItem('tta_pending_orders_v2');
        setIsOfflineQueued(false);
      }
    } catch (e) {
      console.error('Error flushing order queue:', e);
    }
  };

  useEffect(() => {
    flushOrderQueue();
    const interval = setInterval(flushOrderQueue, 45000);
    return () => clearInterval(interval);
  }, []);

  const handleOrderBadge = async () => {
    const code = generatePin();
    setOrderCode(code);

    const orderPayload = {
      'Child Name': childName || 'Explorer',
      'Career Selected': selectedCareer?.title || 'Turtle Team Member',
      'Badge Code': code,
      'Stamps Collected': completedStamps.length,
      'Status': 'Pending',
      'Order Date': new Date().toISOString(),
    };

    try {
      const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_PAT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: orderPayload }),
      });

      if (res.ok) {
        setBadgeOrdered(true);
        setIsOfflineQueued(false);
      } else {
        throw new Error('Airtable API error response');
      }
    } catch (err) {
      console.warn('Airtable failed. Queuing locally:', err);
      const existing = JSON.parse(localStorage.getItem('tta_pending_orders_v2') || '[]');
      existing.push(orderPayload);
      localStorage.setItem('tta_pending_orders_v2', JSON.stringify(existing));
      setBadgeOrdered(true);
      setIsOfflineQueued(true);
    }
  };

  return (
    <div className="w-full h-screen bg-slate-950 flex items-center justify-center p-0 sm:p-4 overflow-hidden select-none font-sans">
      {/* Phone Viewport Container */}
      <div className="w-full h-full max-w-md max-h-[920px] bg-[#3b0764] sm:rounded-[40px] shadow-2xl flex flex-col justify-between overflow-hidden relative border-0 sm:border-8 border-purple-900/50">
        
        {/* TOP STATUS HEADER */}
        <div className="bg-[#5b21b6] px-4 py-2.5 flex justify-between items-center text-white flex-shrink-0 border-b border-white/10 z-30">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">👋</span>
            <span className="text-xs font-black uppercase tracking-wider text-amber-300">
              {appMode === 'welcome' ? 'Welcome' : childName || 'Explorer'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg transition-all"
              aria-label="Settings"
            >
              ⚙️
            </button>
            <span className="text-xs bg-amber-400 text-purple-950 font-black px-2 py-0.5 rounded-md font-mono">
              ⭐ {completedStamps.length}/14
            </span>
          </div>
        </div>

        {/* MAIN DYNAMIC CONTENT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-10">
          
          {/* 1. WELCOME / NAME ENTER SCREEN */}
          {appMode === 'welcome' && (
            <div className="flex-1 bg-gradient-to-b from-purple-900 via-purple-950 to-[#3b0764] p-6 flex flex-col justify-between text-white text-center h-full overflow-y-auto">
              <div className="mt-4">
                <span className="text-5xl block mb-2">🐢</span>
                <h1 className="text-2xl font-black tracking-wide uppercase text-amber-300">
                  Turtle Team Adventure
                </h1>
                <p className="text-xs text-purple-200 mt-1 max-w-xs mx-auto">
                  Explore the hospital, collect stamps, and print your own honorary ID badge!
                </p>
              </div>

              <form onSubmit={handleStartExplorer} className="my-auto bg-white/10 border border-white/20 p-5 rounded-3xl backdrop-blur-md shadow-xl flex flex-col gap-3">
                <label className="text-xs font-black tracking-widest text-amber-300 uppercase block">
                  What is your first name?
                </label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="TYPE YOUR NAME"
                  className="w-full bg-white text-purple-950 font-black text-center text-lg p-3 rounded-2xl shadow-inner uppercase tracking-wider focus:outline-none focus:ring-4 focus:ring-amber-300"
                  maxLength={15}
                  required
                />
                <button
                  type="submit"
                  className="w-full bg-[#e11d48] active:bg-[#be123c] text-white font-black py-3 rounded-2xl uppercase tracking-wider shadow-lg active:scale-95 transition-all mt-1"
                >
                  LET'S GO ➔
                </button>
              </form>

              <div className="text-[10px] text-purple-300/60 pb-2">
                Patterson Health Center • Turtle Team 2026
              </div>
            </div>
          )}

          {/* 2. MAP VIEW */}
          {appMode === 'tour' && (
            <HospitalMap
              childName={childName}
              assignedPin={assignedPin}
              completedCount={completedStamps.length}
              totalCount={14}
              isCompleted={isCompleted}
              onSelectStop={(id) => toggleStamp(id)}
              onStartQuiz={() => setAppMode('careers')}
            />
          )}

          {/* 3. SCAVENGER HUNT VIEW */}
          {appMode === 'scavengerHunt' && (
            <ScavengerHunt onBackToArcade={() => setAppMode('gamesHub')} />
          )}

          {/* 4. GAMES HUB (ARCADE) MENU */}
          {appMode === 'gamesHub' && !arcadeGame && (
            <div className="flex-1 bg-[#3b0764] p-5 flex flex-col justify-between h-full text-white overflow-y-auto">
              <div className="text-center mt-2">
                <span className="text-4xl">🎮</span>
                <h2 className="text-xl font-black tracking-wide">Turtle Arcade</h2>
                <p className="text-xs text-white/75">Pick a game to play!</p>
              </div>

              <div className="flex flex-col gap-3 my-auto">
                {[
                  {
                    key: 'scavenger',
                    icon: '📸',
                    title: 'Photo Scavenger Hunt',
                    blurb: 'Snap fair photos & get featured on Facebook!',
                    accent: 'border-l-[#e11d48]'
                  },
                  {
                    key: 'rprc',
                    icon: '🩺',
                    title: 'Right Place, Right Care',
                    blurb: 'ER or clinic? Test your instincts.',
                    accent: 'border-l-[#fb7185]'
                  },
                  {
                    key: 'handwash',
                    icon: '🧼',
                    title: 'The 20-Second Scrub',
                    blurb: 'Zap the germs and wash your hands right.',
                    accent: 'border-l-[#22d3ee]'
                  },
                  {
                    key: 'memory',
                    icon: '🧩',
                    title: 'Turtle Memory Match',
                    blurb: 'Find all the matching pairs.',
                    accent: 'border-l-[#a78bfa]'
                  }
                ].map((g) => (
                  <button
                    key={g.key}
                    onClick={() => {
                      if (g.key === 'scavenger') {
                        setAppMode('scavengerHunt');
                      } else {
                        setArcadeGame(g.key);
                      }
                    }}
                    className={`w-full bg-white border-l-4 ${g.accent} rounded-2xl p-4 text-left shadow-lg active:scale-95 transition-all ${FOCUS}`}
                  >
                    <span className="text-3xl" aria-hidden="true">{g.icon}</span>
                    <h3 className="font-black text-base text-[#3b0764] mt-1">{g.title}</h3>
                    <p className="text-xs text-slate-700 leading-snug mt-0.5">{g.blurb}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setAppMode('tour')}
                className={`w-full min-h-[52px] py-3 rounded-2xl text-sm uppercase ${BTN_GHOST} ${FOCUS}`}
              >
                Return to Map ➔
              </button>
            </div>
          )}

          {/* 5. CAREER SELECTION SCREEN */}
          {appMode === 'careers' && (
            <div className="flex-1 bg-[#3b0764] p-4 flex flex-col justify-between h-full text-white overflow-y-auto">
              <div className="text-center">
                <h2 className="text-base font-black text-amber-300 uppercase">Choose Your Career</h2>
                <p className="text-xs text-white/80">Select the job you want on your printed badge!</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 my-auto overflow-y-auto pr-1">
                {[
                  'DOCTOR', 'NURSE', 'RADIOLOGY', 'LAB TECH', 
                  'HUMAN RESOURCES', 'BEHAVIORAL HEALTH', 'PHYSICAL THERAPY', 
                  'MAINTENANCE', 'IT SPECIALIST', 'CAFETERIA'
                ].map((job) => (
                  <button
                    key={job}
                    onClick={() => setSelectedCareer({ title: job })}
                    className={`p-3 rounded-2xl border-2 font-black text-xs uppercase text-center transition-all ${
                      selectedCareer?.title === job
                        ? 'bg-rose-600 border-amber-300 text-white shadow-lg scale-105'
                        : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                    }`}
                  >
                    {job}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  if (selectedCareer) {
                    handleOrderBadge();
                    setAppMode('badge');
                  } else {
                    alert('Please select a career title first!');
                  }
                }}
                className="w-full bg-[#e11d48] active:bg-[#be123c] text-white font-black py-3 rounded-2xl uppercase shadow-lg active:scale-95 transition-all"
              >
                ORDER MY BADGE 🎟️
              </button>
            </div>
          )}

          {/* 6. BADGE CONFIRMATION / DISPLAY SCREEN */}
          {appMode === 'badge' && (
            <div className="flex-1 bg-[#3b0764] p-4 flex flex-col justify-between h-full text-white text-center overflow-y-auto">
              <div>
                <span className="text-4xl">🎉</span>
                <h2 className="text-xl font-black text-amber-300 uppercase mt-1">Badge Ordered!</h2>
                <p className="text-xs text-white/80">
                  Nice work, <strong className="text-amber-300">{childName || 'Explorer'}</strong>! Show this code at the booth:
                </p>
              </div>

              {/* Badge Preview */}
              <div className="w-full aspect-[1.58/1] bg-white rounded-2xl shadow-2xl overflow-hidden my-auto border-2 border-amber-300 text-slate-900">
                <BadgeCard
                  name={childName}
                  careerTitle={selectedCareer?.title || 'TURTLE TEAM MEMBER'}
                  badgeCode={orderCode || assignedPin}
                />
              </div>

              {isOfflineQueued && (
                <p className="text-[11px] font-bold text-amber-300 bg-amber-500/20 p-2 rounded-xl border border-amber-400">
                  Saved on this tablet — it will send when wifi returns.
                </p>
              )}

              <button
                onClick={handleFullReset}
                className="w-full bg-[#e11d48] active:bg-[#be123c] text-white font-black py-3 rounded-2xl uppercase tracking-wider shadow-lg active:scale-95 transition-all"
              >
                NEXT EXPLORER 🔄
              </button>
            </div>
          )}

        </div>

        {/* ALWAYS-VISIBLE BOTTOM NAVIGATION BAR */}
        <nav className="bg-[#5b21b6] border-t border-white/20 p-2 flex justify-around items-center flex-shrink-0 z-30">
          {[
            { icon: '🗺️', label: 'Map', onClick: () => setAppMode('tour'), active: appMode === 'tour' },
            { icon: '📸', label: 'Camera', onClick: () => setAppMode('scavengerHunt'), active: appMode === 'scavengerHunt' },
            { icon: '🎓', label: 'Careers', onClick: () => setAppMode('careers'), active: appMode === 'careers' },
            { icon: '🎮', label: 'Arcade', onClick: () => { setAppMode('gamesHub'); setArcadeGame(null); }, active: appMode === 'gamesHub' },
            { icon: '💳', label: 'Badge', onClick: () => setAppMode('badge'), active: appMode === 'badge' },
            { icon: '🔄', label: 'Reset', onClick: () => setShowResetConfirm(true), active: false },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
                item.active ? 'bg-white/20 text-amber-300 font-bold scale-105' : 'text-white/70 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-[9px] font-extrabold uppercase mt-0.5">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* RESET CONFIRMATION MODAL */}
        {showResetConfirm && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6 text-center">
            <div className="bg-[#3b0764] border-2 border-white/20 p-6 rounded-3xl text-white shadow-2xl flex flex-col gap-4 max-w-xs">
              <span className="text-4xl">⚠️</span>
              <h3 className="text-lg font-black uppercase text-amber-300">Start Over?</h3>
              <p className="text-xs text-white/80">
                This will clear the current explorer's progress and return to the main screen.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="py-2.5 bg-white/10 hover:bg-white/20 text-white font-black rounded-xl text-xs uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFullReset}
                  className="py-2.5 bg-rose-600 active:bg-rose-700 text-white font-black rounded-xl text-xs uppercase shadow-lg"
                >
                  Yes, Reset
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}