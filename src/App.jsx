// src/App.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import Airtable from 'airtable';
import TurtleBooth from './TurtleBooth';
import BadgeCard from './components/BadgeCard';

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

const GAME_CARDS = [
  '/characters/doctor/avatar.png',
  '/characters/nurse/avatar.png',
  '/characters/lab-tech/avatar.png',
  '/characters/pt/avatar.png',
  '/characters/radiology/avatar.png',
  '/characters/dietary/avatar.png',
  '/characters/behavioral-health/avatar.png',
  '/characters/marketing/avatar.png'
];

// Replaced 'Hospital Tech' with 'CNA'
const AVAILABLE_CAREERS = [
  'Doctor',
  'Nurse',
  'CNA',
  'Marketing',
  'Therapy & Rehab',
  'Radiology',
  'Lab Tech',
  'Dietary',
  'Human Resources',
  'Maintenance'
];

// Replaced 'Hospital Tech' with 'CNA'
const CATEGORY_CAREERS = {
  clinical:  ['Doctor', 'Nurse', 'Therapy & Rehab'],
  technical: ['CNA', 'Radiology', 'Lab Tech'],
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
    /* quota or private mode — caching is a bonus, never required */
  }
};

// Airtable formulas are single-quoted strings; an unescaped apostrophe
// (O'Brien) breaks the query and is an injection vector.
const escapeFormulaValue = (v) =>
  String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// ~1M combinations, no 0/O/1/I so it's readable off a printed card.
const generateBadgeCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const code = Array.from(
    { length: 4 },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join('');
  return `2026-${code}`;
};

// Fire-and-forget. Analytics must never break the booth.
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

// Drains queued badge orders one at a time; stops on first failure
// and keeps the rest for the next attempt.
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

  /* ---------- memory game ---------- */
  const [memoryDeck, setMemoryDeck] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [gameWon, setGameWon] = useState(false);

  /* ---------- admin ---------- */
  const [adminTab, setAdminTab] = useState('queue'); // queue | manual | backs
  const [adminName, setAdminName] = useState('');
  const [adminCareer, setAdminCareer] = useState(AVAILABLE_CAREERS[0]);
  const [printQueue, setPrintQueue] = useState([]);
  const [adminPreviewBadge, setAdminPreviewBadge] = useState(null);
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminInputPin, setAdminInputPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [reprintValue, setReprintValue] = useState('');

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

  /* ---------- initial load (cache first, then network) ---------- */
  useEffect(() => {
    base('Tour Stops')
      .select({ view: 'Grid view', sort: [{ field: 'id', direction: 'asc' }] })
      .firstPage((err, records) => {
        if (err) {
          console.error('Error fetching Tour Stops:', err);
          // Only a hard failure if we have no cached copy to fall back on.
          setLoadError(readCache(TOUR_CACHE_KEY, []).length === 0);
          setLoading(false);
          return;
        }

        const formattedStops = records.map((record) => ({
          id: record.fields.id || 0,
          type: record.fields.type || 'tour',
          title: record.fields.title || 'Untitled Screen',
          headerColor: record.fields.headerColor || 'bg-phc-navy',
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

        setTourStops(formattedStops);
        writeCache(TOUR_CACHE_KEY, formattedStops);
        setLoadError(false);
        setLoading(false);
      });

    // Career info is optional — a missing table or row just skips the screen.
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
  const totalRoundsCount =
    tourStops.filter((s) => s.id >= 4.0 && s.id <= 17.0).length || 1;

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
    if (track.includes('doctor')) return '/characters/doctor/avatar.png';
    if (track.includes('nurse')) return '/characters/nurse/avatar.png';
    if (track.includes('radiology')) return '/characters/radiology/avatar.png';
    if (track.includes('lab')) return '/characters/lab-tech/avatar.png';
    if (track.includes('therapy') || track.includes('rehab')) return '/characters/pt/avatar.png';
    if (track.includes('dietary')) return '/characters/dietary/avatar.png';
    if (track.includes('behavioral')) return '/characters/behavioral-health/avatar.png';
    if (track.includes('maintenance')) return '/characters/maintenance/avatar.png';
    if (track.includes('human resources')) return '/characters/hr/avatar.png';
    if (track.includes('cna') || track.includes('tech')) return '/characters/lab-tech/avatar.png';
    return '/characters/marketing/avatar.png';
  };

  const formatBadgeTitle = (rawCareer) =>
    rawCareer ? rawCareer.toUpperCase() : 'EXPLORER';

  /* ---------- admin ---------- */
  const fetchPrintQueue = useCallback(() => {
    base('Badge Orders')
      .select({
        maxRecords: 25,
        filterByFormula: `OR({Print Status} = '', {Print Status} = 'Pending')`,
        sort: [{ field: 'Ordered Date', direction: 'asc' }]
      })
      .firstPage((err, records) => {
        if (err || !records) return;
        setPrintQueue(
          records.map((r) => ({
            id: r.id,
            name: r.fields['Child Name'] || 'EXPLORER',
            career: r.fields['Assigned Career'] || 'Doctor',
            pin: r.fields['Badge Code'] || '2026-XXXX',
            photo: r.fields['Photo Data'] || null
          }))
        );
      });
  }, []);

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

  // Clears any photo left over from the previous badge so one child's
  // selfie can never end up on another child's record.
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
          'Assigned Career': newBadgeObj.career,
          'Badge Code': generatedPin,
          'Avatar Choice': capturedPhoto ? 'Live Camera Selfie' : 'Illustrated Mascot',
          'Photo Permission':
            capturedPhoto
              ? (photoPermission ? 'YES - Approved' : 'NO - Declined')
              : 'N/A (Avatar Used)',
          'Photo Data': photoPermission === true ? (rawPhoto || '') : '',
          'Print Status': 'Pending',
          'Station': STATION_ID,
          'Source': 'Admin Manual'
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
          career: f['Assigned Career'] || 'Doctor',
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
    if (appMode === 'gamesHub') startNewMemoryGame();
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

    // Pick *within* the winning category by how decisive the win was, so
    // all nine careers are reachable instead of only the first of each.
    const spread = updatedScores[first] - updatedScores[second];
    const pickIndex = spread >= 4 ? 0 : spread >= 2 ? 1 : 2;

    const top3Options = [
      CATEGORY_CAREERS[first][pickIndex],
      CATEGORY_CAREERS[second][(pickIndex + 1) % 3],
      CATEGORY_CAREERS[third][(pickIndex + 2) % 3]
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

  const submitBadgeOrder = () => {
    if (!childName.trim()) {
      showToast('Confirm your name first!', 'warn');
      return;
    }
    if (capturedPhoto && photoPermission === null) {
      showToast('Please tap YES or NO for photo permission.', 'warn');
      return;
    }

    setSubmittingBadge(true);

    const fields = {
      'Child Name': childName,
      'Assigned Career': finalCareer,
      'Badge Code': assignedPin,
      'Avatar Choice': capturedPhoto ? 'Live Camera Selfie' : 'Illustrated Mascot',
      'Photo Permission':
        capturedPhoto
          ? (photoPermission ? 'YES - Approved' : 'NO - Declined')
          : 'N/A (Avatar Used)',
      // A declined photo is never transmitted. It stays in local state
      // long enough to print, and goes away on reset.
      'Photo Data': photoPermission === true ? (rawPhoto || '') : '',
      'Print Status': 'Pending',
      'Station': STATION_ID,
      'Source': 'Kiosk'
    };

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

    base('Badge Orders').create([{ fields }], (err) => {
      setSubmittingBadge(false);
      if (err) {
        console.error(err);
        queueIt();
      }
      logEvent('badge_ordered', { career: finalCareer, queued: !!err });
      setAppMode('badgeSuccess');
    });
  };

  const handleLookupBadge = () => {
    const raw = lookupValue.toUpperCase().trim();
    if (!raw) return;
    setSearchError('');

    // Code-only lookup — searching by name would let anyone pull up
    // another child's record.
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
          career: data['Assigned Career'],
          pin: data['Badge Code'] || '2026-XXXX'
        });
      });
  };

  const isTargetCompleted = (keyword) =>
    completedStops.some((t) => t.toUpperCase().includes(keyword.toUpperCase()));

  /* ---------- loading / error gates ---------- */
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-100 p-4 select-none">
        <div className="text-center font-bold text-phc-navy animate-pulse">
          Waking up the hospital turtles...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-100 p-6 select-none">
        <div className="text-center max-w-xs">
          <div className="text-4xl mb-3">🐢</div>
          <h1 className="font-black text-phc-navy text-lg">The turtles are offline</h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            We couldn't reach the tour. Check the wifi and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 min-h-[48px] bg-phc-blue text-white font-black py-3 px-6 rounded-xl uppercase text-xs tracking-wider shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phc-navy"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

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

  const focusRing =
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-phc-navy';

  return (
    <div
      className="flex justify-center items-center min-h-[100dvh] bg-slate-100 p-0 sm:p-4 select-none touch-manipulation"
      onPointerDown={handleActivity}
      onKeyDown={handleActivity}
    >
      <style>{`
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
      <div className="app-main-layout w-full max-w-sm h-[100dvh] sm:h-[820px] max-h-[850px] bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col border-0 sm:border-8 border-phc-navy relative">

        {/* HEADER */}
        <div className="bg-phc-navy text-white px-4 py-3 font-bold tracking-wide shadow-md flex justify-between items-center gap-2 flex-shrink-0 z-20">
          <span className="truncate text-sm sm:text-base flex items-center gap-1.5">
            {!isNameConfirmed
              ? '👋 Welcome'
              : appMode === 'tour'
                ? (currentStep?.title || 'Hospital Tour')
                : appMode === 'gamesHub'
                  ? '🎮 Game Arcade'
                  : appMode === 'viewBadge'
                    ? '🪪 Badge Lookup'
                    : appMode === 'adminPortal'
                      ? '🔒 Staff Portal'
                      : '🎓 Career Explorer'}
          </span>
          <div className="flex items-center gap-1">
            {isOffline && (
              <span className="text-[10px] bg-phc-orange px-2 py-0.5 rounded-full font-bold">
                Offline
              </span>
            )}
            <button
              onClick={handleAdminToggle}
              aria-label="Staff admin portal"
              className={`text-xs bg-white/15 active:bg-white/25 px-2 py-1 rounded-md font-mono active:scale-95 transition-all cursor-pointer ${focusRing}`}
            >
              ⚙️
            </button>
            {isNameConfirmed && (
              <span className="flex-shrink-0 text-[11px] bg-white/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                📖 {completedStops.length} / {totalRoundsCount}
              </span>
            )}
          </div>
        </div>

        {/* TOAST */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`absolute top-14 left-3 right-3 z-40 rounded-xl px-3 py-2 text-xs font-bold shadow-lg animate-fade-in ${
              toast.tone === 'warn'
                ? 'bg-phc-orange text-white'
                : toast.tone === 'success'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-phc-navy text-white'
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="flex-1 overflow-hidden relative flex flex-col mb-[65px]">

          {/* IDLE WARNING */}
          {idleWarning && (
            <div className="absolute inset-0 bg-phc-navy/95 backdrop-blur-md z-50 flex items-center justify-center p-6 text-center text-white">
              <div>
                <div className="text-4xl mb-2">🐢</div>
                <h3 className="text-lg font-black">Still exploring?</h3>
                <p className="text-xs text-white/80 mt-1 mb-5">
                  Starting over in {idleCountdown} seconds.
                </p>
                <button
                  onClick={() => { setIdleWarning(false); startIdleWatch(); }}
                  className={`min-h-[48px] bg-phc-gold text-phc-navy font-black py-3 px-8 rounded-xl uppercase text-xs tracking-wider shadow-lg ${focusRing}`}
                >
                  I'm still here!
                </button>
              </div>
            </div>
          )}

          {/* RESET CONFIRM */}
          {showResetConfirm && (
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-[280px] text-center shadow-2xl">
                <div className="text-3xl mb-1">🔄</div>
                <h3 className="text-base font-black text-phc-navy uppercase">Start Over?</h3>
                <p className="text-xs text-slate-600 mt-1 mb-4">
                  This clears your name, stamps, and badge.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className={`bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl uppercase ${focusRing}`}
                  >
                    Keep Going
                  </button>
                  <button
                    onClick={() => forceGlobalReset()}
                    className={`bg-phc-orange text-white font-black text-xs py-2.5 rounded-xl uppercase ${focusRing}`}
                  >
                    Start Over
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ADMIN PIN */}
          {showAdminPinModal && (
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-[280px] text-center shadow-2xl">
                <div className="text-3xl mb-1">🔐</div>
                <h3 className="text-base font-black text-phc-navy uppercase tracking-wide">
                  Staff Access
                </h3>
                <p className="text-xs text-slate-600 mt-1 mb-4">
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
                    className="w-full bg-slate-100 border-2 border-phc-blue rounded-2xl p-3 text-center text-xl font-black tracking-widest text-slate-900 focus:outline-none focus:border-phc-navy"
                    autoFocus
                  />
                  {pinError && (
                    <p role="alert" className="text-phc-orange text-xs font-bold">{pinError}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setShowAdminPinModal(false)}
                      className={`bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl uppercase ${focusRing}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`bg-phc-blue text-white font-black text-xs py-2.5 rounded-xl uppercase shadow ${focusRing}`}
                    >
                      Unlock
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* NAME GATE */}
          {!isNameConfirmed && appMode !== 'adminPortal' ? (
            <div className="flex-1 bg-gradient-to-b from-phc-navy to-[#00263f] p-6 flex flex-col justify-between h-full text-white text-center overflow-y-auto">
              <div className="my-auto flex flex-col items-center gap-4">
                <h1 className="text-2xl font-black tracking-wide">
                  Patterson Health Adventure
                </h1>
                <p className="text-xs text-white/80 px-2 sm:px-4 leading-relaxed">
                  Explore the hospital, find the job that fits you, and print your
                  own ID badge to take home.
                </p>
                <div className="w-full max-w-xs mt-4 flex flex-col gap-3">
                  <label htmlFor="child-name" className="sr-only">Your first name</label>
                  <input
                    id="child-name"
                    type="text"
                    placeholder="ENTER YOUR FIRST NAME"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value.toUpperCase())}
                    maxLength={14}
                    className="w-full bg-white border-3 border-phc-gold rounded-2xl p-3.5 font-black text-slate-900 text-center text-sm focus:border-phc-blue focus:outline-none tracking-widest uppercase placeholder:text-slate-400 shadow-inner"
                  />
                  <button
                    onClick={handleNameActivation}
                    className={`w-full min-h-[48px] bg-phc-gold active:brightness-95 text-phc-navy font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 ${focusRing}`}
                  >
                    Start Adventure ➔
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-white/60 font-bold py-2">
                Patterson Health Center · {STATION_ID}
              </div>
            </div>
          ) : (
            <>
              {/* ADMIN PORTAL */}
              {appMode === 'adminPortal' && (
                <div className="flex-1 bg-slate-100 p-4 flex flex-col gap-3 overflow-y-auto h-full text-slate-800">
                  <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h2 className="text-sm font-black text-phc-navy uppercase tracking-wider">
                          Badge Station
                        </h2>
                        <p className="text-[11px] text-slate-600">
                          {STATION_ID} · Smart-21 single-sided
                        </p>
                      </div>
                      {pendingCount > 0 && (
                        <span className="text-[10px] bg-phc-orange text-white font-black px-2 py-1 rounded-lg">
                          {pendingCount} unsent
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      {[
                        { key: 'queue', label: 'Queue' },
                        { key: 'manual', label: 'Manual' },
                        { key: 'backs', label: 'Backs' }
                      ].map((t) => (
                        <button
                          key={t.key}
                          onClick={() => setAdminTab(t.key)}
                          className={`py-1.5 text-xs font-black rounded-lg transition-all ${focusRing} ${
                            adminTab === t.key
                              ? 'bg-phc-blue text-white shadow'
                              : 'text-slate-600'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* QUEUE TAB */}
                  {adminTab === 'queue' && (
                    <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200 flex flex-col gap-2">
                      <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                        Waiting to print ({printQueue.length})
                      </h3>
                      {printQueue.length === 0 && (
                        <p className="text-xs text-slate-500 py-4 text-center">
                          Nothing in the queue.
                        </p>
                      )}
                      <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto">
                        {printQueue.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => { setAdminPreviewBadge(item); setAdminTab('manual'); }}
                            className={`flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-left ${focusRing}`}
                          >
                            <span className="text-xs font-bold text-slate-800 truncate flex-1">
                              {item.name}
                            </span>
                            <span className="text-[11px] text-slate-600 truncate max-w-[100px]">
                              {item.career}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-phc-blue/10 text-phc-navy px-1.5 py-0.5 rounded ml-2">
                              {item.pin}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="border-t border-slate-200 pt-2 mt-1">
                        <label htmlFor="reprint" className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                          Reprint by code
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="reprint"
                            type="text"
                            placeholder="2026-K4TX"
                            value={reprintValue}
                            onChange={(e) => setReprintValue(e.target.value.toUpperCase())}
                            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-phc-blue"
                          />
                          <button
                            onClick={handleReprintLookup}
                            className={`bg-phc-navy text-white font-black text-xs px-4 rounded-xl uppercase ${focusRing}`}
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
                      <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200">
                        <form onSubmit={handleAdminBadgeCreate} className="flex flex-col gap-2.5">
                          <div>
                            <label htmlFor="admin-name" className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                              Recipient name
                            </label>
                            <input
                              id="admin-name"
                              type="text"
                              placeholder="e.g. KRISTEN"
                              value={adminName}
                              onChange={(e) => setAdminName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-phc-blue uppercase"
                            />
                          </div>
                          <div>
                            <label htmlFor="admin-career" className="text-[11px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                              Career role
                            </label>
                            <select
                              id="admin-career"
                              value={adminCareer}
                              onChange={(e) => setAdminCareer(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-phc-blue"
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
                              className={`bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl uppercase ${focusRing}`}
                            >
                              Clear
                            </button>
                            <button
                              type="submit"
                              className={`bg-phc-blue text-white font-black text-xs py-2.5 rounded-xl uppercase tracking-wider shadow ${focusRing}`}
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
                            className={`w-full max-w-[340px] mx-auto bg-phc-orange text-white font-black text-xs py-3 rounded-xl uppercase tracking-wider shadow-lg active:scale-95 ${focusRing}`}
                          >
                            🖨️ Print Badge Front
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* BACKS TAB */}
                  {adminTab === 'backs' && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 text-center">
                      <p className="text-xs text-slate-600 font-medium">
                        Print card backs onto blank stock ahead of time.
                      </p>
                      <div
                        className="w-full max-w-[300px] aspect-[1000/630] mx-auto my-3 bg-contain bg-no-repeat bg-center rounded-xl border border-slate-300"
                        style={{ backgroundImage: `url(/card-back.png)` }}
                      />
                      <button
                        onClick={() => triggerPrintBadge(null)}
                        className={`w-full bg-phc-orange text-white font-black text-xs py-3 rounded-xl uppercase tracking-wider shadow-lg active:scale-95 ${focusRing}`}
                      >
                        🖨️ Print Card Back
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TOUR */}
              {appMode === 'tour' && currentStep?.type === 'tour' && (
                <div
                  className="flex-1 bg-no-repeat relative flex flex-col justify-end p-4 h-full"
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
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-slate-200 z-10 text-center mb-2 min-h-[150px] flex flex-col justify-center">
                    {!quizActive ? (
                      <>
                        <h3 className="font-bold text-lg text-phc-navy mb-1">
                          {currentStep.characterName}{' '}
                          {isTargetCompleted(currentStep.title) && '✅'}
                        </h3>
                        <p className="text-slate-700 text-sm leading-relaxed">
                          <strong>{childName}</strong>,{' '}
                          {currentStep.dialogue
                            ? currentStep.dialogue.charAt(0).toLowerCase() +
                              currentStep.dialogue.slice(1)
                            : ''}
                        </p>
                      </>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <h3 className="font-extrabold text-phc-blue text-base">
                          ✨ Stamp Challenge! ✨
                        </h3>
                        <p className="text-sm font-medium text-slate-800 mb-1">
                          {currentStep.question}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {shuffledStopOptions.map((opt, i) => {
                            let style =
                              'bg-slate-50 border border-slate-400 text-slate-800 active:bg-slate-200';
                            if (quizFeedback !== null) {
                              style = opt.correct
                                ? 'bg-emerald-50 border border-emerald-600 text-emerald-800 pointer-events-none'
                                : 'bg-rose-50 border border-rose-600 text-rose-800 pointer-events-none';
                            }
                            return (
                              <button
                                key={i}
                                onClick={() => handleAnswerSubmit(opt.correct)}
                                className={`p-2.5 font-bold text-xs rounded-xl transition-all min-h-[44px] active:scale-95 ${focusRing} ${style}`}
                              >
                                {opt.text}
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
                              className={`text-[11px] bg-phc-navy text-white px-3 py-1.5 rounded-lg active:scale-95 ${focusRing}`}
                            >
                              Retry Choice 🔄
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {(!quizActive || quizFeedback === 'correct') && (
                    <button
                      onClick={handleNextAction}
                      className={`w-full min-h-[48px] bg-phc-orange text-white font-bold py-3 rounded-xl z-10 uppercase tracking-wider shadow-md active:scale-95 transition-all ${focusRing}`}
                    >
                      {quizFeedback === 'correct'
                        ? 'Collect Stamp & Map ➔'
                        : currentStep.buttonText}
                    </button>
                  )}
                </div>
              )}

              {/* MAP */}
              {appMode === 'tour' && currentStep?.type === 'map' && (
                <div className="flex-1 bg-slate-50 p-3 sm:p-4 flex flex-col justify-between overflow-y-auto h-full">
                  <div className="mb-2 flex justify-between items-center bg-white p-2.5 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-left">
                      <h2 className="text-sm font-extrabold text-phc-navy">
                        Explorer: {childName}
                      </h2>
                      <p className="text-[11px] text-slate-600">
                        Unlock stamps at all {totalRoundsCount} stops!
                      </p>
                    </div>
                    <span className="text-xs bg-phc-blue/10 text-phc-navy font-black px-2.5 py-1 rounded-lg border border-phc-blue/40 font-mono tracking-wider">
                      {assignedPin}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 sm:gap-3 my-auto">
                    <div className="border-b border-slate-200 pb-2">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                        Main Hallway
                      </span>
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        {[
                          { id: 4.0, label: '🏃 PT', key: 'PT' },
                          { id: 5.0, label: '🩺 Clinic', key: 'CLINIC' },
                          { id: 6.0, label: '🧠 Behav.', key: 'BEHAVIORAL' },
                          { id: 7.0, label: '🔬 Lab', key: 'LAB' },
                          { id: 8.0, label: '🏥 Surg.', key: 'SURGERY' },
                          { id: 9.0, label: '🩻 Radio.', key: 'RADIOLOGY' }
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              const i = tourStops.findIndex((t) => t.id === s.id);
                              if (i !== -1) setCurrentStepIndex(i);
                            }}
                            className={`p-2 min-h-[44px] bg-phc-blue/10 border border-phc-blue rounded-lg text-center text-xs font-bold text-phc-navy active:scale-95 ${focusRing}`}
                          >
                            {s.label} {isTargetCompleted(s.key) && '⭐'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                          Left Wing
                        </span>
                        {[
                          { id: 10.0, label: '☕ Cafe', key: 'CAFE' },
                          { id: 11.0, label: '💼 Business', key: 'BUSINESS' },
                          { id: 12.0, label: '⚙️ Mech. Room', key: 'MECHANICAL' }
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              const i = tourStops.findIndex((t) => t.id === s.id);
                              if (i !== -1) setCurrentStepIndex(i);
                            }}
                            className={`p-2 min-h-[44px] bg-phc-gold/20 border border-phc-gold rounded-lg text-center text-xs font-bold text-phc-navy active:scale-95 ${focusRing}`}
                          >
                            {s.label} {isTargetCompleted(s.key) && '⭐'}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                          Right Wing
                        </span>
                        {[
                          { id: 13.0, label: '🚨 Emergency', key: 'EMERGENCY' },
                          { id: 15.0, label: '🏥 Hospital', key: 'HOSPITAL' },
                          { id: 14.0, label: '👔 Admin', key: 'ADMIN' },
                          { id: 16.0, label: '📣 Marketing', key: 'COMMUNITY' }
                        ].map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              const i = tourStops.findIndex((t) => t.id === s.id);
                              if (i !== -1) setCurrentStepIndex(i);
                            }}
                            className={`p-2 min-h-[44px] bg-phc-orange/15 border border-phc-orange rounded-lg text-center text-xs font-bold text-phc-navy active:scale-95 ${focusRing}`}
                          >
                            {s.label} {isTargetCompleted(s.key) && '⭐'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-2">
                      <button
                        onClick={() => {
                          const i = tourStops.findIndex((t) => t.id === 17.0);
                          if (i !== -1) setCurrentStepIndex(i);
                        }}
                        className={`w-full p-2.5 min-h-[44px] bg-phc-navy rounded-xl text-center text-xs font-bold text-white active:scale-95 shadow-sm ${focusRing}`}
                      >
                        🛠️ Maintenance Crew {isTargetCompleted('MAINTENANCE') && '⭐'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <button
                      onClick={startCareerQuizDirect}
                      className={`w-full min-h-[48px] py-3 rounded-xl font-bold text-sm uppercase bg-phc-gold text-phc-navy active:scale-95 shadow-md ${focusRing}`}
                    >
                      🎓 Find My Hospital Job ➔
                    </button>
                  </div>
                </div>
              )}

              {/* CAREER QUIZ */}
              {appMode === 'careerQuiz' && (
                <div className="flex-1 bg-phc-blue/5 p-4 sm:p-6 flex flex-col justify-between h-full overflow-y-auto">
                  <div className="text-center my-auto">
                    <span className="text-xs uppercase bg-phc-blue/15 text-phc-navy px-3 py-1 rounded-full font-bold">
                      Career Explorer
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-phc-navy mt-3 px-2">
                      {MATCHMAKER_QUESTIONS[currentQuizQuestion].q}
                    </h2>
                  </div>
                  <div className="flex flex-col gap-2.5 my-auto p-1">
                    {shuffledCareerOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCareerAnswer(opt.type)}
                        className={`w-full min-h-[52px] p-3.5 bg-white active:bg-phc-blue/10 border-2 border-phc-blue font-bold text-xs text-slate-800 rounded-2xl shadow-sm text-left transition-all active:scale-95 ${focusRing}`}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                  <div className="text-center text-xs text-slate-600 font-bold pb-1">
                    Question {currentQuizQuestion + 1} of {MATCHMAKER_QUESTIONS.length}
                  </div>
                </div>
              )}

              {/* CAREER RESULTS */}
              {appMode === 'careerResultsView' && (
                <div className="flex-1 bg-slate-50 p-4 flex flex-col justify-between overflow-y-auto h-full">
                  <div className="text-center my-2">
                    <span className="text-xs font-black uppercase text-phc-navy bg-phc-gold/30 px-3 py-1 rounded-full tracking-wider">
                      Quiz Complete
                    </span>
                    <h2 className="text-base font-extrabold text-phc-navy mt-2">
                      Your Top Hospital Matches
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Pick one to learn more and print your badge.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 my-auto">
                    {careerResults.map((career, idx) => (
                      <div
                        key={idx}
                        className="bg-white border-2 border-phc-blue/40 rounded-2xl p-3.5 shadow-sm flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img
                            src={getDynamicArtwork(career)}
                            alt=""
                            className="w-12 h-12 object-contain bg-slate-100 rounded-xl p-1 flex-shrink-0 border border-slate-200"
                          />
                          <div className="overflow-hidden text-left">
                            <span className="text-[10px] font-black uppercase tracking-wider text-phc-blue block">
                              {idx === 0 ? '🥇 Top Match' : idx === 1 ? '🥈 Runner-Up' : '🥉 Also Great'}
                            </span>
                            <h3 className="font-extrabold text-sm text-phc-navy truncate">
                              {career}
                            </h3>
                          </div>
                        </div>
                        <button
                          onClick={() => selectCareerOption(career)}
                          className={`flex-shrink-0 bg-phc-orange text-white font-bold text-xs py-2 px-3 rounded-xl uppercase tracking-wider shadow active:scale-95 ${focusRing}`}
                        >
                          Pick ➔
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={startCareerQuizDirect}
                    className={`w-full min-h-[44px] bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs uppercase shadow-sm active:scale-95 mt-2 ${focusRing}`}
                  >
                    Retake Quiz 🔄
                  </button>
                </div>
              )}

              {/* CAREER INFO */}
              {appMode === 'careerInfo' && (
                <div className="flex-1 bg-white p-5 flex flex-col justify-between overflow-y-auto h-full">
                  <div className="text-center">
                    <img
                      src={getDynamicArtwork(finalCareer)}
                      alt=""
                      className="w-20 h-20 object-contain mx-auto"
                    />
                    <h2 className="text-lg font-black text-phc-navy mt-1">{finalCareer}</h2>
                    <p className="text-xs font-bold text-phc-orange uppercase tracking-wide mt-0.5">
                      {careerInfo[finalCareer]?.headline || 'A real job at Patterson Health Center'}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 my-4">
                    {careerInfo[finalCareer]?.description && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                        <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                          What they do
                        </h3>
                        <p className="text-xs text-slate-800 leading-relaxed">
                          {careerInfo[finalCareer].description}
                        </p>
                      </div>
                    )}
                    {careerInfo[finalCareer]?.training && (
                      <div className="bg-phc-blue/5 border border-phc-blue/30 rounded-2xl p-3">
                        <h3 className="text-[11px] font-black uppercase tracking-wider text-phc-navy mb-1">
                          How you get there
                        </h3>
                        <p className="text-xs text-slate-800 leading-relaxed">
                          {careerInfo[finalCareer].training}
                        </p>
                      </div>
                    )}
                    {careerInfo[finalCareer]?.local && (
                      <div className="bg-phc-gold/15 border border-phc-gold rounded-2xl p-3">
                        <h3 className="text-[11px] font-black uppercase tracking-wider text-phc-navy mb-1">
                          Right here in Harper County
                        </h3>
                        <p className="text-xs text-slate-800 leading-relaxed">
                          {careerInfo[finalCareer].local}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setAppMode('avatarBuilder')}
                    className={`w-full min-h-[48px] bg-phc-orange text-white font-black py-3 rounded-xl uppercase text-xs tracking-wider shadow-lg active:scale-95 ${focusRing}`}
                  >
                    Build My Badge ➔
                  </button>
                </div>
              )}

              {/* BADGE BUILDER */}
              {appMode === 'avatarBuilder' && (
                <div className="flex-1 bg-slate-100 p-3 sm:p-4 flex flex-col justify-between overflow-y-auto h-full">
                  <div className="text-center mb-1">
                    <span className="text-[11px] uppercase font-black text-phc-navy bg-phc-gold/30 px-2.5 py-0.5 rounded-full tracking-wider">
                      Final Step
                    </span>
                    <h2 className="text-sm font-extrabold text-phc-navy mt-0.5">
                      Your Official ID Badge
                    </h2>
                  </div>

                  <button
                    onClick={() => setShowPhotoBooth(true)}
                    className={`w-full max-w-[340px] mx-auto bg-phc-blue text-white font-black text-xs py-2.5 rounded-xl uppercase tracking-wider shadow active:scale-95 mb-1 ${focusRing}`}
                  >
                    📸 Take a Turtle Selfie
                  </button>

                  <div
                    className="w-full max-w-[340px] aspect-[1000/630] mx-auto my-auto overflow-hidden relative flex-shrink-0 select-none bg-contain bg-no-repeat bg-center rounded-2xl border border-slate-300 shadow-xl"
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
                    <div className="w-full max-w-[340px] mx-auto bg-white p-3 rounded-2xl border border-slate-300 shadow-sm my-2 text-center">
                      <p className="text-xs font-black text-phc-navy mb-2 leading-snug">
                        Parent or guardian: may Patterson Health Center use this photo
                        on social media or event flyers?
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPhotoPermission(true)}
                          aria-pressed={photoPermission === true}
                          className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${focusRing} ${
                            photoPermission === true
                              ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-400'
                              : 'bg-slate-100 text-slate-700 border border-slate-400'
                          }`}
                        >
                          {photoPermission === true ? '✅ Yes' : 'Yes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoPermission(false)}
                          aria-pressed={photoPermission === false}
                          className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${focusRing} ${
                            photoPermission === false
                              ? 'bg-phc-orange text-white shadow-md ring-2 ring-orange-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-400'
                          }`}
                        >
                          {photoPermission === false ? '🛑 No' : 'No'}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-2 leading-snug">
                        Either way the photo prints on the badge. "No" means we never
                        save or share it.
                      </p>
                      {photoPermission === null && (
                        <span className="text-[11px] font-bold text-phc-orange block mt-1.5">
                          ⚠️ Tap Yes or No to continue
                        </span>
                      )}
                    </div>
                  )}

                  <button
                    onClick={submitBadgeOrder}
                    disabled={submittingBadge}
                    className={`w-full min-h-[48px] bg-phc-orange disabled:opacity-60 text-white font-black py-3 rounded-xl shadow-lg text-xs uppercase tracking-wider active:scale-95 transition-all my-auto ${focusRing}`}
                  >
                    {submittingBadge ? 'Sending to the booth...' : '🪪 Send My Badge to Print ➔'}
                  </button>
                </div>
              )}

              {/* SUCCESS */}
              {appMode === 'badgeSuccess' && (
                <div className="flex-1 bg-gradient-to-b from-phc-gold/20 to-phc-gold/40 p-6 flex flex-col justify-center items-center text-center h-full">
                  <div className="w-20 h-20 bg-phc-orange rounded-full text-white flex items-center justify-center text-4xl shadow-xl animate-bounce mb-5">
                    🎉
                  </div>
                  <h2 className="text-2xl font-black text-phc-navy">Badge Ordered!</h2>
                  <p className="text-slate-800 text-sm font-medium mt-3 px-2 leading-relaxed">
                    Nice work, <strong>{childName}</strong>! Show this code at the booth
                    to pick up your printed badge:
                  </p>
                  <div className="mt-4 bg-white border-2 border-phc-navy rounded-2xl px-6 py-3">
                    <span className="text-2xl font-mono font-black text-phc-navy tracking-widest">
                      {assignedPin}
                    </span>
                  </div>
                  {pendingCount > 0 && (
                    <p className="text-[11px] text-slate-700 mt-3 font-bold">
                      Saved on this tablet — it will send when wifi returns.
                    </p>
                  )}
                  <button
                    onClick={() => forceGlobalReset()}
                    className={`mt-8 min-h-[48px] bg-phc-navy text-white text-xs font-bold py-3 px-6 rounded-xl shadow uppercase tracking-wide active:scale-95 ${focusRing}`}
                  >
                    Next Explorer 🔄
                  </button>
                </div>
              )}

              {/* MEMORY GAME */}
              {appMode === 'gamesHub' && (
                <div className="flex-1 bg-gradient-to-b from-phc-navy to-[#00263f] p-4 flex flex-col justify-between h-full text-white overflow-y-auto">
                  <div className="text-center mt-1">
                    <span className="text-3xl">🧩</span>
                    <h2 className="text-base font-black tracking-wide">Turtle Memory Match</h2>
                    <p className="text-[11px] text-white/80">
                      Tap cards to find matching pairs!
                    </p>
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
                            className={`aspect-square rounded-xl font-bold text-2xl flex items-center justify-center shadow-md transition-all active:scale-95 overflow-hidden ${focusRing} ${
                              isFlipped
                                ? 'bg-white'
                                : 'bg-phc-blue border-2 border-white/30 text-white'
                            }`}
                          >
                            {isFlipped ? (
                              <img src={card.icon} alt="" className="w-full h-full object-contain p-1" />
                            ) : (
                              '❓'
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="my-auto bg-white/10 border border-white/20 rounded-2xl p-6 text-center animate-fade-in">
                      <div className="text-4xl mb-2">🏆</div>
                      <h3 className="text-lg font-black text-phc-gold">Matching Master!</h3>
                      <p className="text-xs text-white/90 mt-1">You found every pair.</p>
                      <button
                        onClick={startNewMemoryGame}
                        className={`mt-4 bg-phc-gold text-phc-navy font-bold text-xs py-2.5 px-5 rounded-xl shadow uppercase tracking-wider active:scale-95 ${focusRing}`}
                      >
                        Play Again 🔄
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setAppMode('tour')}
                    className={`w-full min-h-[44px] bg-white/20 text-white font-bold py-2 rounded-xl text-xs uppercase shadow-md active:scale-95 ${focusRing}`}
                  >
                    Return to Map ➔
                  </button>
                </div>
              )}

              {/* BADGE LOOKUP */}
              {appMode === 'viewBadge' && (
                <div className="flex-1 bg-slate-100 p-4 flex flex-col justify-between overflow-y-auto h-full">
                  <div className="text-center mb-1">
                    <span className="text-xl">🪪</span>
                    <h2 className="text-sm font-extrabold text-phc-navy mt-0.5">
                      Look Up My Badge
                    </h2>
                    <p className="text-xs text-slate-600">Enter the code from your card</p>
                  </div>

                  {!foundBadge ? (
                    <div className="bg-white rounded-2xl p-4 shadow-md border border-slate-200 my-auto flex flex-col gap-3">
                      <label htmlFor="badge-code" className="sr-only">Badge code</label>
                      <input
                        id="badge-code"
                        type="text"
                        placeholder="2026-K4TX"
                        value={lookupValue}
                        onChange={(e) => setLookupValue(e.target.value.toUpperCase())}
                        className="w-full bg-slate-50 border-2 border-slate-400 rounded-xl p-3 font-black text-slate-900 text-center text-sm focus:border-phc-blue focus:outline-none tracking-wide placeholder:text-slate-400"
                      />
                      {searchError && (
                        <p role="alert" className="text-phc-orange text-xs font-bold text-center">
                          {searchError}
                        </p>
                      )}
                      <button
                        onClick={handleLookupBadge}
                        className={`w-full min-h-[48px] bg-phc-blue text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow active:scale-95 ${focusRing}`}
                      >
                        Find My Badge ➔
                      </button>
                    </div>
                  ) : (
                    <div className="my-auto flex flex-col gap-3">
                      <div
                        className="w-full max-w-[340px] aspect-[1000/630] mx-auto overflow-hidden relative select-none bg-contain bg-no-repeat bg-center rounded-2xl border border-slate-300 shadow-xl"
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
                        className={`mx-auto text-xs font-bold text-phc-navy underline active:opacity-75 ${focusRing}`}
                      >
                        Search Another Code
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setAppMode('tour')}
                    className={`w-full min-h-[44px] bg-phc-navy text-white font-bold py-2.5 rounded-xl text-xs uppercase shadow-md mt-1 active:scale-95 ${focusRing}`}
                  >
                    Return to Map
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* BOTTOM NAV */}
        <nav
          aria-label="Main"
          className="absolute bottom-0 left-0 right-0 h-[65px] bg-white border-t border-slate-300 grid grid-cols-6 items-center px-1 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] pb-safe"
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
              icon: '📸', label: 'Camera', aria: 'Open photo booth',
              onClick: () => setShowPhotoBooth(true),
              active: showPhotoBooth
            },
            {
              icon: '🎓', label: 'Careers', aria: 'Take the career quiz',
              onClick: startCareerQuizDirect,
              active: ['careerQuiz', 'careerResultsView', 'careerInfo', 'avatarBuilder', 'badgeSuccess'].includes(appMode)
            },
            {
              icon: '🎮', label: 'Arcade', aria: 'Play the memory game',
              onClick: () => setAppMode('gamesHub'),
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
              onClick={() => { if (isNameConfirmed) item.onClick(); }}
              aria-label={item.aria}
              disabled={!isNameConfirmed}
              className={`flex flex-col items-center justify-center gap-0.5 h-full transition-all active:scale-90 ${focusRing} ${
                !isNameConfirmed ? 'opacity-30' : ''
              } ${item.active ? 'text-phc-blue font-black' : 'text-slate-600'}`}
            >
              <span className="text-base" aria-hidden="true">{item.icon}</span>
              <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
            </button>
          ))}

          <button
            onClick={() => setShowResetConfirm(true)}
            aria-label="Start over"
            className={`flex flex-col items-center justify-center gap-0.5 h-full text-slate-600 active:text-phc-orange transition-all active:scale-90 ${focusRing}`}
          >
            <span className="text-base" aria-hidden="true">🔄</span>
            <span className="text-[10px] font-bold tracking-tight">Reset</span>
          </button>
        </nav>
      </div>

      {showPhotoBooth && (
        <TurtleBooth
          onPhotoCaptured={({ framed, raw }) => {
            setCapturedPhoto(framed);
            setRawPhoto(raw);
            setPhotoPermission(null); // new photo = fresh consent
          }}
          onClose={() => setShowPhotoBooth(false)}
        />
      )}
    </div>
  );
}