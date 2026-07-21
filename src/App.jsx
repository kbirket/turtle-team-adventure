import { useState, useEffect } from 'react';
import Airtable from 'airtable';

const base = new Airtable({ 
  apiKey: import.meta.env.VITE_AIRTABLE_PAT 
}).base(import.meta.env.VITE_AIRTABLE_BASE_ID);

const MASTER_BADGE_BG = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=340&h=215&q=80"; 

// Memory Game Character Avatars Set (Using real local character images instead of emojis)
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

export default function App() {
  const [tourStops, setTourStops] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // LOGGED-IN EXPLORER IDENTIFICATION & UNIQUE ID STATE
  const [childName, setChildName] = useState('');
  const [assignedPin, setAssignedPin] = useState('');
  const [isNameConfirmed, setIsNameConfirmed] = useState(false);

  // GAME PROGRESS STATE
  const [completedStops, setCompletedStops] = useState([]);
  const [quizActive, setQuizActive] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [shuffledStopOptions, setShuffledStopOptions] = useState([]);

  // NAVIGATION ENGINE & LOOKUP STATES
  const [appMode, setAppMode] = useState('tour'); 
  const [lookupValue, setLookupValue] = useState('');
  const [foundBadge, setFoundBadge] = useState(null);
  const [searchError, setSearchError] = useState('');
  
  // Matchmaker tracking scoring weights
  const [careerScores, setCareerScores] = useState({ clinical: 0, technical: 0, creative: 0 });
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);
  const [finalCareer, setFinalCareer] = useState('');
  const [shuffledCareerOptions, setShuffledCareerOptions] = useState([]);
  
  // Avatar choices
  const [avatarHat, setAvatarHat] = useState('🎓 Graduate Cap');
  const [avatarProp, setAvatarProp] = useState('🩺 Stethoscope');
  const [submittingBadge, setSubmittingBadge] = useState(false);

  // MEMORY MINI-GAME STATES
  const [memoryDeck, setMemoryDeck] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [gameWon, setGameWon] = useState(false);

  const matchmakerQuestions = [
    { q: "What sounds like the most fun thing to do?", options: [{ text: "Helping someone feel better when they are sick", type: "clinical" }, { text: "Fixing a broken machine or using a computer", type: "technical" }, { text: "Cooking a delicious meal or drawing a poster", type: "creative" }] },
    { q: "If you were given a superpower tool, which one would you pick?", options: [{ text: "A magical healing bandage", type: "clinical" }, { text: "Super-vision X-Ray glasses", type: "technical" }, { text: "A magical wooden mixing spoon", type: "creative" }] },
    { q: "Where would you want to spend your morning?", options: [{ text: "Visiting rooms and talking to people", type: "clinical" }, { text: "Solving puzzles in a quiet room with neat gadgets", type: "technical" }, { text: "In a bustling kitchen or decorating a lobby", type: "creative" }] },
    { q: "Choose your favorite school subject:", options: [{ text: "Science and learning how the body works", type: "clinical" }, { text: "Math, coding, or playing logic games", type: "technical" }, { text: "Art, music, or writing fun stories", type: "creative" }] },
    { q: "When a friend has a problem, how do you help?", options: [{ text: "I check on them to see if they need comfort", type: "clinical" }, { text: "I try to figure out a smart solution step-by-step", type: "technical" }, { text: "I cheer them up with a joke or a fun activity", type: "creative" }] },
    { q: "Pick a secret agent gadget you'd love to use:", options: [{ text: "A scanner that checks vital signs instantly", type: "clinical" }, { text: "A high-tech laser that decrypts files", type: "technical" }, { text: "A watch that shoots out healthy energy snacks", type: "creative" }] },
    { q: "What kind of book do you like reading best?", options: [{ text: "Stories about heroes saving the day", type: "clinical" }, { text: "Books about cool inventions or outer space", type: "technical" }, { text: "Comic books with bright pictures and great art", type: "creative" }] },
    { q: "If you were helping run a zoo, what would your job be?", options: [{ text: "Giving the animals checkups to keep them strong", type: "clinical" }, { text: "Building the digital maps and security locks", type: "technical" }, { text: "Designing the awesome animal play zones and menus", type: "creative" }] },
    { q: "What do you notice first when you walk into a new room?", options: [{ text: "The people and how happy or comfortable they look", type: "clinical" }, { text: "The computers, screens, and lighting setups", type: "technical" }, { text: "The colors, posters, and cleanliness of the room", type: "creative" }] },
    { q: "If you were building a video game, what would you program?", options: [{ text: "The healing potions and shield spells", type: "clinical" }, { text: "The codes, physics engines, and lock hacking", type: "technical" }, { text: "The cool map landscapes and character costumes", type: "creative" }] },
    { q: "What's your favorite kind of game to play with friends?", options: [{ text: "Team games where we protect each other", type: "clinical" }, { text: "Strategic board games or building block puzzles", type: "technical" }, { text: "Charades, trivia, or building cool crafts", type: "creative" }] },
    { q: "If you found a broken robot, what would you do first?", options: [{ text: "Make sure it isn't hurt and clean it up", type: "clinical" }, { text: "Take the back panel off to fix its wires", type: "technical" }, { text: "Paint its shell and throw it a welcome back party", type: "creative" }] },
    { q: "Pick a job at a spaceship launch pad:", options: [{ text: "The astronaut doctor checking the crew", type: "clinical" }, { text: "The flight engineer tracking radar screens", type: "technical" }, { text: "The team commander organizing the celebration launch", type: "creative" }] },
    { q: "What kind of projects do you like doing at home?", options: [{ text: "Helping take care of a family pet or garden", type: "clinical" }, { text: "Building sets with LEGOs or fixing toys", type: "technical" }, { text: "Baking treats or drawing pictures for family", type: "creative" }] },
    { q: "Choose your favorite animal trait:", options: [{ text: "A dog's loyalty and caring heart", type: "clinical" }, { text: "An owl's clever problem-solving mind", type: "technical" }, { text: "A peacock's bright, colorful presentation", type: "creative" }] },
    { q: "If you could invent an app, what would it do?", options: [{ text: "Remind people to drink water and take care of themselves", type: "clinical" }, { text: "Organize data or translate secret codes instantly", type: "technical" }, { text: "Create fun musical tracks and custom artwork", type: "creative" }] },
    { q: "What sounds like the best reward after a hard day?", options: [{ text: "A big high-five and a thank you from someone", type: "clinical" }, { text: "Leveling up your skill points on a scoreboard", type: "technical" }, { text: "A fun dessert or custom badge sticker", type: "creative" }] },
    { q: "If you were planning a treehouse, you would focus on:", options: [{ text: "Making sure the safety railings are perfectly sturdy", type: "clinical" }, { text: "Setting up a cool walkie-talkie communication array", type: "technical" }, { text: "Painting the walls with awesome custom murals", type: "creative" }] },
    { q: "Choose your favorite outdoor activity:", options: [{ text: "Helping teammates during a sports game", type: "clinical" }, { text: "Exploring nature trails with a compass or map", type: "technical" }, { text: "Taking photographs or having a nice picnic", type: "creative" }] },
    { q: "If you could see into the microscopic world, what would you explore?", options: [{ text: "How cells work together to heal a scrape", type: "clinical" }, { text: "The patterns on computer microchips", type: "technical" }, { text: "The crystals in sugar grains and food items", type: "creative" }] },
    { q: "When you look at a spreadsheet full of numbers, what do you think?", options: [{ text: "Let's see if this tells a story about people", type: "clinical" }, { text: "Awesome, a puzzle to organize perfectly!", type: "technical" }, { text: "Let's turn this data into a cool bar chart layout", type: "creative" }] },
    { q: "Pick a superpower lifestyle trait:", options: [{ text: "Super empathy—knowing exactly how to heal a mood", type: "clinical" }, { text: "Technokinesis—controlling electronics with your mind", type: "technical" }, { text: "Illusion art—creating decorations out of thin air", type: "creative" }] },
    { q: "What's the best part about being on a group project team?", options: [{ text: "Encouraging everyone and keeping spirits high", type: "clinical" }, { text: "Putting all the technical pieces together neatly", type: "technical" }, { text: "Coming up with the big presentation idea", type: "creative" }] },
    { q: "If you were running a restaurant, you would want to be the:", options: [{ text: "Host greeting families and ensuring their comfort", type: "clinical" }, { text: "Manager handling the digital registers and schedules", type: "technical" }, { text: "Head chef creating unique flavor combinations", type: "creative" }] },
    { q: "Finally, pick the words that describe you best:", options: [{ text: "Kind, helpful, and attentive", type: "clinical" }, { text: "Smart, organized, and analytical", type: "technical" }, { text: "Creative, energetic, and organized", type: "creative" }] }
  ];

  useEffect(() => {
    base('Tour Stops')
      .select({ 
        view: 'Grid view',
        sort: [{ field: 'id', direction: 'asc' }]
      })
      .firstPage((err, records) => {
        if (err) {
          console.error("Error fetching Airtable data:", err);
          return;
        }
        
        const formattedStops = records.map(record => ({
          id: record.fields.id || 0,
          type: record.fields.type || 'tour',
          title: record.fields.title || 'Untitled Screen',
          headerColor: record.fields.headerColor || 'bg-slate-800',
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
          wrongAnswer: record.fields.wrongAnswer || null,
        }));

        formattedStops.forEach(stop => {
          if (stop.background) {
            const img = new Image();
            img.src = stop.background;
          }
          if (stop.character) {
            const charImg = new Image();
            charImg.src = stop.character;
          }
        });

        const bgImg = new Image();
        bgImg.src = MASTER_BADGE_BG;

        setTourStops(formattedStops);
        setLoading(false);
      });
  }, []);

  const currentStep = tourStops[currentStepIndex];
  const totalRoundsCount = tourStops.filter(s => s.id >= 4.0 && s.id <= 17.0).length;

  const getDynamicArtwork = (careerTrack) => {
    const track = (careerTrack || finalCareer || '').toLowerCase();

    let folder = 'marketing';

    if (track.includes('doctor')) folder = 'doctor';
    else if (track.includes('nurse')) folder = 'nurse';
    else if (track.includes('tech') || track.includes('lab')) folder = 'lab-tech';
    else if (track.includes('chef') || track.includes('dietary')) folder = 'dietary';
    else if (track.includes('pt')) folder = 'pt';
    else if (track.includes('radiology')) folder = 'radiology';
    else if (track.includes('behavioral')) folder = 'behavioral-health';
    else if (track.includes('maintenance')) folder = 'maintenance';
    else if (track.includes('marketing')) folder = 'marketing';
    else if (track.includes('it')) folder = 'it';
    else if (track.includes('cna')) folder = 'cna';
    else if (track.includes('hr')) folder = 'hr';
    else if (track.includes('receptionist')) folder = 'receptionist';
    else if (track.includes('evs')) folder = 'evs';

    return `/characters/${folder}/avatar.png`;
  };

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
    if (appMode === 'gamesHub') {
      startNewMemoryGame();
    }
  }, [appMode]);

  const handleCardClick = (index) => {
    if (flippedIndices.length === 2 || flippedIndices.includes(index) || matchedPairs.includes(index)) return;

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
        }
      } else {
        setTimeout(() => setFlippedIndices([]), 900);
      }
    }
  };

  const handleNameActivation = () => {
    if (!childName.trim()) return alert("Please drop in your name!");
    const randomThreeDigit = Math.floor(100 + Math.random() * 900);
    setAssignedPin(`TUR-${randomThreeDigit}`);
    setIsNameConfirmed(true);
  };

  useEffect(() => {
    if (appMode === 'careerQuiz' && matchmakerQuestions[currentQuizQuestion]) {
      const optionsCopy = [...matchmakerQuestions[currentQuizQuestion].options];
      for (let i = optionsCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsCopy[i], optionsCopy[j]] = [optionsCopy[j], optionsCopy[i]];
      }
      setShuffledCareerOptions(optionsCopy);
    }
  }, [currentQuizQuestion, appMode]);

  const handleNextAction = () => {
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
    const nextIndex = tourStops.findIndex(stop => stop.id === currentStep.nextStepIndex);
    if (nextIndex !== -1) {
      setCurrentStepIndex(nextIndex);
    } else {
      const mapIdx = tourStops.findIndex(s => s.type === 'map');
      if (mapIdx !== -1) setCurrentStepIndex(mapIdx);
    }
    setQuizActive(false);
    setQuizFeedback(null);
  };

  const handleAnswerSubmit = (isCorrect) => {
    if (isCorrect) {
      setQuizFeedback('correct');
      if (!completedStops.includes(currentStep.title)) {
        setCompletedStops([...completedStops, currentStep.title]);
      }
    } else {
      setQuizFeedback('wrong');
    }
  };

  const handleCareerAnswer = (type) => {
    const updatedScores = { ...careerScores, [type]: careerScores[type] + 1 };
    setCareerScores(updatedScores);

    if (currentQuizQuestion + 1 < matchmakerQuestions.length) {
      setCurrentQuizQuestion(currentQuizQuestion + 1);
    } else {
      let highestType = 'clinical';
      let maxScore = -1;
      Object.keys(updatedScores).forEach(key => {
        if (updatedScores[key] > maxScore) {
          maxScore = updatedScores[key];
          highestType = key;
        }
      });

      const careerMap = {
        clinical: 'Patterson Doctor',
        technical: 'Expert Hospital Tech Wizard',
        creative: 'Marketing Turtle'
      };

      setFinalCareer(careerMap[highestType]);
      setAppMode('avatarBuilder');
    }
  };

  const submitBadgeOrder = () => {
    if (!childName.trim()) return alert("Please confirm your name first!");
    setSubmittingBadge(true);

    base('Badge Orders').create([
      {
        fields: {
          "Child Name": childName,
          "Assigned Career": finalCareer,
          "Avatar Choice": `Hat: ${avatarHat} | Item: ${avatarProp}`,
          "Notes": assignedPin 
        }
      }], (err) => {
      setSubmittingBadge(false);
      if (err) {
        console.error(err);
        alert("Oops! Had trouble sending your order to the printer.");
        return;
      }
      setAppMode('badgeSuccess');
    });
  };

  const handleLookupBadge = () => {
    if (!lookupValue.trim()) return;
    setSearchError('');
    
    const targetQuery = lookupValue.toUpperCase().trim();
    const formula = `OR(UPPER({Child Name}) = '${targetQuery}', UPPER({Notes}) = '${targetQuery}')`;

    base('Badge Orders').select({
      filterByFormula: formula,
      maxRecords: 1
    }).firstPage((err, records) => {
      if (err || records.length === 0) {
        setSearchError('🔍 Code or Name not found. Make sure it matches perfectly!');
        return;
      }
      
      const data = records[0].fields;
      const choiceStr = data["Avatar Choice"] || "";
      let hat = "🎓 Graduate Cap";
      let prop = "🩺 Stethoscope";
      
      if (choiceStr.includes("Hat:")) {
        const parts = choiceStr.split(" | Item: ");
        hat = parts[0].replace("Hat: ", "");
        prop = parts[1] || "";
      }

      const rawDate = data["Ordered Date"] ? new Date(data["Ordered Date"]) : new Date();
      const formattedDate = `${String(rawDate.getMonth() + 1).padStart(2, '0')}/${String(rawDate.getDate()).padStart(2, '0')}/${rawDate.getFullYear()}`;

      setFoundBadge({
        name: data["Child Name"],
        career: data["Assigned Career"],
        avatarHat: hat,
        avatarProp: prop,
        pin: data["Notes"] || "TUR-AUTH",
        date: formattedDate
      });
    });
  };

  const getTodayFormatted = () => {
    const today = new Date();
    return `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
  };

  const isTargetCompleted = (keyword) => {
    return completedStops.some(t => t.toUpperCase().includes(keyword.toUpperCase()));
  };

  const forceGlobalReset = () => {
    setCompletedStops([]);
    setChildName('');
    setAssignedPin('');
    setIsNameConfirmed(false);
    setCurrentQuizQuestion(0);
    setCareerScores({ clinical: 0, technical: 0, creative: 0 });
    setCurrentStepIndex(0);
    setAppMode('tour');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4 select-none">
        <div className="text-center font-bold text-slate-600 animate-pulse">Waking up the hospital turtles...</div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[100dvh] bg-gray-100 p-0 sm:p-4 select-none touch-manipulation">
      <div className="w-full max-w-sm h-[100dvh] sm:h-[820px] max-h-[850px] bg-white sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col border-0 sm:border-8 border-gray-800 relative">
        
        {/* HEADER BAR */}
        <div className="bg-slate-800 text-white px-4 py-3 font-bold tracking-wide shadow-md flex justify-between items-center gap-2 flex-shrink-0 z-20">
          <span className="truncate text-sm sm:text-base">
            {!isNameConfirmed ? '👋 Welcome Arrival' : appMode === 'tour' ? currentStep.title : appMode === 'gamesHub' ? '🎮 Game Arcade' : appMode === 'viewBadge' ? '🪪 Badge File' : '🎓 Graduation Center'}
          </span>
          {isNameConfirmed && (
            <span className="flex-shrink-0 text-xs bg-white/20 px-2 py-0.5 rounded-full whitespace-nowrap">
              📖 {completedStops.length} / {totalRoundsCount} Stamps
            </span>
          )}
        </div>

        {/* CONTAINER VIEW BODY LAYOUT */}
        <div className="flex-1 overflow-hidden relative flex flex-col mb-[65px]">
          
          {/* STEP 0: INITIAL NAME LOG-IN GATE */}
          {!isNameConfirmed ? (
            <div className="flex-1 bg-gradient-to-b from-blue-900 to-indigo-950 p-6 flex flex-col justify-between h-full text-white text-center overflow-y-auto">
              <div className="my-auto flex flex-col items-center gap-4">
                <h1 className="text-2xl font-black tracking-wide">Patterson Health Adventure</h1>
                <p className="text-xs text-indigo-200 px-2 sm:px-4 leading-relaxed">
                  Welcome! Before we kick off our digital corridor tour, tell us your name to print your official security ID card file at the end!
                </p>
                
                <div className="w-full max-w-xs mt-4 flex flex-col gap-3">
                  <input 
                    type="text" 
                    placeholder="ENTER YOUR FIRST NAME" 
                    value={childName} 
                    onChange={(e) => setChildName(e.target.value.toUpperCase())} 
                    className="w-full bg-white border-3 border-indigo-400 rounded-2xl p-3.5 font-black text-slate-900 text-center text-sm focus:border-emerald-400 focus:outline-none tracking-widest uppercase placeholder:text-slate-300 shadow-inner"
                  />
                  <button 
                    onClick={handleNameActivation}
                    className="w-full min-h-[48px] bg-emerald-500 active:bg-emerald-600 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 cursor-pointer touch-manipulation"
                  >
                    Start Adventure ➔
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-indigo-400 font-bold py-2">Secure Clinic Device Profile Pipeline</div>
            </div>
          ) : (
            <>
              {/* MODE 1: Standard Tour System */}
              {appMode === 'tour' && currentStep.type === 'tour' && (
                <div className="flex-1 bg-no-repeat relative flex flex-col justify-end p-4 h-full" style={{ backgroundImage: `url(${currentStep.background})`, backgroundPosition: currentStep.bgPosition, backgroundSize: currentStep.bgSize }}>
                  {!quizActive && (
                    <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                      <img src={currentStep.character} alt={currentStep.characterName} className="w-4/5 max-h-[60%] object-contain mt-8" />
                    </div>
                  )}
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-gray-200 z-10 text-center mb-2 min-h-[150px] flex flex-col justify-center">
                    {!quizActive ? (
                      <>
                        <h3 className="font-bold text-lg text-emerald-700 mb-1">{currentStep.characterName} {isTargetCompleted(currentStep.title) && '✅'}</h3>
                        <p className="text-gray-700 text-sm leading-relaxed">
                          <strong>{childName}</strong>, {currentStep.dialogue.charAt(0).toLowerCase() + currentStep.dialogue.slice(1)}
                        </p>
                      </>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <h3 className="font-extrabold text-indigo-700 text-base">✨ Stamp Challenge! ✨</h3>
                        <p className="text-xs sm:text-sm font-medium text-gray-800 mb-1">{currentStep.question}</p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {shuffledStopOptions.map((opt, i) => {
                            let buttonStyle = "bg-slate-50 border border-slate-300 text-slate-700 active:bg-slate-200";
                            if (quizFeedback !== null) {
                              if (opt.correct) {
                                buttonStyle = "bg-emerald-50 border border-emerald-400 text-emerald-700 pointer-events-none";
                              } else {
                                buttonStyle = "bg-rose-50 border border-rose-400 text-rose-700 pointer-events-none";
                              }
                            }
                            return (
                              <button key={i} onClick={() => handleAnswerSubmit(opt.correct)} className={`p-2.5 font-bold text-xs rounded-xl cursor-pointer transition-all min-h-[44px] active:scale-95 touch-manipulation ${buttonStyle}`}>
                                {opt.text}
                              </button>
                            );
                          })}
                        </div>

                        {quizFeedback === 'wrong' && (
                          <div className="text-center mt-1">
                            <button onClick={() => setQuizFeedback(null)} className="text-[10px] bg-slate-700 active:bg-slate-800 text-white px-3 py-1.5 rounded-lg active:scale-95 touch-manipulation">Retry Choice 🔄</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {(!quizActive || quizFeedback === 'correct') && (
                    <button onClick={handleNextAction} className="w-full min-h-[48px] bg-emerald-600 active:bg-emerald-700 text-white font-bold py-3 rounded-xl z-10 uppercase tracking-wider cursor-pointer shadow-md active:scale-95 transition-all touch-manipulation">
                      {quizFeedback === 'correct' ? 'Collect Stamp & Map Hub ➔' : currentStep.buttonText}
                    </button>
                  )}
                </div>
              )}

              {/* MODE 2: Map System */}
              {appMode === 'tour' && currentStep.type === 'map' && (
                <div className="flex-1 bg-slate-50 p-3 sm:p-4 flex flex-col justify-between overflow-y-auto h-full">
                  <div className="text-center mb-2 flex justify-between items-center bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-left">
                      <h2 className="text-xs sm:text-sm font-extrabold text-slate-800">Agent: {childName}</h2>
                      <p className="text-[9px] sm:text-[10px] text-slate-400">Unlock stamps at all {totalRoundsCount} locations!</p>
                    </div>
                    <span className="text-xs bg-indigo-100 text-indigo-700 font-black px-2.5 py-1 rounded-lg border border-indigo-300 font-mono tracking-wider">
                      {assignedPin}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 sm:gap-3 my-auto">
                    <div className="border-b border-gray-200 pb-2">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Main Hallway</span>
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 4.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 min-h-[44px] bg-blue-50 border border-blue-400 rounded-lg text-center text-xs font-bold text-blue-700 cursor-pointer active:scale-95 touch-manipulation">🏃‍♂️ PT {isTargetCompleted("PT") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 5.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 min-h-[44px] bg-blue-50 border border-blue-400 rounded-lg text-center text-xs font-bold text-blue-700 cursor-pointer active:scale-95 touch-manipulation">🩺 Clinic {isTargetCompleted("CLINIC") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 6.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 min-h-[44px] bg-purple-50 border border-purple-400 rounded-lg text-center text-xs font-bold text-purple-700 cursor-pointer active:scale-95 touch-manipulation">🧠 Behav. {isTargetCompleted("BEHAVIORAL") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 7.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 min-h-[44px] bg-blue-50 border border-blue-400 rounded-lg text-center text-xs font-bold text-blue-700 cursor-pointer active:scale-95 touch-manipulation">🔬 Lab {isTargetCompleted("LAB") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 8.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 min-h-[44px] bg-blue-50 border border-blue-400 rounded-lg text-center text-xs font-bold text-blue-700 cursor-pointer active:scale-95 touch-manipulation">🏥 Surg. {isTargetCompleted("SURGERY") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 9.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 min-h-[44px] bg-blue-50 border border-blue-400 rounded-lg text-center text-xs font-bold text-blue-700 cursor-pointer active:scale-95 touch-manipulation">🩻 Radio. {isTargetCompleted("RADIOLOGY") && '⭐'}</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div className="flex flex-col gap-1.5 sm:gap-2">
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-slate-400">Left Wing & Tech</span>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 10.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 min-h-[44px] bg-amber-50 border border-amber-500 rounded-xl text-center text-xs font-bold text-amber-800 cursor-pointer active:scale-95 touch-manipulation">☕ Cafe {isTargetCompleted("CAFE") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 11.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 min-h-[44px] bg-slate-100 border border-slate-400 rounded-lg text-center text-[11px] font-medium text-slate-700 cursor-pointer active:scale-95 touch-manipulation">💼 Business {isTargetCompleted("BUSINESS") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 12.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 min-h-[44px] bg-zinc-100 border border-zinc-400 rounded-lg text-center text-[11px] font-medium text-zinc-700 cursor-pointer active:scale-95 touch-manipulation">⚙️ Mech. Room {isTargetCompleted("MECHANICAL") && '⭐'}</button>
                      </div>

                      <div className="flex flex-col gap-1.5 sm:gap-2">
                        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-slate-400">Right Wing & Admin</span>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 13.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 min-h-[44px] bg-red-50 border border-red-400 rounded-xl text-center text-xs font-bold text-red-700 cursor-pointer active:scale-95 touch-manipulation">🚨 Emergency {isTargetCompleted("EMERGENCY") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 15.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 min-h-[44px] bg-slate-100 border border-slate-400 rounded-lg text-center text-[11px] font-medium text-slate-700 cursor-pointer active:scale-95 touch-manipulation">🏥 Hospital {isTargetCompleted("HOSPITAL") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 14.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 min-h-[44px] bg-slate-100 border border-slate-400 rounded-lg text-center text-[11px] font-medium text-slate-700 cursor-pointer active:scale-95 touch-manipulation">👔 Admin Offices {isTargetCompleted("ADMIN") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 16.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 min-h-[44px] bg-slate-100 border border-slate-400 rounded-lg text-center text-[11px] font-medium text-slate-700 cursor-pointer active:scale-95 touch-manipulation">📣 Marketing {isTargetCompleted("COMMUNITY") && '⭐'}</button>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-2 mt-0.5">
                      <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Facility Ground Operations</span>
                      <button onClick={() => { const i = tourStops.findIndex(s => s.id === 17.0); if (i !== -1) setCurrentStepIndex(i); }} className="w-full p-2.5 min-h-[44px] bg-zinc-800 border border-zinc-900 rounded-xl text-center text-xs font-bold text-white cursor-pointer active:scale-95 flex items-center justify-center gap-2 shadow-sm touch-manipulation">
                        🛠️ Maintenance Support Crew {isTargetCompleted("MAINTENANCE") && '⭐'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <button 
                      onClick={() => setAppMode('careerQuiz')} 
                      disabled={completedStops.length < totalRoundsCount} 
                      className={`w-full min-h-[48px] py-3 rounded-xl font-bold text-xs sm:text-sm text-center uppercase transition-all duration-300 active:scale-95 touch-manipulation ${completedStops.length >= totalRoundsCount ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white animate-pulse cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                      {completedStops.length >= totalRoundsCount ? '🎓 Claim Graduation Badge!' : `🔒 Complete All ${completedStops.length}/${totalRoundsCount} Rounds to Graduate`}
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 3: Career Matchmaker Quiz */}
              {appMode === 'careerQuiz' && (
                <div className="flex-1 bg-indigo-50 p-4 sm:p-6 flex flex-col justify-between h-full overflow-y-auto">
                  <div className="text-center my-auto">
                    <span className="text-xs uppercase bg-indigo-200 text-indigo-800 px-3 py-1 rounded-full font-bold">Career Explorer Quiz</span>
                    <h2 className="text-base sm:text-lg font-black text-slate-800 mt-3 sm:mt-4 px-2">{matchmakerQuestions[currentQuizQuestion].q}</h2>
                  </div>
                  <div className="flex flex-col gap-2.5 my-auto max-h-[420px] p-1">
                    {shuffledCareerOptions.map((opt, idx) => (
                      <button key={idx} onClick={() => handleCareerAnswer(opt.type)} className="w-full min-h-[52px] p-3.5 bg-white active:bg-indigo-100 border-2 border-indigo-400 font-bold text-xs text-slate-700 rounded-2xl shadow-sm text-left transition-all active:scale-95 cursor-pointer touch-manipulation">
                        {opt.text}
                      </button>
                    ))}
                  </div>
                  <div className="text-center text-xs text-indigo-400 font-bold pb-1">Question {currentQuizQuestion + 1} of {matchmakerQuestions.length}</div>
                </div>
              )}

              {/* MODE 4: Character / Avatar Builder */}
              {appMode === 'avatarBuilder' && (
                <div className="flex-1 bg-slate-100 p-3 sm:p-4 flex flex-col justify-between overflow-y-auto h-full">
                  <div className="text-center mb-1">
                    <span className="text-[10px] uppercase font-black text-indigo-600 bg-indigo-100 px-2.5 py-0.5 rounded-full tracking-wider">Step 2: Security Credentials</span>
                    <h2 className="text-sm font-extrabold text-slate-800 mt-0.5">Finalize Official ID Badge</h2>
                  </div>

                  <div className="w-full max-w-[340px] aspect-[340/215] rounded-2xl shadow-xl border border-slate-300 mx-auto my-auto overflow-hidden relative flex-shrink-0 bg-cover bg-center select-none" style={{ backgroundImage: `url(${MASTER_BADGE_BG})` }}>
                    <div className="absolute top-[24%] left-[4.4%] w-[26.4%] h-[50.2%] rounded-lg overflow-hidden flex items-center justify-center">
                      <img 
                        src={getDynamicArtwork()} 
                        alt="Official Turtle Character Avatar" 
                        className="w-full h-full object-contain" 
                      />
                    </div>

                    <div className="absolute top-[22%] left-[35%] right-[4.4%] text-center">
                      <h2 className="text-xl sm:text-3xl font-black text-[#0f2d59] tracking-tighter uppercase truncate leading-none">
                        {childName || "EXPLORER"}
                      </h2>
                    </div>

                    <div className="absolute top-[44%] left-[35%] right-[4.4%] text-center">
                      <div className="text-[#d93856] font-black text-[11px] sm:text-[13px] uppercase tracking-wider leading-none truncate">
                        {finalCareer ? finalCareer.toUpperCase().replace('PATTERSON ', '') : "ADVENTURER"}
                      </div>
                    </div>

                    <div className="absolute bottom-[13%] left-[44.7%] leading-none text-left">
                      <span className="text-[8px] sm:text-[9px] font-mono font-black text-[#d93856] tracking-wide block">
                        {assignedPin}
                      </span>
                    </div>

                    <div className="absolute bottom-[13%] left-[66%] leading-none text-left">
                      <span className="text-[7px] sm:text-[8px] font-mono font-bold text-slate-500 tracking-tight block">
                        {getTodayFormatted()}
                      </span>
                    </div>
                  </div>

                  <button onClick={submitBadgeOrder} disabled={submittingBadge} className="w-full min-h-[48px] bg-gradient-to-r from-emerald-600 to-teal-600 active:from-emerald-700 active:to-teal-700 text-white font-black py-3 rounded-xl shadow-lg text-xs uppercase tracking-wider cursor-pointer active:scale-95 transition-all touch-manipulation my-auto">
                    {submittingBadge ? '🖨️ Transmitting to Smart-21 Spooler...' : '🔒 Authorize & Print CR-80 ID Card ➔'}
                  </button>
                </div>
              )}

              {/* MODE 5: Badge Print Queue Success Splash Screen */}
              {appMode === 'badgeSuccess' && (
                <div className="flex-1 bg-gradient-to-b from-emerald-50 to-teal-100 p-6 flex flex-col justify-center items-center text-center h-full">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500 rounded-full text-white flex items-center justify-center text-3xl sm:text-4xl shadow-xl animate-bounce mb-4 sm:mb-6">🎉</div>
                  <h2 className="text-xl sm:text-2xl font-black text-emerald-800">Badge Ordered!</h2>
                  <p className="text-slate-600 text-xs sm:text-sm font-medium mt-2 sm:mt-3 px-2 leading-relaxed">
                    Awesome job, <strong>{childName}</strong>! Your customized layout has been pushed to the clinic queue under Key: <strong>{assignedPin}</strong>.
                  </p>
                  <button onClick={forceGlobalReset} className="mt-6 sm:mt-8 min-h-[48px] bg-slate-800 active:bg-slate-900 text-white text-xs font-bold py-3 px-6 rounded-xl shadow uppercase tracking-wide cursor-pointer active:scale-95 transition-all touch-manipulation">
                    Start a New Tour 🔄
                  </button>
                </div>
              )}

              {/* MODE 6: Interactive Character Memory Mini-Game Arcade (Emoji-Free) */}
              {appMode === 'gamesHub' && (
                <div className="flex-1 bg-gradient-to-b from-indigo-900 to-slate-900 p-4 flex flex-col justify-between h-full text-white overflow-y-auto">
                  <div className="text-center mt-1">
                    <span className="text-3xl">🧩</span>
                    <h2 className="text-base font-black tracking-wide">Turtle Character Memory Match</h2>
                    <p className="text-[10px] text-indigo-200">Tap cards to find matching character avatar pairs!</p>
                  </div>

                  {!gameWon ? (
                    <div className="grid grid-cols-4 gap-2 my-auto max-w-[280px] mx-auto w-full">
                      {memoryDeck.map((card, idx) => {
                        const isFlipped = flippedIndices.includes(idx) || matchedPairs.includes(idx);
                        return (
                          <button
                            key={idx}
                            onClick={() => handleCardClick(idx)}
                            className={`aspect-square rounded-xl font-bold text-2xl flex items-center justify-center shadow-md transition-all active:scale-95 touch-manipulation cursor-pointer overflow-hidden ${
                              isFlipped 
                                ? 'bg-white rotate-0' 
                                : 'bg-indigo-600/80 border-2 border-indigo-400/50 text-transparent'
                            }`}
                          >
                            {isFlipped ? (
                              <img src={card.icon} alt="Character Card" className="w-full h-full object-contain p-1" />
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
                      <h3 className="text-lg font-black text-emerald-300">Matching Master!</h3>
                      <p className="text-xs text-indigo-100 mt-1">You found all the character avatar pairs!</p>
                      <button 
                        onClick={startNewMemoryGame}
                        className="mt-4 bg-emerald-500 active:bg-emerald-600 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow uppercase tracking-wider active:scale-95 touch-manipulation cursor-pointer"
                      >
                        Play Again 🔄
                      </button>
                    </div>
                  )}

                  <button onClick={() => setAppMode('tour')} className="w-full min-h-[44px] bg-white/20 active:bg-white/30 text-white font-bold py-2 rounded-xl text-xs uppercase shadow-md cursor-pointer active:scale-95 transition-all touch-manipulation">
                    Return to Map ➔
                  </button>
                </div>
              )}

              {/* MODE 7: Look Up Existing Badge */}
              {appMode === 'viewBadge' && (
                <div className="flex-1 bg-slate-100 p-3 sm:p-4 flex flex-col justify-between overflow-y-auto h-full">
                  <div className="text-center mb-1">
                    <span className="text-xl">🪪</span>
                    <h2 className="text-sm sm:text-md font-extrabold text-slate-800 mt-0.5">Staff Credential Retrieval</h2>
                    <p className="text-[11px] text-slate-500">Type your unique TUR code or your name</p>
                  </div>

                  {!foundBadge ? (
                    <div className="bg-white rounded-2xl p-4 shadow-md border border-slate-200 my-auto flex flex-col gap-3">
                      <input 
                        type="text" 
                        placeholder="ENTER NAME OR CODE (e.g. TUR-123)" 
                        value={lookupValue} 
                        onChange={(e) => setLookupValue(e.target.value.toUpperCase())} 
                        className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-3 font-black text-slate-900 text-center text-xs sm:text-sm focus:border-indigo-500 focus:outline-none tracking-wide placeholder:text-slate-300"
                      />
                      {searchError && <p className="text-rose-600 text-[11px] font-bold text-center">{searchError}</p>}
                      <button onClick={handleLookupBadge} className="w-full min-h-[48px] bg-indigo-600 active:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow active:scale-95 cursor-pointer touch-manipulation">
                        Search Database ➔
                      </button>
                    </div>
                  ) : (
                    <div className="my-auto flex flex-col gap-3">
                      <div className="w-full max-w-[340px] aspect-[340/215] rounded-2xl shadow-xl border border-slate-300 mx-auto overflow-hidden relative bg-cover bg-center select-none" style={{ backgroundImage: `url(${MASTER_BADGE_BG})` }}>
                        <div className="absolute top-[24%] left-[4.4%] w-[26.4%] h-[50.2%] rounded-lg overflow-hidden flex items-center justify-center">
                          <img 
                            src={getDynamicArtwork(foundBadge.career)} 
                            alt="Database Character Avatar" 
                            className="w-full h-full object-contain" 
                          />
                        </div>

                        <div className="absolute top-[22%] left-[35%] right-[4.4%] text-center">
                          <h2 className="text-xl sm:text-3xl font-black text-[#0f2d59] tracking-tighter uppercase truncate leading-none">
                            {foundBadge.name}
                          </h2>
                        </div>

                        <div className="absolute top-[44%] left-[35%] right-[4.4%] text-center">
                          <div className="text-[#d93856] font-black text-[11px] sm:text-[13px] uppercase tracking-wider leading-none truncate">
                            {foundBadge.career ? foundBadge.career.toUpperCase().replace('PATTERSON ', '') : "STAFF EXPLORER"}
                          </div>
                        </div>

                        <div className="absolute bottom-[13%] left-[44.7%] leading-none text-left">
                          <span className="text-[8px] sm:text-[9px] font-mono font-black text-[#d93856] tracking-wide block">
                            {foundBadge.pin}
                          </span>
                        </div>

                        <div className="absolute bottom-[13%] left-[66%] leading-none text-left">
                          <span className="text-[7px] sm:text-[8px] font-mono font-bold text-slate-500 tracking-tight block">
                            {foundBadge.date}
                          </span>
                        </div>
                      </div>

                      <button onClick={() => { setFoundBadge(null); setLookupValue(''); }} className="mx-auto text-xs font-bold text-slate-500 underline cursor-pointer active:opacity-75 touch-manipulation">
                        Search Another Code
                      </button>
                    </div>
                  )}

                  <button onClick={() => setAppMode('tour')} className="w-full min-h-[44px] bg-slate-800 active:bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs uppercase shadow-md mt-1 cursor-pointer active:scale-95 touch-manipulation">
                    Return to Map Hub
                  </button>
                </div>
              )}
            </>
          )}

        </div>

        {/* STICKY BOTTOM NAVIGATION BAR */}
        <div className="absolute bottom-0 left-0 right-0 h-[65px] bg-white border-t border-slate-200 grid grid-cols-5 items-center px-1 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] pb-safe">
          <button 
            onClick={() => { if(!isNameConfirmed) return; setAppMode('tour'); const idx = tourStops.findIndex(s => s.type === 'map'); if (idx !== -1) setCurrentStepIndex(idx); }} 
            className={`flex flex-col items-center justify-center gap-0.5 h-full transition-all active:scale-90 touch-manipulation ${!isNameConfirmed ? 'opacity-20 cursor-not-allowed' : ''} ${appMode === 'tour' && currentStep?.type === 'map' ? 'text-indigo-600 font-black' : 'text-slate-400'}`}
          >
            <span className="text-base">🗺️</span>
            <span className="text-[9px] font-bold tracking-tighter">Map</span>
          </button>
          
          <button 
            onClick={() => {
              if(!isNameConfirmed) return;
              if (completedStops.length < totalRoundsCount) {
                alert(`🔒 Locked! Unlock all ${totalRoundsCount} maps first! (${completedStops.length}/${totalRoundsCount} completed)`);
                return;
              }
              setAppMode('careerQuiz');
            }} 
            className={`flex flex-col items-center justify-center gap-0.5 h-full transition-all active:scale-90 touch-manipulation ${(!isNameConfirmed || completedStops.length < totalRoundsCount) ? 'opacity-30' : ''} ${appMode === 'careerQuiz' || appMode === 'avatarBuilder' || appMode === 'badgeSuccess' ? 'text-indigo-600 font-black' : 'text-slate-400'}`}
          >
            <span className="text-base">🎓</span>
            <span className="text-[9px] font-bold tracking-tighter">Grad Quiz</span>
          </button>

          <button 
            onClick={() => { if(!isNameConfirmed) return; setAppMode('gamesHub'); }} 
            className={`flex flex-col items-center justify-center gap-0.5 h-full transition-all active:scale-90 touch-manipulation ${!isNameConfirmed ? 'opacity-20 cursor-not-allowed' : ''} ${appMode === 'gamesHub' ? 'text-indigo-600 font-black' : 'text-slate-400'}`}
          >
            <span className="text-base">🎮</span>
            <span className="text-[9px] font-bold tracking-tighter">Arcade</span>
          </button>

          <button 
            onClick={() => { if(!isNameConfirmed) return; setAppMode('viewBadge'); setFoundBadge(null); setLookupValue(''); setSearchError(''); }} 
            className={`flex flex-col items-center justify-center gap-0.5 h-full transition-all active:scale-90 touch-manipulation ${!isNameConfirmed ? 'opacity-20 cursor-not-allowed' : ''} ${appMode === 'viewBadge' ? 'text-indigo-600 font-black' : 'text-slate-400'}`}
          >
            <span className="text-base">🪪</span>
            <span className="text-[9px] font-bold tracking-tighter">My Badge</span>
          </button>

          <button 
            onClick={forceGlobalReset} 
            className="flex flex-col items-center justify-center gap-0.5 h-full text-slate-400 active:text-rose-600 transition-all active:scale-90 touch-manipulation"
          >
            <span className="text-base">🔄</span>
            <span className="text-[9px] font-bold tracking-tighter">Reset</span>
          </button>
        </div>

      </div>
    </div>
  );
}