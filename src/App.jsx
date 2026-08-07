// src/App.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Airtable from 'airtable';
import TurtleBooth from './TurtleBooth';
import BadgeCard from './components/BadgeCard';
import RightPlaceRightCare from './components/RightPlaceRightCare';
import HandwashingGame from './components/HandwashingGame';
import MedicalMythBusters from './components/MedicalMythBusters';
import MedicalWordSearch from './components/MedicalWordSearch';
import MedicalCryptogram from './components/MedicalCryptogram';
import CareOGrams from './components/CareOGrams';
import { HospitalMap } from './components/HospitalMap';
import IconSprite from './components/IconSprite';
import ScavengerHunt from './components/ScavengerHunt';

const base = new Airtable({
  apiKey: import.meta.env.VITE_AIRTABLE_PAT
}).base(import.meta.env.VITE_AIRTABLE_BASE_ID);

const STATION_ID = import.meta.env.VITE_STATION_ID || 'STATION-1';
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '8568';

const TOUR_CACHE_KEY = 'tta_tour_stops_v2';
const CAREER_CACHE_KEY = 'tta_career_info_v2';
const ORDER_QUEUE_KEY = 'tta_pending_orders_v2';

const IDLE_WARNING_MS = 120000; // 2 min of no touches
const IDLE_GRACE_MS = 20000;    // then 20s to say "still here"
const MAP_STOP_COUNT = 14;       // Total stops on map

const FOCUS =
  'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#22d3ee]';
const FOCUS_CARD =
  'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#3b0764]';

const BTN_CORAL =
  'bg-[#e11d48] active:bg-[#be123c] text-white font-black shadow-lg active:scale-95 transition-all';
const BTN_GOLD =
  'bg-[#fbbf24] active:bg-[#f59e0b] text-[#3b0764] font-black shadow-lg active:scale-95 transition-all';
const BTN_GHOST =
  'bg-white/10 active:bg-white/20 border-2 border-white/30 text-white font-bold active:scale-95 transition-all';
const BTN_PLAIN =
  'bg-slate-100 active:bg-slate-200 border-2 border-slate-300 text-[#3b0764] font-bold active:scale-95 transition-all';

const GAME_CARDS = [
  '/characters/doctor/avatar.webp',
  '/characters/nurse/avatar.webp',
  '/characters/lab-tech/avatar.webp',
  '/characters/pt/avatar.webp',
  '/characters/radiology/avatar.webp',
  '/characters/dietary/avatar.webp',
  '/characters/behavioral-health/avatar.webp',
  '/characters/marketing/avatar.webp'
];

const AVAILABLE_CAREERS = [
  'Doctor',
  'Nurse',
  'CNA',
  'Behavioral Health',
  'Marketing',
  'Therapy & Rehab',
  'Radiology',
  'Lab Tech',
  'Dietary',
  'Human Resources',
  'Maintenance'
];

const CATEGORY_CAREERS = {
  clinical:  ['Doctor', 'Nurse', 'Therapy & Rehab', 'Behavioral Health'],
  technical: ['CNA', 'Radiology', 'Lab Tech', 'Maintenance'],
  creative:  ['Marketing', 'Dietary', 'Human Resources']
};

/* ---------- storage + safety helpers ---------- */

const readCache = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeCache = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or private mode */
  }
};

const escapeFormulaValue = (v) =>
  String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const generateBadgeCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const code = Array.from(
    { length: 4 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join('');
  return `2026-${code}`;
};

const logEvent = (eventName, detail = {}) => {
  try {
    base('Events').create(
      [{
        fields: {
          Event: eventName,
          Station: STATION_ID,
          Detail: JSON.stringify(detail).slice(0, 900)
        }
      }],
      () => {}
    );
  } catch {
    /* ignore */
  }
};

const flushOrderQueue = (onDone) => {
  const queue = readCache(ORDER_QUEUE_KEY, []);
  if (!queue.length) {
    onDone?.(0);
    return;
  }
  let remaining = [...queue];
  const sendNext = () => {
    if (!remaining.length) {
      writeCache(ORDER_QUEUE_KEY, []);
      onDone?.(0);
      return;
    }
    base('Badge Orders').create([{ fields: remaining[0].fields }], (err) => {
      if (err) {
        writeCache(ORDER_QUEUE_KEY, remaining);
        onDone?.(remaining.length);
        return;
      }
      remaining = remaining.slice(1);
      writeCache(ORDER_QUEUE_KEY, remaining);
      sendNext();
    });
  };
  sendNext();
};

const MATCHMAKER_QUESTIONS = [
  { q: "If you were given a superpower tool, which one would you pick?", options: [
    { text: "A magical healing bandage", type: "clinical" },
    { text: "Super-vision X-ray glasses", type: "technical" },
    { text: "A magical wooden mixing spoon", type: "creative" }]},
  { q: "Where would you want to spend your morning?", options: [
    { text: "Visiting rooms and talking to people", type: "clinical" },
    { text: "Solving puzzles in a quiet room with neat gadgets", type: "technical" },
    { text: "In a bustling kitchen or decorating a lobby", type: "creative" }]},
  { q: "Choose your favorite school subject:", options: [
    { text: "Science and learning how the body works", type: "clinical" },
    { text: "Math, coding, or playing logic games", type: "technical" },
    { text: "Art, music, or writing fun stories", type: "creative" }]},
  { q: "Pick a job at a spaceship launch pad:", options: [
    { text: "The astronaut doctor checking the crew", type: "clinical" },
    { text: "The flight engineer tracking radar screens", type: "technical" },
    { text: "The commander organizing the launch celebration", type: "creative" }]},
  { q: "If you found a broken robot, what would you do first?", options: [
    { text: "Make sure it isn't hurt and clean it up", type: "clinical" },
    { text: "Take the back panel off to fix its wires", type: "technical" },
    { text: "Paint its shell and throw it a welcome-back party", type: "creative" }]},
  { q: "If you were helping run a zoo, what would your job be?", options: [
    { text: "Giving the animals checkups to keep them strong", type: "clinical" },
    { text: "Building the digital maps and security locks", type: "technical" },
    { text: "Designing the animal play zones and menus", type: "creative" }]},
  { q: "What kind of book do you like reading best?", options: [
    { text: "Stories about heroes saving the day", type: "clinical" },
    { text: "Books about cool inventions or outer space", type: "technical" },
    { text: "Comic books with bright pictures and great art", type: "creative" }]},
  { q: "If you could invent an app, what would it do?", options: [
    { text: "Remind people to drink water and take care of themselves", type: "clinical" },
    { text: "Organize data or translate secret codes instantly", type: "technical" },
    { text: "Create fun musical tracks and custom artwork", type: "creative" }]},
  { q: "Choose your favorite animal trait:", options: [
    { text: "A dog's loyalty and caring heart", type: "clinical" },
    { text: "An owl's clever problem-solving mind", type: "technical" },
    { text: "A peacock's bright, colorful presentation", type: "creative" }]},
  { q: "Last one — pick the words that describe you best:", options: [
    { text: "Kind, steady, and attentive", type: "clinical" },
    { text: "Curious, precise, and analytical", type: "technical" },
    { text: "Expressive, energetic, and full of ideas", type: "creative" }]}
];

export default function App() {
  /* ---------- data ---------- */
  const [tourStops, setTourStops] = useState(() => readCache(TOUR_CACHE_KEY, []));
  const [careerInfo, setCareerInfo] = useState(() => readCache(CAREER_CACHE_KEY, {}));
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(() => readCache(TOUR_CACHE_KEY, []).length === 0);
  const [loadError, setLoadError] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingCount, setPendingCount] = useState(
    () => readCache(ORDER_QUEUE_KEY, []).length
  );

  /* ---------- explorer identity ---------- */
  const [childName, setChildName] = useState('');
  const [assignedPin, setAssignedPin] = useState('');
  const [isNameConfirmed, setIsNameConfirmed] = useState(false);

  /* ---------- tour progress ---------- */
  const [completedStops, setCompletedStops] = useState([]);
  const [quizActive, setQuizActive] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [shuffledStopOptions, setShuffledStopOptions] = useState([]);

  /* ---------- navigation ---------- */
  const [appMode, setAppMode] = useState('tour');
  const [lookupValue, setLookupValue] = useState('');
  const [foundBadge, setFoundBadge] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [toast, setToast] = useState(null);

  /* ---------- career quiz ---------- */
  const [careerScores, setCareerScores] = useState({ clinical: 0, technical: 0, creative: 0 });
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);
  const [careerResults, setCareerResults] = useState([]);
  const [finalCareer, setFinalCareer] = useState('');
  const [shuffledCareerOptions, setShuffledCareerOptions] = useState([]);

  /* ---------- photo + consent ---------- */
  const [submittingBadge, setSubmittingBadge] = useState(false);
  const [showPhotoBooth, setShowPhotoBooth] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [rawPhoto, setRawPhoto] = useState(null);
  const [photoPermission, setPhotoPermission] = useState(null);

  /* ---------- arcade ---------- */
  const [arcadeCategory, setArcadeCategory] = useState('kids');
  const [memoryDeck, setMemoryDeck] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [gameWon, setGameWon] = useState(false);
  const [arcadeGame, setArcadeGame] = useState(null);

  /* ---------- admin & moderation queue ---------- */
  const [adminTab, setAdminTab] = useState('queue');
  const [adminName, setAdminName] = useState('');
  const [adminCareer, setAdminCareer] = useState(AVAILABLE_CAREERS[0]);
  const [printQueue, setPrintQueue] = useState([]);
  const [adminPreviewBadge, setAdminPreviewBadge] = useState(null);
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminInputPin, setAdminInputPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [reprintValue, setReprintValue] = useState('');
  const [photoGallery, setPhotoGallery] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  /* ---------- modals ---------- */
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(20);

  const idleTimer = useRef(null);
  const graceTimer = useRef(null);

  const showToast = useCallback((message, tone = 'info') => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ---------- network status + queue drain ---------- */
  useEffect(() => {
    const goOnline = () => {
      setIsOffline(false);
      flushOrderQueue((left) => setPendingCount(left));
    };
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    const retry = setInterval(() => {
      if (navigator.onLine) flushOrderQueue((left) => setPendingCount(left));
    }, 45000);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(retry);
    };
  }, []);

  /* ---------- initial load ---------- */
  useEffect(() => {
    base('Tour Stops')
      .select({ view: 'Grid view', sort: [{ field: 'id', direction: 'asc' }] })
      .firstPage((err, records) => {
        if (err) {
          console.error('Error fetching Tour Stops:', err);
          setLoadError(readCache(TOUR_CACHE_KEY, []).length === 0);
          setLoading(false);
          return;
        }

        const formattedStops = records.map((record) => ({
          id: record.fields.id || 0,
          type: record.fields.type || 'tour',
          title: record.fields.title || 'Untitled Screen',
          background: record.fields.background || '',
          bgPosition: record.fields.bgPosition || 'center',
          bgSize: record.fields.bgSize || '150%',
          character: record.fields.character || '',
          characterName: record.fields.characterName || '',
          dialogue: record.fields.dialogue || '',
          buttonText: record.fields.buttonText || 'Continue ➔',
          nextStepIndex: record.fields.nextStepIndex || null,
          question: record.fields.question || null,
          correctAnswer: record.fields.correctAnswer || null,
          wrongAnswer: record.fields.wrongAnswer || null
        }));

        formattedStops.forEach((stop) => {
          if (stop.background) new Image().src = stop.background;
          if (stop.character) new Image().src = stop.character;
        });

        GAME_CARDS.forEach((src) => {
          const img = new Image();
          img.src = src;
        });
        
        setTourStops(formattedStops);
        writeCache(TOUR_CACHE_KEY, formattedStops);
        setLoadError(false);
        setLoading(false);
      });

    base('Career Info')
      .select({ view: 'Grid view' })
      .firstPage((err, records) => {
        if (err || !records) return;
        const map = {};
        records.forEach((r) => {
          const key = (r.fields.Career || '').trim();
          if (!key) return;
          map[key] = {
            headline: r.fields.Headline || '',
            description: r.fields.Description || '',
            training: r.fields.Training || '',
            local: r.fields.Local || ''
          };
        });
        setCareerInfo(map);
        writeCache(CAREER_CACHE_KEY, map);
      });
  }, []);

  const currentStep = tourStops[currentStepIndex];
  const totalRoundsCount = MAP_STOP_COUNT;

  /* ---------- idle reset ---------- */
  const clearIdleTimers = () => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (graceTimer.current) clearInterval(graceTimer.current);
  };

  const forceGlobalReset = useCallback((silent = false) => {
    clearIdleTimers();
    setIdleWarning(false);
    setCompletedStops([]);
    setChildName('');
    setAssignedPin('');
    setIsNameConfirmed(false);
    setCurrentQuizQuestion(0);
    setCareerScores({ clinical: 0, technical: 0, creative: 0 });
    setCurrentStepIndex(0);
    setCapturedPhoto(null);
    setRawPhoto(null);
    setPhotoPermission(null);
    setFinalCareer('');
    setCareerResults([]);
    setQuizActive(false);
    setQuizFeedback(null);
    setFoundBadge(null);
    setLookupValue('');
    setShowResetConfirm(false);
    setArcadeGame(null);
    setArcadeCategory('kids');
    
    localStorage.removeItem('tta_scavenger_consent');
    localStorage.removeItem('tta_scavenger_completed');

    setAppMode('tour');
    if (!silent) showToast('Ready for the next explorer!', 'success');
  }, [showToast]);

  const startIdleWatch = useCallback(() => {
    clearIdleTimers();
    if (!isNameConfirmed || appMode === 'adminPortal') return;
    idleTimer.current = setTimeout(() => {
      setIdleWarning(true);
      setIdleCountdown(IDLE_GRACE_MS / 1000);
      graceTimer.current = setInterval(() => {
        setIdleCountdown((c) => {
          if (c <= 1) {
            clearInterval(graceTimer.current);
            forceGlobalReset(true);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }, IDLE_WARNING_MS);
  }, [isNameConfirmed, appMode, forceGlobalReset]);

  useEffect(() => {
    startIdleWatch();
    return clearIdleTimers;
  }, [startIdleWatch]);

  const handleActivity = () => {
    if (idleWarning) return;
    startIdleWatch();
  };

  /* ---------- artwork + titles ---------- */
  const getDynamicArtwork = (careerTrack) => {
    const track = (careerTrack || finalCareer || '').toLowerCase();
    if (track.includes('doctor')) return '/characters/doctor/avatar.webp';
    if (track.includes('nurse')) return '/characters/nurse/avatar.webp';
    if (track.includes('radiology')) return '/characters/radiology/avatar.webp';
    if (track.includes('lab')) return '/characters/lab-tech/avatar.webp';
    if (track.includes('therapy') || track.includes('rehab')) return '/characters/pt/avatar.webp';
    if (track.includes('dietary')) return '/characters/dietary/avatar.webp';
    if (track.includes('behavioral')) return '/characters/behavioral-health/avatar.webp';
    if (track.includes('maintenance')) return '/characters/maintenance/avatar.webp';
    if (track.includes('human resources')) return '/characters/hr/avatar.webp';
    if (track.includes('cna') || track.includes('tech')) return '/characters/lab-tech/avatar.webp';
    return '/characters/marketing/avatar.webp';
  };

  const formatBadgeTitle = (rawCareer) =>
    rawCareer ? rawCareer.toUpperCase() : 'EXPLORER';

  /* ---------- admin & airtable photo moderation ---------- */
  const fetchPrintQueue = useCallback(() => {
    base('Badge Orders')
      .select({
        maxRecords: 25,
        filterByFormula: `OR({Print Status} = '', {Print Status} = 'Needs Printing', {Print Status} = 'Pending')`
      })
      .firstPage((err, records) => {
        if (err) {
          console.error('Error fetching print queue:', err);
        } else {
          setPrintQueue(
            records.map((r) => ({
              id: r.id,
              name: r.fields['Child Name'] || 'EXPLORER',
              career: r.fields['Career Selected'] || r.fields['Assigned Career'] || 'Doctor',
              pin: r.fields['Badge Code'] || '2026-XXXX',
              photo: r.fields['Photo Data'] || null
            }))
          );
        }
      });
  }, []);

  const fetchPendingPhotos = useCallback(() => {
    setLoadingPhotos(true);
    base('Badge Orders')
      .select({
        maxRecords: 30,
        filterByFormula: "AND(NOT({Photo Data} = ''), OR({Photo Status} = 'Pending Approval', {Photo Status} = ''))"
      })
      .firstPage((err, records) => {
        setLoadingPhotos(false);
        if (err) {
          console.error('Error fetching photos:', err);
          return;
        }
        setPhotoGallery(
          records.map((r) => ({
            id: r.id,
            name: r.fields['Child Name'] || 'EXPLORER',
            career: r.fields['Career Selected'] || 'Explorer',
            photo: r.fields['Photo Data'],
            code: r.fields['Badge Code'],
            status: r.fields['Photo Status'] || 'Pending'
          }))
        );
      });
  }, []);

  const handlePhotoModeration = (recordId, newStatus) => {
    if (!recordId) return;

    base('Badge Orders').update(
      [{ id: recordId, fields: { 'Photo Status': newStatus } }],
      (err) => {
        if (err) {
          showToast('Could not update photo status.', 'warn');
          return;
        }
        showToast(newStatus === 'Approved' ? 'Photo approved! ✅' : 'Photo rejected. ❌', 'info');
        setPhotoGallery((prev) => prev.filter((item) => item.id !== recordId));
      }
    );
  };

  useEffect(() => {
    if (appMode === 'adminPortal' && adminTab === 'photos') {
      fetchPendingPhotos();
    }
  }, [appMode, adminTab, fetchPendingPhotos]);

  const markPrinted = (recordId) => {
    if (!recordId) return;
    base('Badge Orders').update(
      [{ id: recordId, fields: { 'Print Status': 'Printed' } }],
      (err) => {
        if (err) {
          showToast('Printed, but could not update the queue.', 'warn');
          return;
        }
        fetchPrintQueue();
      }
    );
  };

  const handleAdminToggle = () => {
    if (appMode === 'adminPortal') {
      setAppMode('tour');
    } else {
      setShowAdminPinModal(true);
      setAdminInputPin('');
      setPinError('');
    }
  };

  const verifyAdminPin = (e) => {
    e.preventDefault();
    if (adminInputPin === ADMIN_PIN) {
      setShowAdminPinModal(false);
      setAppMode('adminPortal');
      setAdminTab('queue');
    } else {
      setPinError('Incorrect PIN. Try again.');
    }
  };

  const clearPhotoState = () => {
    setCapturedPhoto(null);
    setRawPhoto(null);
    setPhotoPermission(null);
  };

  const handleAdminBadgeCreate = (e) => {
    e.preventDefault();
    if (!adminName.trim()) {
      showToast('Enter a name for the badge first.', 'warn');
      return;
    }

    const generatedPin = generateBadgeCode();
    const newBadgeObj = {
      id: null,
      name: adminName.toUpperCase().trim(),
      career: adminCareer,
      pin: generatedPin,
      photo: photoPermission === true ? capturedPhoto : null
    };

    setAdminPreviewBadge(newBadgeObj);

    base('Badge Orders').create(
      [{
        fields: {
          'Child Name': newBadgeObj.name,
          'Career Selected': newBadgeObj.career,
          'Badge Code': generatedPin,
          'Stamps Collected': completedStops.length,
          'Order Date': new Date().toISOString().split('T')[0],
          'Print Status': 'Needs Printing'
        }
      }],
      (err) => {
        if (!err) {
          fetchPrintQueue();
          logEvent('admin_badge_created', { career: newBadgeObj.career });
        }
      }
    );
  };

  const handleReprintLookup = () => {
    const q = escapeFormulaValue(reprintValue.toUpperCase().trim());
    if (!q) return;
    base('Badge Orders')
      .select({ filterByFormula: `UPPER({Badge Code}) = '${q}'`, maxRecords: 1 })
      .firstPage((err, records) => {
        if (err || !records || !records.length) {
          showToast('No badge found with that code.', 'warn');
          return;
        }
        const f = records[0].fields;
        setAdminPreviewBadge({
          id: records[0].id,
          name: f['Child Name'] || 'EXPLORER',
          career: f['Career Selected'] || f['Assigned Career'] || 'Doctor',
          pin: f['Badge Code'] || '2026-XXXX',
          photo: f['Photo Data'] || null
        });
        setAdminTab('manual');
        setReprintValue('');
      });
  };

  const triggerPrintBadge = (recordId) => {
    window.print();
    if (recordId) markPrinted(recordId);
  };

  /* ---------- memory game ---------- */
  const startNewMemoryGame = () => {
    const fullDeck = [...GAME_CARDS, ...GAME_CARDS]
      .sort(() => Math.random() - 0.5)
      .map((icon, id) => ({ id, icon }));
    setMemoryDeck(fullDeck);
    setFlippedIndices([]);
    setMatchedPairs([]);
    setGameWon(false);
  };

  useEffect(() => {
    if (appMode === 'adminPortal') fetchPrintQueue();
  }, [appMode, fetchPrintQueue]);

  const handleCardClick = (index) => {
    if (
      flippedIndices.length === 2 ||
      flippedIndices.includes(index) ||
      matchedPairs.includes(index)
    ) return;

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      const [firstIdx, secondIdx] = newFlipped;
      if (memoryDeck[firstIdx].icon === memoryDeck[secondIdx].icon) {
        const newMatches = [...matchedPairs, firstIdx, secondIdx];
        setMatchedPairs(newMatches);
        setFlippedIndices([]);
        if (newMatches.length === memoryDeck.length) {
          setGameWon(true);
          logEvent('memory_game_won');
        }
      } else {
        setTimeout(() => setFlippedIndices([]), 900);
      }
    }
  };

  /* ---------- explorer flow ---------- */
  const handleNameActivation = () => {
    if (!childName.trim()) {
      showToast('Type your first name to get started!', 'warn');
      return;
    }
    setAssignedPin(generateBadgeCode());
    setIsNameConfirmed(true);
    logEvent('session_start');
  };

  useEffect(() => {
    if (appMode === 'careerQuiz' && MATCHMAKER_QUESTIONS[currentQuizQuestion]) {
      const optionsCopy = [...MATCHMAKER_QUESTIONS[currentQuizQuestion].options];
      for (let i = optionsCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsCopy[i], optionsCopy[j]] = [optionsCopy[j], optionsCopy[i]];
      }
      setShuffledCareerOptions(optionsCopy);
    }
  }, [currentQuizQuestion, appMode]);

  const handleNextAction = () => {
    if (!currentStep) return;
    if (currentStep.question && !completedStops.includes(currentStep.title) && !quizActive) {
      const items = [
        { text: currentStep.correctAnswer, correct: true },
        { text: currentStep.wrongAnswer, correct: false }
      ];
      if (Math.random() > 0.5) items.reverse();
      setShuffledStopOptions(items);
      setQuizActive(true);
      return;
    }
    const nextIndex = tourStops.findIndex((stop) => stop.id === currentStep.nextStepIndex);
    if (nextIndex !== -1) {
      setCurrentStepIndex(nextIndex);
    } else {
      const mapIdx = tourStops.findIndex((s) => s.type === 'map');
      if (mapIdx !== -1) setCurrentStepIndex(mapIdx);
    }
    setQuizActive(false);
    setQuizFeedback(null);
  };

  const handleAnswerSubmit = (isCorrect) => {
    if (isCorrect) {
      setQuizFeedback('correct');
      if (!completedStops.includes(currentStep.title)) {
        const updated = [...completedStops, currentStep.title];
        setCompletedStops(updated);
        logEvent('stop_completed', { stop: currentStep.title, total: updated.length });
      }
    } else {
      setQuizFeedback('wrong');
    }
  };

  const handleCareerAnswer = (type) => {
    const updatedScores = { ...careerScores, [type]: careerScores[type] + 1 };
    setCareerScores(updatedScores);

    if (currentQuizQuestion + 1 < MATCHMAKER_QUESTIONS.length) {
      setCurrentQuizQuestion(currentQuizQuestion + 1);
      return;
    }

    const sorted = Object.keys(updatedScores).sort(
      (a, b) => updatedScores[b] - updatedScores[a]
    );
    const [first, second, third] = sorted;

    const spread = updatedScores[first] - updatedScores[second];
    const baseIndex = spread >= 4 ? 0 : spread >= 2 ? 1 : 2;

    const pick1 = baseIndex % CATEGORY_CAREERS[first].length;
    const pick2 = (baseIndex + 1) % CATEGORY_CAREERS[second].length;
    const pick3 = (baseIndex + 2) % CATEGORY_CAREERS[third].length;

    const top3Options = [
      CATEGORY_CAREERS[first][pick1],
      CATEGORY_CAREERS[second][pick2],
      CATEGORY_CAREERS[third][pick3]
    ];

    setCareerResults(top3Options);
    setAppMode('careerResultsView');
    logEvent('quiz_completed', { top: top3Options[0], scores: updatedScores });
  };

  const selectCareerOption = (selectedCareer) => {
    setFinalCareer(selectedCareer);
    logEvent('career_selected', { career: selectedCareer });
    setAppMode(careerInfo[selectedCareer] ? 'careerInfo' : 'avatarBuilder');
  };

  const startCareerQuizDirect = () => {
    setCurrentQuizQuestion(0);
    setCareerScores({ clinical: 0, technical: 0, creative: 0 });
    setAppMode('careerQuiz');
    logEvent('quiz_started');
  };

  /* ---------- BADGE SUBMISSION WITH CLOUDINARY UPLOAD ---------- */
  const submitBadgeOrder = async () => {
    if (!childName.trim()) {
      showToast('Confirm your name first!', 'warn');
      return;
    }
    if (capturedPhoto && photoPermission === null) {
      showToast('Please tap Yes or No for photo permission.', 'warn');
      return;
    }

    setSubmittingBadge(true);

    let uploadedPhotoUrl = null;

    if (capturedPhoto && photoPermission === true) {
      try {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dbvm7hy4d';
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_PRESET || 'ScavengerHunt';

        if (cloudName && uploadPreset) {
          const formData = new FormData();
          formData.append('file', rawPhoto || capturedPhoto);
          formData.append('upload_preset', uploadPreset);
          formData.append('tags', 'fb_approved,scavenger_hunt,kiosk_selfie');

          const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData
          });

          const cloudData = await res.json();
          if (cloudData.secure_url) {
            uploadedPhotoUrl = cloudData.secure_url;
            console.log('✅ Photo uploaded to Cloudinary:', uploadedPhotoUrl);
          }
        }
      } catch (err) {
        console.error('❌ Cloudinary upload error:', err);
      }
    }

    const fields = {
      'Child Name': String(childName).toUpperCase().trim(),
      'Career Selected': String(finalCareer || 'Doctor'),
      'Stamps Collected': Number(completedStops?.length || 0),
      'Order Date': new Date().toISOString().split('T')[0],
      'Badge Code': String(assignedPin || generateBadgeCode()),
      'Print Status': 'Needs Printing',
      'Photo Status': photoPermission === true ? 'Pending Approval' : 'No Consent'
    };

    if (photoPermission === true) {
      fields['Photo Data'] = uploadedPhotoUrl || capturedPhoto;
    }

    const queueIt = () => {
      const queue = readCache(ORDER_QUEUE_KEY, []);
      queue.push({ fields, queuedAt: Date.now() });
      writeCache(ORDER_QUEUE_KEY, queue);
      setPendingCount(queue.length);
    };

    if (!navigator.onLine) {
      queueIt();
      setSubmittingBadge(false);
      setAppMode('badgeSuccess');
      return;
    }

    base('Badge Orders').create([{ fields }], (err, records) => {
      setSubmittingBadge(false);
      if (err) {
        console.error('❌ AIRTABLE API ERROR:', err);
        queueIt();
      } else {
        console.log('✅ BADGE CREATED SUCCESSFULLY:', records[0].id);
        logEvent('badge_ordered', { career: finalCareer, photoUploaded: !!uploadedPhotoUrl });
      }
      setAppMode('badgeSuccess');
    });
  };

  const handleLookupBadge = () => {
    const raw = lookupValue.toUpperCase().trim();
    if (!raw) return;
    setSearchError('');

    if (!/^2026-[A-Z0-9]{4}$/.test(raw)) {
      setSearchError('Enter your badge code exactly as printed (like 2026-K4TX).');
      return;
    }

    base('Badge Orders')
      .select({
        filterByFormula: `UPPER({Badge Code}) = '${escapeFormulaValue(raw)}'`,
        maxRecords: 1
      })
      .firstPage((err, records) => {
        if (err || !records || records.length === 0) {
          setSearchError('No badge found with that code. Check each character.');
          return;
        }
        const data = records[0].fields;
        setFoundBadge({
          name: data['Child Name'],
          career: data['Career Selected'] || data['Assigned Career'],
          pin: data['Badge Code'] || '2026-XXXX'
        });
      });
  };

  const isTargetCompleted = (keyword) =>
    completedStops.some((t) => t.toUpperCase().includes(keyword.toUpperCase()));

  /* ---------- loading / error gates ---------- */
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#3b0764] p-4 select-none">
        <div className="text-center font-black text-white text-lg animate-pulse">
          🐢 Waking up the hospital turtles...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-[#3b0764] p-6 select-none">
        <div className="text-center max-w-xs text-white">
          <div className="text-6xl mb-3">🐢</div>
          <h1 className="font-black text-white text-xl">The turtles are offline</h1>
          <p className="text-sm text-white/80 mt-2 leading-relaxed">
            We couldn't reach the tour. Check the wifi and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className={`mt-5 min-h-[52px] py-3 px-8 rounded-2xl uppercase text-sm tracking-wider ${BTN_CORAL} ${FOCUS}`}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Date Check for Fair Booth Pickup (Up to Aug 15, 2026) ---------- */
  const isFairTime = new Date() <= new Date('2026-08-15T23:59:59');

  /* ---------- what the printer renders ---------- */
  const isAdmin = appMode === 'adminPortal';
  const activePrintName = isAdmin
    ? (adminPreviewBadge?.name || adminName || 'EXPLORER')
    : (childName || 'EXPLORER');
  const activePrintCareer = isAdmin
    ? (adminPreviewBadge?.career || adminCareer || 'Doctor')
    : (finalCareer || 'Doctor');
  const activePrintPin = isAdmin
    ? (adminPreviewBadge?.pin || '2026-XXXX')
    : (assignedPin || '2026-XXXX');
  const activePrintPhoto = isAdmin
    ? (adminPreviewBadge?.photo || capturedPhoto)
    : capturedPhoto;
  const printingBacks = isAdmin && adminTab === 'backs';

  return (
    <div
      className="flex justify-center items-center min-h-[100dvh] bg-[#1e0538] p-0 sm:p-4 select-none touch-manipulation"
      onPointerDown={handleActivity}
      onKeyDown={handleActivity}
    >
      <IconSprite />

      <style>{`
        @keyframes ttaFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tta-fade-in { animation: ttaFadeIn 0.3s ease-out; }

        @keyframes ttaPop {
          0%   { opacity: 0; transform: scale(0.94); }
          60%  { transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1); }
        }
        .tta-pop { animation: ttaPop 0.28s ease-out; }

        @keyframes ttaWiggle {
          0%, 100% { transform: rotate(-4deg); }
          50%      { transform: rotate(4deg); }
        }
        .tta-wiggle { animation: ttaWiggle 1.4s ease-in-out infinite; }

        @media print {
          @page { size: 3.375in 2.125in landscape; margin: 0 !important; }
          html, body {
            background: white !important;
            margin: 0 !important; padding: 0 !important;
            width: 3.375in !important; height: 2.125in !important;
            overflow: hidden !important;
          }
          .app-main-layout { display: none !important; }
          .smart21-print-area {
            display: block !important;
            position: absolute !important;
            top: 0 !important; left: 0 !important;
            width: 3.375in !important; height: 2.125in !important;
            margin: 0 !important; padding: 0 !important;
            border: none !important; box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        @media screen { .smart21-print-area { display: none !important; } }
      `}</style>

      {/* PRINTER-ONLY CONTAINER */}
      <div
        className="smart21-print-area select-none bg-contain bg-no-repeat bg-center"
        style={{
          backgroundImage: `url(${printingBacks ? '/card-back.png' : '/badge-template.png'})`
        }}
      >
        {!printingBacks && (
          <BadgeCard
            variant="print"
            name={activePrintName}
            careerTitle={formatBadgeTitle(activePrintCareer)}
            avatarSrc={activePrintPhoto || getDynamicArtwork(activePrintCareer)}
            badgeCode={activePrintPin}
          />
        )}
      </div>

      {/* MAIN APP FRAME */}
      <div className="app-main-layout w-full max-w-sm h-[100dvh] sm:h-[820px] max-h-[850px] bg-white sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border-0 sm:border-8 border-[#5b21b6] relative">

        {/* HEADER */}
        <div className="bg-[#5b21b6] text-white px-4 py-3 font-black tracking-wide shadow-md flex justify-between items-center gap-2 flex-shrink-0 z-20">
          <span className="truncate text-sm sm:text-base flex items-center gap-1.5">
            {!isNameConfirmed
              ? '👋 Welcome'
              : appMode === 'tour'
                ? (currentStep?.title || 'Hospital Tour')
                : appMode === 'scavengerHunt'
                  ? '📸 Scavenger Hunt'
                  : appMode === 'gamesHub'
                    ? '🎮 Game Arcade'
                    : appMode === 'viewBadge'
                      ? '🪪 Badge Lookup'
                      : appMode === 'adminPortal'
                        ? '🔒 Staff Portal'
                        : '🎓 Career Explorer'}
          </span>
          <div className="flex items-center gap-1.5">
            {isOffline && (
              <span className="text-[10px] bg-[#fbbf24] text-[#3b0764] px-2 py-0.5 rounded-full font-black">
                Offline
              </span>
            )}
            <button
              onClick={handleAdminToggle}
              aria-label="Staff admin portal"
              className={`text-xs bg-white/15 active:bg-white/25 px-2 py-1 rounded-lg font-mono active:scale-95 transition-all ${FOCUS}`}
            >
              ⚙️
            </button>
            {isNameConfirmed && (
              <span className="flex-shrink-0 text-[11px] bg-white/20 text-white px-2 py-0.5 rounded-full whitespace-nowrap font-black">
                ⭐ {completedStops.length}/{totalRoundsCount}
              </span>
            )}
          </div>
        </div>

        {/* TOAST */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`absolute top-16 left-3 right-3 z-40 rounded-2xl px-3 py-2.5 text-xs font-black shadow-2xl tta-pop ${
              toast.tone === 'warn'
                ? 'bg-[#fbbf24] text-[#3b0764]'
                : toast.tone === 'success'
                  ? 'bg-[#4ade80] text-[#14532d]'
                  : 'bg-white text-[#3b0764]'
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="flex-1 overflow-hidden relative flex flex-col mb-[60px]">

          {/* IDLE WARNING */}
          {idleWarning && (
            <div className="absolute inset-0 bg-[#3b0764]/95 backdrop-blur-md z-50 flex items-center justify-center p-6 text-center text-white">
              <div>
                <div className="text-6xl mb-2 tta-wiggle">🐢</div>
                <h3 className="text-xl font-black">Still exploring?</h3>
                <p className="text-sm text-white/85 mt-1 mb-5">
                  Starting over in {idleCountdown} seconds.
                </p>
                <button
                  onClick={() => { setIdleWarning(false); startIdleWatch(); }}
                  className={`min-h-[52px] py-3 px-8 rounded-2xl uppercase text-sm tracking-wider ${BTN_CORAL} ${FOCUS}`}
                >
                  I'm still here!
                </button>
              </div>
            </div>
          )}

          {/* RESET CONFIRM */}
          {showResetConfirm && (
            <div className="absolute inset-0 bg-[#3b0764]/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[1.75rem] p-6 w-full max-w-[280px] text-center shadow-2xl tta-pop">
                <div className="text-4xl mb-1">🔄</div>
                <h3 className="text-lg font-black text-[#3b0764] uppercase">Start Over?</h3>
                <p className="text-xs text-slate-700 mt-1 mb-4">
                  This clears your name, stamps, and badge.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className={`text-xs py-3 rounded-xl uppercase ${BTN_PLAIN} ${FOCUS_CARD}`}
                  >
                    Keep Going
                  </button>
                  <button
                    onClick={() => forceGlobalReset()}
                    className={`text-xs py-3 rounded-xl uppercase ${BTN_CORAL} ${FOCUS_CARD}`}
                  >
                    Start Over
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ADMIN PIN */}
          {showAdminPinModal && (
            <div className="absolute inset-0 bg-[#3b0764]/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[1.75rem] p-6 w-full max-w-[280px] text-center shadow-2xl">
                <div className="text-4xl mb-1">🔐</div>
                <h3 className="text-lg font-black text-[#3b0764] uppercase tracking-wide">
                  Staff Access
                </h3>
                <p className="text-xs text-slate-700 mt-1 mb-4">
                  Enter the 4-digit staff PIN.
                </p>
                <form onSubmit={verifyAdminPin} className="flex flex-col gap-3">
                  <label htmlFor="admin-pin" className="sr-only">Staff PIN</label>
                  <input
                    id="admin-pin"
                    type="password"
                    inputMode="numeric"
                    maxLength="4"
                    placeholder="••••"
                    value={adminInputPin}
                    onChange={(e) => setAdminInputPin(e.target.value)}
                    className="w-full bg-slate-100 border-2 border-slate-300 rounded-xl p-3 text-center text-2xl font-black tracking-widest text-slate-900 focus:outline-none focus:border-[#5b21b6]"
                    autoFocus
                  />
                  {pinError && (
                    <p role="alert" className="bg-[#fbbf24] text-[#3b0764] rounded-lg py-1.5 text-xs font-black">
                      {pinError}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setShowAdminPinModal(false)}
                      className={`text-xs py-3 rounded-xl uppercase ${BTN_PLAIN} ${FOCUS_CARD}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`text-xs py-3 rounded-xl uppercase ${BTN_CORAL} ${FOCUS_CARD}`}
                    >
                      Unlock
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* NAME GATE / SPLASH SCREEN */}
          {!isNameConfirmed && appMode !== 'adminPortal' ? (
            <div 
              className="flex-1 bg-no-repeat bg-cover bg-center p-6 flex flex-col justify-end items-center h-full relative overflow-hidden select-none"
              style={{ backgroundImage: `url('/splash-image.webp')` }}
            >
              <div className="w-full max-w-[290px] mb-3 z-10 flex flex-col gap-3 bg-[#4a2810] p-4 rounded-3xl border-4 border-[#8b5a2b] shadow-[0_10px_25px_rgba(0,0,0,0.8)] text-center ring-2 ring-[#f59e0b]">
                <label 
                  htmlFor="child-name" 
                  className="text-xs font-black uppercase tracking-widest text-[#fef3c7] drop-shadow-sm"
                >
                  What is your first name?
                </label>
                
                <input
                  id="child-name"
                  type="text"
                  placeholder="TYPE YOUR NAME"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value.toUpperCase())}
                  maxLength={14}
                  className="w-full bg-[#fef3c7] border-2 border-[#8b5a2b] rounded-2xl p-3 font-black text-[#4a2810] text-center text-lg focus:border-[#f59e0b] focus:outline-none tracking-widest uppercase placeholder:text-[#b45309]/50 shadow-inner"
                  autoComplete="off"
                />

                <button
                  onClick={handleNameActivation}
                  className="w-full min-h-[50px] py-3 rounded-2xl text-base font-black uppercase tracking-widest bg-[#e11d48] active:bg-[#be123c] text-white shadow-lg active:scale-95 transition-all border-2 border-white/30"
                >
                  LET'S GO ➔
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ADMIN PORTAL */}
              {appMode === 'adminPortal' && (
                <div className="flex-1 bg-slate-100 p-4 flex flex-col gap-3 overflow-y-auto h-full text-slate-800">
                  <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-300">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h2 className="text-sm font-black text-[#5b21b6] uppercase tracking-wider">
                          Badge Station
                        </h2>
                        <p className="text-[11px] text-slate-600">
                          {STATION_ID} · Smart-21 single-sided
                        </p>
                      </div>
                      {pendingCount > 0 && (
                        <span className="text-[10px] bg-[#fbbf24] text-[#3b0764] font-black px-2 py-1 rounded-lg">
                          {pendingCount} unsent
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-300">
                      {[
                        { key: 'queue', label: 'Queue' },
                        { key: 'manual', label: 'Manual' },
                        { key: 'backs', label: 'Backs' },
                        { key: 'photos', label: 'Photos 📸' }
                      ].map((t) => (
                        <button
                          key={t.key}
                          onClick={() => setAdminTab(t.key)}
                          className={`py-2 text-[11px] font-black rounded-lg transition-all ${FOCUS_CARD} ${
                            adminTab === t.key
                              ? 'bg-[#5b21b6] text-white shadow'
                              : 'text-slate-700'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* QUEUE TAB */}
                  {adminTab === 'queue' && (
                    <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-300 flex flex-col gap-2">
                      <h3 className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                        Waiting to print ({printQueue.length})
                      </h3>
                      {printQueue.length === 0 && (
                        <p className="text-xs text-slate-600 py-4 text-center">
                          Nothing in the queue.
                        </p>
                      )}
                      <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto">
                        {printQueue.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => { setAdminPreviewBadge(item); setAdminTab('manual'); }}
                            className={`flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-300 text-left ${FOCUS_CARD}`}
                          >
                            <span className="text-xs font-bold text-slate-800 truncate flex-1">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-slate-600 truncate max-w-[100px]">
                              {item.career}
                            </span>
                            <span className="text-[10px] font-mono font-black bg-slate-200 text-[#3b0764] px-1.5 py-0.5 rounded ml-2">
                              {item.pin}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="border-t border-slate-200 pt-2 mt-1">
                        <label htmlFor="reprint" className="text-[11px] font-black uppercase text-slate-600 tracking-wider block mb-1">
                          Reprint by code
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="reprint"
                            type="text"
                            placeholder="2026-K4TX"
                            value={reprintValue}
                            onChange={(e) => setReprintValue(e.target.value.toUpperCase())}
                            className="flex-1 bg-slate-50 border border-slate-400 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-[#5b21b6] placeholder:text-slate-500"
                          />
                          <button
                            onClick={handleReprintLookup}
                            className={`bg-[#5b21b6] active:bg-[#4c1d95] text-white font-black text-xs px-4 rounded-xl uppercase active:scale-95 transition-all ${FOCUS_CARD}`}
                          >
                            Find
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MANUAL TAB */}
                  {adminTab === 'manual' && (
                    <>
                      <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-300">
                        <form onSubmit={handleAdminBadgeCreate} className="flex flex-col gap-2.5">
                          <div>
                            <label htmlFor="admin-name" className="text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                              Recipient name
                            </label>
                            <input
                              id="admin-name"
                              type="text"
                              placeholder="e.g. KRISTEN"
                              value={adminName}
                              onChange={(e) => setAdminName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-400 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#5b21b6] uppercase placeholder:text-slate-500"
                            />
                          </div>
                          <div>
                            <label htmlFor="admin-career" className="text-[11px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                              Career role
                            </label>
                            <select
                              id="admin-career"
                              value={adminCareer}
                              onChange={(e) => setAdminCareer(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-400 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#5b21b6]"
                            >
                              {AVAILABLE_CAREERS.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => { clearPhotoState(); setAdminPreviewBadge(null); }}
                              className={`text-xs py-2.5 rounded-xl uppercase ${BTN_PLAIN} ${FOCUS_CARD}`}
                            >
                              Clear
                            </button>
                            <button
                              type="submit"
                              className={`bg-[#5b21b6] active:bg-[#4c1d95] text-white font-black text-xs py-2.5 rounded-xl uppercase tracking-wider shadow active:scale-95 transition-all ${FOCUS_CARD}`}
                            >
                              Generate
                            </button>
                          </div>
                        </form>
                      </div>

                      {adminPreviewBadge && (
                        <div className="flex flex-col gap-2">
                          <div
                            className="w-full max-w-[340px] aspect-[1000/630] mx-auto overflow-hidden relative select-none bg-contain bg-no-repeat bg-center rounded-2xl border border-slate-300 shadow-xl"
                            style={{ backgroundImage: `url(/badge-template.png)` }}
                          >
                            <BadgeCard
                              name={adminPreviewBadge.name}
                              careerTitle={formatBadgeTitle(adminPreviewBadge.career)}
                              avatarSrc={
                                adminPreviewBadge.photo ||
                                capturedPhoto ||
                                getDynamicArtwork(adminPreviewBadge.career)
                              }
                              badgeCode={adminPreviewBadge.pin}
                            />
                          </div>
                          <button
                            onClick={() => triggerPrintBadge(adminPreviewBadge.id)}
                            className={`w-full max-w-[340px] mx-auto text-xs py-3 rounded-xl uppercase tracking-wider ${BTN_CORAL} ${FOCUS_CARD}`}
                          >
                            🖨️ Print Badge Front
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* BACKS TAB */}
                  {adminTab === 'backs' && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-300 text-center">
                      <p className="text-xs text-slate-700 font-medium">
                        Print card backs onto blank stock ahead of time.
                      </p>
                      <div
                        className="w-full max-w-[300px] aspect-[1000/630] mx-auto my-3 bg-contain bg-no-repeat bg-center rounded-xl border border-slate-300"
                        style={{ backgroundImage: `url(/card-back.png)` }}
                      />
                      <button
                        onClick={() => triggerPrintBadge(null)}
                        className={`w-full text-xs py-3 rounded-xl uppercase tracking-wider ${BTN_CORAL} ${FOCUS_CARD}`}
                      >
                        🖨️ Print Card Back
                      </button>
                    </div>
                  )}

                  {/* PHOTOS MODERATION TAB IN ADMIN */}
                  {adminTab === 'photos' && (
                    <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-300 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                            Photo Approval Queue ({photoGallery.length})
                          </h3>
                          <p className="text-[10px] text-slate-500">
                            Review & approve selfies in Airtable
                          </p>
                        </div>
                        <button
                          onClick={fetchPendingPhotos}
                          className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg border border-slate-300 active:scale-95"
                        >
                          🔄 Refresh
                        </button>
                      </div>

                      {loadingPhotos ? (
                        <div className="text-center py-8 text-xs font-bold text-slate-500 animate-pulse">
                          Loading pending photos...
                        </div>
                      ) : photoGallery.length === 0 ? (
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
                          <p className="text-xs text-slate-500 font-medium">
                            🎉 All caught up! No photos waiting for approval.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto p-1">
                          {photoGallery.map((item) => (
                            <div
                              key={item.id}
                              className="bg-slate-50 border border-slate-300 p-2 rounded-xl flex flex-col items-center gap-2 shadow-sm"
                            >
                              <img
                                src={item.photo}
                                alt={item.name}
                                className="w-full aspect-square object-cover rounded-lg bg-slate-200 border border-slate-200"
                              />
                              <div className="text-center w-full overflow-hidden">
                                <span className="text-xs font-black text-slate-800 truncate block">
                                  {item.name}
                                </span>
                                <span className="text-[10px] font-mono text-[#5b21b6] font-bold block">
                                  {item.code}
                                </span>
                              </div>

                              {/* APPROVAL BUTTONS */}
                              <div className="grid grid-cols-2 gap-1 w-full pt-1">
                                <button
                                  onClick={() => handlePhotoModeration(item.id, 'Rejected')}
                                  className="py-1.5 bg-rose-500 active:bg-rose-600 text-white font-black text-[10px] uppercase rounded-lg shadow-sm transition-all"
                                >
                                  ❌ Reject
                                </button>
                                <button
                                  onClick={() => handlePhotoModeration(item.id, 'Approved')}
                                  className="py-1.5 bg-emerald-500 active:bg-emerald-600 text-white font-black text-[10px] uppercase rounded-lg shadow-sm transition-all"
                                >
                                  ✅ Approve
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TOUR */}
              {appMode === 'tour' && currentStep?.type === 'tour' && (
                <div
                  className="flex-1 bg-no-repeat relative flex flex-col justify-end p-4 h-full bg-[#3b0764]"
                  style={{
                    backgroundImage: `url(${currentStep.background})`,
                    backgroundPosition: currentStep.bgPosition,
                    backgroundSize: currentStep.bgSize
                  }}
                >
                  {!quizActive && currentStep.character && (
                    <div className="absolute inset-0 flex justify-center items-end pointer-events-none pb-24 overflow-hidden">
                      <img
                        src={currentStep.character}
                        alt=""
                        className="h-[80%] max-h-[520px] object-contain origin-bottom transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="bg-white rounded-[1.5rem] p-4 shadow-2xl z-10 text-center mb-2 min-h-[150px] flex flex-col justify-center">
                    {!quizActive ? (
                      <>
                        <h3 className="font-black text-lg text-[#5b21b6] mb-1">
                          {currentStep.characterName}{' '}
                          {isTargetCompleted(currentStep.title) && '⭐'}
                        </h3>
                        <p className="text-slate-800 text-sm leading-relaxed">
                          <strong>{childName}</strong>,{' '}
                          {currentStep.dialogue
                            ? currentStep.dialogue.charAt(0).toLowerCase() +
                              currentStep.dialogue.slice(1)
                            : ''}
                        </p>
                      </>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <h3 className="font-black text-[#5b21b6] text-base">
                          ✨ Stamp Challenge
                        </h3>
                        <p className="text-sm font-bold text-slate-900 mb-1">
                          {currentStep.question}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {shuffledStopOptions.map((opt, i) => {
                            let style =
                              'bg-slate-50 border-2 border-slate-300 text-[#3b0764] active:bg-slate-200';
                            let mark = '';
                            if (quizFeedback !== null) {
                              style = opt.correct
                                ? 'bg-[#4ade80] border-2 border-[#16a34a] text-[#14532d] pointer-events-none'
                                : 'bg-[#fbbf24] border-2 border-[#d97706] text-[#78350f] pointer-events-none';
                              mark = opt.correct ? '✓ ' : '✗ ';
                            }
                            return (
                              <button
                                key={i}
                                onClick={() => handleAnswerSubmit(opt.correct)}
                                className={`p-3 font-bold text-xs rounded-xl transition-all min-h-[52px] active:scale-95 ${FOCUS_CARD} ${style}`}
                              >
                                {mark}{opt.text}
                              </button>
                            );
                          })}
                        </div>
                        <div aria-live="polite" className="sr-only">
                          {quizFeedback === 'correct'
                            ? 'Correct! Stamp collected.'
                            : quizFeedback === 'wrong'
                              ? 'Not quite — try again.'
                              : ''}
                        </div>
                        {quizFeedback === 'wrong' && (
                          <div className="text-center mt-1">
                            <button
                              onClick={() => setQuizFeedback(null)}
                              className={`text-xs bg-[#5b21b6] active:bg-[#4c1d95] text-white font-black px-4 py-2 rounded-lg active:scale-95 transition-all ${FOCUS_CARD}`}
                            >
                              Try Again 🔄
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {(!quizActive || quizFeedback === 'correct') && (
                    <button
                      onClick={handleNextAction}
                      className={`w-full min-h-[56px] py-3 rounded-2xl z-10 uppercase tracking-wide text-base ${
                        quizFeedback === 'correct' ? BTN_GOLD : BTN_CORAL
                      } ${FOCUS}`}
                    >
                      {quizFeedback === 'correct'
                        ? '⭐ Collect Stamp'
                        : currentStep.buttonText}
                    </button>
                  )}
                </div>
              )}

              {/* HOSPITAL MAP COMPONENT */}
              {appMode === 'tour' && currentStep?.type === 'map' && (
                <HospitalMap
                  childName={childName}
                  assignedPin={assignedPin}
                  completedCount={completedStops.length}
                  totalCount={totalRoundsCount}
                  isCompleted={isTargetCompleted}
                  onSelectStop={(id) => {
                    const i = tourStops.findIndex((t) => t.id === id);
                    if (i !== -1) setCurrentStepIndex(i);
                  }}
                  onStartQuiz={startCareerQuizDirect}
                />
              )}

              {/* SCAVENGER HUNT (CAMERA TAB) */}
              {appMode === 'scavengerHunt' && (
                <ScavengerHunt 
                  onBackToArcade={() => {
                    setAppMode('tour');
                    const idx = tourStops.findIndex((s) => s.type === 'map');
                    if (idx !== -1) setCurrentStepIndex(idx);
                  }} 
                />
              )}

              {/* CAREER QUIZ */}
              {appMode === 'careerQuiz' && (
                <div className="flex-1 bg-[#3b0764] p-5 flex flex-col justify-between h-full overflow-y-auto">
                  <div className="text-center flex-shrink-0">
                    <span className="text-[11px] uppercase text-white/70 font-bold tracking-widest">
                      Career Explorer
                    </span>
                  </div>
                  <div className="text-center my-auto">
                    <h2 className="text-lg sm:text-xl font-black text-white px-2 leading-snug tta-pop">
                      {MATCHMAKER_QUESTIONS[currentQuizQuestion].q}
                    </h2>
                  </div>
                  <div className="flex flex-col gap-3 my-auto">
                    {shuffledCareerOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCareerAnswer(opt.type)}
                        className={`w-full min-h-[60px] p-4 bg-white active:bg-slate-100 font-bold text-sm text-[#3b0764] rounded-2xl shadow-lg text-left transition-all active:scale-95 ${FOCUS}`}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                  <div className="text-center text-sm text-white/70 font-bold pb-1 flex-shrink-0">
                    Question {currentQuizQuestion + 1} of {MATCHMAKER_QUESTIONS.length}
                  </div>
                </div>
              )}

              {/* CAREER RESULTS */}
              {appMode === 'careerResultsView' && (
                <div className="flex-1 bg-[#3b0764] p-4 flex flex-col justify-between overflow-y-auto h-full">
                  <div className="text-center my-2">
                    <span className="text-xs font-black uppercase text-[#3b0764] bg-[#fbbf24] px-3 py-1 rounded-full tracking-wider">
                      🎉 Quiz Complete
                    </span>
                    <h2 className="text-lg font-black text-white mt-2">
                      Your Top Matches
                    </h2>
                    <p className="text-xs text-white/75 mt-0.5">
                      Pick one to learn more and print your badge.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 my-auto">
                    {careerResults.map((career, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-2xl p-3.5 shadow-lg flex items-center justify-between gap-3 tta-pop"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img
                            src={getDynamicArtwork(career)}
                            alt=""
                            className="w-14 h-14 object-contain bg-slate-100 rounded-xl p-1 flex-shrink-0"
                          />
                          <div className="overflow-hidden text-left">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                              {idx === 0 ? '🥇 Top Match' : idx === 1 ? '🥈 Runner-Up' : '🥉 Also Great'}
                            </span>
                            <h3 className="font-black text-sm text-[#3b0764] truncate">
                              {career}
                            </h3>
                          </div>
                        </div>
                        <button
                          onClick={() => selectCareerOption(career)}
                          className={`flex-shrink-0 text-xs py-2.5 px-4 rounded-xl uppercase tracking-wider ${BTN_CORAL} ${FOCUS_CARD}`}
                        >
                          Pick ➔
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={startCareerQuizDirect}
                    className={`w-full min-h-[48px] py-3 rounded-2xl text-xs uppercase mt-2 ${BTN_GHOST} ${FOCUS}`}
                  >
                    Retake Quiz 🔄
                  </button>
                </div>
              )}

              {/* CAREER INFO */}
              {appMode === 'careerInfo' && (
                <div className="flex-1 bg-[#3b0764] p-4 sm:p-5 flex flex-col justify-between overflow-y-auto h-full">
                  <div className="text-center flex-shrink-0">
                    <img
                      src={getDynamicArtwork(finalCareer)}
                      alt=""
                      className="w-20 h-20 sm:w-24 sm:h-24 object-contain mx-auto"
                    />
                    <h2 className="text-lg sm:text-xl font-black text-white mt-1">{finalCareer}</h2>
                    <p className="text-[11px] sm:text-xs font-bold text-[#fbbf24] uppercase tracking-wide mt-0.5">
                      {careerInfo[finalCareer]?.headline || 'A real job at Patterson Health Center'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2.5 my-3 overflow-y-auto">
                    {careerInfo[finalCareer]?.description && (
                      <div className="bg-white rounded-2xl p-3 border-l-4 border-[#22d3ee] shadow-lg">
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                          What they do
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                          {careerInfo[finalCareer].description}
                        </p>
                      </div>
                    )}
                    {careerInfo[finalCareer]?.training && (
                      <div className="bg-white rounded-2xl p-3 border-l-4 border-[#a78bfa] shadow-lg">
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                          How you get there
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                          {careerInfo[finalCareer].training}
                        </p>
                      </div>
                    )}
                    {careerInfo[finalCareer]?.local && (
                      <div className="bg-white rounded-2xl p-3 border-l-4 border-[#fbbf24] shadow-lg">
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-0.5">
                          Right here in Harper County
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                          {careerInfo[finalCareer].local}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* NAVIGATION BUTTONS */}
                  <div className="flex flex-col gap-2 flex-shrink-0 mt-1">
                    <button
                      onClick={() => setAppMode('avatarBuilder')}
                      className={`w-full min-h-[50px] py-3 rounded-2xl uppercase text-xs sm:text-sm tracking-wide ${BTN_CORAL} ${FOCUS}`}
                    >
                      Build My Badge as {finalCareer} ➔
                    </button>

                    <button
                      onClick={() => setAppMode(careerResults.length > 0 ? 'careerResultsView' : 'careerQuiz')}
                      className={`w-full py-2.5 rounded-xl uppercase text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all ${FOCUS}`}
                    >
                      ◀ View Other Matches
                    </button>
                  </div>
                </div>
              )}

              {/* BADGE BUILDER */}
              {appMode === 'avatarBuilder' && (
                <div className="flex-1 bg-[#3b0764] p-4 flex flex-col justify-between overflow-y-auto h-full">
                  <div className="text-center mb-1 flex-shrink-0">
                    <span className="text-[11px] uppercase font-bold text-white/70 tracking-widest">
                      Final Step
                    </span>
                    <h2 className="text-base font-black text-white mt-0.5">
                      Your Official ID Badge
                    </h2>
                  </div>

                  <button
                    onClick={() => setShowPhotoBooth(true)}
                    className={`w-full max-w-[340px] mx-auto text-sm py-3 rounded-2xl uppercase tracking-wide mb-2 ${BTN_GHOST} ${FOCUS}`}
                  >
                    📸 Take a Turtle Selfie
                  </button>

                  <div
                    className="w-full max-w-[340px] aspect-[1000/630] mx-auto my-auto overflow-hidden relative flex-shrink-0 select-none bg-contain bg-no-repeat bg-center rounded-2xl shadow-2xl"
                    style={{ backgroundImage: `url(/badge-template.png)` }}
                  >
                    <BadgeCard
                      name={childName}
                      careerTitle={formatBadgeTitle(finalCareer)}
                      avatarSrc={capturedPhoto || getDynamicArtwork(finalCareer)}
                      badgeCode={assignedPin}
                    />
                  </div>

                  {capturedPhoto && (
                    <div className="w-full max-w-[340px] mx-auto bg-white p-3.5 rounded-2xl shadow-xl my-2 text-center">
                      <p className="text-xs font-black text-[#3b0764] mb-2 leading-snug">
                        Parent or guardian: may Patterson Health Center use this photo
                        on social media or event flyers?
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPhotoPermission(true)}
                          aria-pressed={photoPermission === true}
                          className={`py-3 px-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${FOCUS_CARD} ${
                            photoPermission === true
                              ? 'bg-[#4ade80] text-[#14532d] shadow-md ring-2 ring-[#16a34a]'
                              : 'bg-slate-100 text-slate-800 border-2 border-slate-300'
                          }`}
                        >
                          {photoPermission === true ? '✓ Yes' : 'Yes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoPermission(false)}
                          aria-pressed={photoPermission === false}
                          className={`py-3 px-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${FOCUS_CARD} ${
                            photoPermission === false
                              ? 'bg-[#e11d48] text-white shadow-md ring-2 ring-[#9f1239]'
                              : 'bg-slate-100 text-slate-800 border-2 border-slate-300'
                          }`}
                        >
                          {photoPermission === false ? '✗ No' : 'No'}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-700 mt-2 leading-snug">
                        Either way the photo prints on the badge. "No" means we never
                        save or share it.
                      </p>
                      {photoPermission === null && (
                        <span className="text-[11px] font-black text-[#3b0764] bg-[#fbbf24] rounded-lg block mt-2 py-1.5">
                          ⚠️ Tap Yes or No to continue
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={submitBadgeOrder}
                    disabled={submittingBadge}
                    className={`w-full min-h-[56px] py-3 rounded-2xl text-sm uppercase tracking-wide disabled:opacity-60 flex-shrink-0 ${BTN_CORAL} ${FOCUS}`}
                  >
                    {submittingBadge ? 'Sending to the booth...' : '🪪 Send My Badge to Print ➔'}
                  </button>
                </div>
              )}

              {/* SUCCESS / BADGE ORDERED SCREEN */}
              {appMode === 'badgeSuccess' && (
                <div className="flex-1 bg-[#3b0764] p-6 flex flex-col justify-center items-center text-center h-full text-white">
                  <div className="w-24 h-24 bg-[#fbbf24] rounded-full text-[#3b0764] flex items-center justify-center text-5xl shadow-2xl animate-bounce mb-5">
                    🎉
                  </div>
                  <h2 className="text-3xl font-black">Badge Ordered!</h2>
                  <p className="text-sm mt-3 px-2 leading-relaxed text-white/85">
                    Nice work, <strong>{childName}</strong>! {isFairTime ? 'Show this code at the Patterson Health Center booth to pick up your printed badge:' : 'Printed badges are not currently available.'}
                  </p>
                  {isFairTime && (
                    <div className="mt-4 bg-white rounded-2xl px-6 py-4 shadow-2xl">
                      <span className="text-3xl font-mono font-black text-[#3b0764] tracking-widest">
                        {assignedPin}
                      </span>
                    </div>
                  )}
                  {pendingCount > 0 && (
                    <p className="text-[11px] text-[#fbbf24] mt-3 font-black">
                      Saved on this tablet — it will send when wifi returns.
                    </p>
                  )}
                  <button
                    onClick={() => forceGlobalReset()}
                    className={`mt-8 min-h-[52px] text-sm py-3 px-8 rounded-2xl uppercase tracking-wide ${BTN_CORAL} ${FOCUS}`}
                  >
                    Next Explorer 🔄
                  </button>
                </div>
              )}

              {/* ARCADE MENU */}
              {appMode === 'gamesHub' && !arcadeGame && (
                <div className="flex-1 bg-[#3b0764] p-4 flex flex-col justify-between h-full text-white overflow-y-auto">
                  <div className="text-center mt-1">
                    <span className="text-3xl">🎮</span>
                    <h2 className="text-lg font-black tracking-wide">Patterson Arcade</h2>
                    <p className="text-xs text-white/75">Pick a game mode</p>

                    <div className="grid grid-cols-2 gap-1 bg-white/10 p-1 rounded-xl mt-2.5 border border-white/20">
                      <button
                        onClick={() => setArcadeCategory('kids')}
                        className={`py-1.5 text-xs font-black rounded-lg transition-all ${
                          arcadeCategory === 'kids' ? 'bg-[#fbbf24] text-[#3b0764]' : 'text-white/70'
                        }`}
                      >
                        🐢 Kids Zone
                      </button>
                      <button
                        onClick={() => setArcadeCategory('adults')}
                        className={`py-1.5 text-xs font-black rounded-lg transition-all ${
                          arcadeCategory === 'adults' ? 'bg-[#22d3ee] text-[#3b0764]' : 'text-white/70'
                        }`}
                      >
                        🩺 Adult & Teen
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 my-auto py-1">
                    {arcadeCategory === 'kids' ? (
                      [
                        { key: 'scavenger', icon: '📸', title: 'Photo Scavenger Hunt', blurb: 'Snap fair photos & get featured!', accent: 'border-l-[#e11d48]' },
                        { key: 'rprc', icon: '🩺', title: 'Right Place, Right Care', blurb: 'ER or clinic? Test your instincts.', accent: 'border-l-[#fb7185]' },
                        { key: 'handwash', icon: '🧼', title: 'The 20-Second Scrub', blurb: 'Zap germs and wash your hands right.', accent: 'border-l-[#22d3ee]' },
                        { key: 'memory', icon: '🧩', title: 'Turtle Memory Match', blurb: 'Find all the matching card pairs.', accent: 'border-l-[#a78bfa]' }
                      ].map((g) => (
                        <button
                          key={g.key}
                          onClick={() => {
                            if (g.key === 'scavenger') setAppMode('scavengerHunt');
                            else { setArcadeGame(g.key); if (g.key === 'memory') startNewMemoryGame(); }
                          }}
                          className={`w-full bg-white border-l-4 ${g.accent} rounded-2xl p-2.5 text-left shadow-lg active:scale-95 transition-all ${FOCUS}`}
                        >
                          <span className="text-xl" aria-hidden="true">{g.icon}</span>
                          <h3 className="font-black text-xs text-[#3b0764] mt-0.5">{g.title}</h3>
                          <p className="text-[10px] text-slate-700 leading-snug">{g.blurb}</p>
                        </button>
                      ))
                    ) : (
                      [
                        { key: 'careograms', icon: '🔤', title: 'Care-O-Grams', blurb: 'Unscramble services & learn local health options!', accent: 'border-l-[#e11d48]' },
                        { key: 'wordsearch', icon: '🔍', title: 'Medical Word Search', blurb: 'Find health, career, and anatomy terms!', accent: 'border-l-[#fbbf24]' },
                        { key: 'mythbusters', icon: '🩺', title: 'Medical MythBusters', blurb: 'Test your health facts vs. popular myths!', accent: 'border-l-[#22d3ee]' },
                        { key: 'cryptogram', icon: '🔐', title: 'Medical Cryptograms', blurb: 'Decode famous historic medical quotes!', accent: 'border-l-[#a78bfa]' },
                        { key: 'rprc', icon: '🏥', title: 'Right Place, Right Care', blurb: 'Learn which clinic option fits your symptoms best.', accent: 'border-l-[#fb7185]' }
                      ].map((g) => (
                        <button
                          key={g.key}
                          onClick={() => setArcadeGame(g.key)}
                          className={`w-full bg-white border-l-4 ${g.accent} rounded-2xl p-2.5 text-left shadow-lg active:scale-95 transition-all ${FOCUS}`}
                        >
                          <span className="text-xl" aria-hidden="true">{g.icon}</span>
                          <h3 className="font-black text-xs text-[#3b0764] mt-0.5">{g.title}</h3>
                          <p className="text-[10px] text-slate-700 leading-snug">{g.blurb}</p>
                        </button>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => setAppMode('tour')}
                    className={`w-full min-h-[44px] py-2 rounded-2xl text-xs uppercase ${BTN_GHOST} ${FOCUS}`}
                  >
                    Return to Map ➔
                  </button>
                </div>
              )}

              {/* CARE-O-GRAMS GAME */}
              {appMode === 'gamesHub' && arcadeGame === 'careograms' && (
                <CareOGrams
                  onExit={() => setArcadeGame(null)}
                  onLogEvent={logEvent}
                />
              )}

              {/* MEDICAL WORD SEARCH GAME */}
              {appMode === 'gamesHub' && arcadeGame === 'wordsearch' && (
                <MedicalWordSearch
                  onExit={() => setArcadeGame(null)}
                  onLogEvent={logEvent}
                />
              )}

              {/* MYTHBUSTERS GAME */}
              {appMode === 'gamesHub' && arcadeGame === 'mythbusters' && (
                <MedicalMythBusters
                  onExit={() => setArcadeGame(null)}
                  onLogEvent={logEvent}
                />
              )}

              {/* CRYPTOGRAM GAME */}
              {appMode === 'gamesHub' && arcadeGame === 'cryptogram' && (
                <MedicalCryptogram
                  onExit={() => setArcadeGame(null)}
                  onLogEvent={logEvent}
                />
              )}

              {/* RIGHT PLACE RIGHT CARE GAME */}
              {appMode === 'gamesHub' && arcadeGame === 'rprc' && (
                <RightPlaceRightCare
                  onExit={() => setArcadeGame(null)}
                  onLogEvent={logEvent}
                />
              )}

              {/* HANDWASHING GAME */}
              {appMode === 'gamesHub' && arcadeGame === 'handwash' && (
                <HandwashingGame
                  onExit={() => setArcadeGame(null)}
                  onLogEvent={logEvent}
                />
              )}

              {/* MEMORY MATCH GAME */}
              {appMode === 'gamesHub' && arcadeGame === 'memory' && (
                <div className="flex-1 bg-[#3b0764] p-4 flex flex-col justify-between h-full text-white overflow-y-auto">
                  <div className="text-center mt-1">
                    <span className="text-4xl">🧩</span>
                    <h2 className="text-lg font-black tracking-wide">Turtle Memory Match</h2>
                    <p className="text-xs text-white/75">Tap cards to find matching pairs</p>
                  </div>

                  {!gameWon ? (
                    <div className="grid grid-cols-4 gap-2 my-auto max-w-[280px] mx-auto w-full">
                      {memoryDeck.map((card, idx) => {
                        const isFlipped =
                          flippedIndices.includes(idx) || matchedPairs.includes(idx);
                        return (
                          <button
                            key={idx}
                            onClick={() => handleCardClick(idx)}
                            aria-label={isFlipped ? 'Revealed card' : 'Hidden card'}
                            className={`aspect-square rounded-2xl font-black text-2xl flex items-center justify-center shadow-lg transition-all active:scale-95 overflow-hidden border-2 ${FOCUS} ${
                              isFlipped
                                ? 'bg-white border-amber-400'
                                : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-amber-400'
                            }`}
                          >
                            {isFlipped ? (
                              <img src={card.icon} alt="" className="w-full h-full object-contain p-1" />
                            ) : '❓'}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="my-auto bg-white rounded-[1.75rem] p-6 text-center shadow-2xl tta-pop">
                      <div className="text-5xl mb-2">🏆</div>
                      <h3 className="text-xl font-black text-[#3b0764]">Matching Master!</h3>
                      <p className="text-xs text-slate-700 mt-1">You found every pair.</p>
                      <button
                        onClick={startNewMemoryGame}
                        className={`mt-4 text-sm py-3 px-6 rounded-xl uppercase tracking-wider ${BTN_CORAL} ${FOCUS_CARD}`}
                      >
                        Play Again 🔄
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setArcadeGame(null)}
                    className={`w-full min-h-[52px] py-3 rounded-2xl text-sm uppercase ${BTN_GHOST} ${FOCUS}`}
                  >
                    Back to Arcade ➔
                  </button>
                </div>
              )}

              {/* BADGE LOOKUP */}
              {appMode === 'viewBadge' && (
                <div className="flex-1 bg-[#3b0764] p-4 flex flex-col justify-between overflow-y-auto h-full">
                  <div className="text-center mb-1">
                    <span className="text-3xl">🪪</span>
                    <h2 className="text-base font-black text-white mt-0.5">
                      Look Up My Badge
                    </h2>
                    <p className="text-xs text-white/75">Enter the code from your card</p>
                  </div>

                  {!foundBadge ? (
                    <div className="bg-white rounded-2xl p-4 shadow-2xl my-auto flex flex-col gap-3">
                      <label htmlFor="badge-code" className="sr-only">Badge code</label>
                      <input
                        id="badge-code"
                        type="text"
                        placeholder="2026-K4TX"
                        value={lookupValue}
                        onChange={(e) => setLookupValue(e.target.value.toUpperCase())}
                        className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-3.5 font-black text-[#3b0764] text-center text-base focus:border-[#5b21b6] focus:outline-none tracking-wide placeholder:text-slate-500"
                      />
                      {searchError && (
                        <p role="alert" className="bg-[#fbbf24] text-[#3b0764] rounded-lg py-2 text-xs font-black text-center">
                          {searchError}
                        </p>
                      )}
                      <button
                        onClick={handleLookupBadge}
                        className={`w-full min-h-[52px] py-3 rounded-xl text-sm uppercase tracking-wider ${BTN_CORAL} ${FOCUS_CARD}`}
                      >
                        Find My Badge ➔
                      </button>
                    </div>
                  ) : (
                    <div className="my-auto flex flex-col gap-3">
                      <div
                        className="w-full max-w-[340px] aspect-[1000/630] mx-auto overflow-hidden relative select-none bg-contain bg-no-repeat bg-center rounded-2xl shadow-2xl"
                        style={{ backgroundImage: `url(/badge-template.png)` }}
                      >
                        <BadgeCard
                          name={foundBadge.name}
                          careerTitle={formatBadgeTitle(foundBadge.career)}
                          avatarSrc={getDynamicArtwork(foundBadge.career)}
                          badgeCode={foundBadge.pin}
                        />
                      </div>
                      <button
                        onClick={() => { setFoundBadge(null); setLookupValue(''); }}
                        className={`mx-auto text-xs font-bold text-white underline active:opacity-75 ${FOCUS}`}
                      >
                        Search Another Code
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setAppMode('tour')}
                    className={`w-full min-h-[48px] py-3 rounded-2xl text-xs uppercase mt-1 ${BTN_GHOST} ${FOCUS}`}
                  >
                    Return to Map
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* BOTTOM NAV BAR */}
        <nav
          aria-label="Main"
          className="absolute bottom-0 left-0 right-0 h-[60px] bg-[#5b21b6] border-t border-white/20 grid grid-cols-6 items-center px-1 z-30 shadow-[0_-4px_14px_rgba(0,0,0,0.25)]"
        >
          {[
            {
              icon: '🗺️', label: 'Map', aria: 'Go to hospital map',
              onClick: () => {
                setAppMode('tour');
                const idx = tourStops.findIndex((s) => s.type === 'map');
                if (idx !== -1) setCurrentStepIndex(idx);
              },
              active: appMode === 'tour' && currentStep?.type === 'map'
            },
            {
              icon: '📸', label: 'Camera', aria: 'Open Scavenger Hunt',
              onClick: () => setAppMode('scavengerHunt'),
              active: appMode === 'scavengerHunt'
            },
            {
              icon: '🎓', label: 'Careers', aria: 'Take the career quiz',
              onClick: startCareerQuizDirect,
              active: ['careerQuiz', 'careerResultsView', 'careerInfo', 'avatarBuilder', 'badgeSuccess'].includes(appMode)
            },
            {
              icon: '🎮', label: 'Arcade', aria: 'Play games',
              onClick: () => { setAppMode('gamesHub'); setArcadeGame(null); },
              active: appMode === 'gamesHub'
            },
            {
              icon: '🪪', label: 'Badge', aria: 'Look up my badge',
              onClick: () => {
                setAppMode('viewBadge');
                setFoundBadge(null);
                setLookupValue('');
                setSearchError('');
              },
              active: appMode === 'viewBadge'
            }
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              aria-label={item.aria}
              className={`flex flex-col items-center justify-center gap-0.5 h-full transition-all active:scale-90 rounded-xl ${FOCUS} ${
                item.active ? 'bg-white/20 text-white font-black' : 'text-white/70'
              }`}
            >
              <span className="text-lg" aria-hidden="true">{item.icon}</span>
              <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
            </button>
          ))}

          <button
            onClick={() => setShowResetConfirm(true)}
            aria-label="Start over"
            className={`flex flex-col items-center justify-center gap-0.5 h-full text-white/70 active:text-white transition-all active:scale-90 rounded-xl ${FOCUS}`}
          >
            <span className="text-lg" aria-hidden="true">🔄</span>
            <span className="text-[10px] font-bold tracking-tight">Reset</span>
          </button>
        </nav>

      </div>

      {showPhotoBooth && (
        <TurtleBooth
          onPhotoCaptured={({ framed, raw }) => {
            setCapturedPhoto(framed);
            setRawPhoto(raw);
            setPhotoPermission(null);
          }}
          onClose={() => setShowPhotoBooth(false)}
        />
      )}
    </div>
  );
}