import { useState, useEffect } from 'react';
import Airtable from 'airtable';

const base = new Airtable({ 
  apiKey: import.meta.env.VITE_AIRTABLE_PAT 
}).base(import.meta.env.VITE_AIRTABLE_BASE_ID);

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
  const [appMode, setAppMode] = useState('tour'); // 'tour', 'careerQuiz', 'avatarBuilder', 'badgeSuccess', 'gamesHub', 'viewBadge'
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

  // Deep 25-Question Matchmaker Diagnostic Data
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

  // Dynamic Content Fetcher & Image Asset Preloader Engine
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

        // Asset Performance Preloader
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

        setTourStops(formattedStops);
        setLoading(false);
      });
  }, []);

  const currentStep = tourStops[currentStepIndex];

  // Identifies exactly how many operational stamp challenges exist on the interactive map
  const totalRoundsCount = tourStops.filter(s => s.id >= 4.0 && s.id <= 17.0).length;

  // Pulls a dynamic character illustration asset from your Airtable list to display inside the frame
  const getDynamicArtwork = () => {
    if (finalCareer.includes('Tech')) {
      const stop = tourStops.find(s => s.title.toUpperCase().includes('LAB') || s.title.toUpperCase().includes('MECHANICAL'));
      return stop?.character || 'https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?auto=format&fit=crop&w=120&q=80';
    }
    if (finalCareer.includes('Chef') || finalCareer.includes('Wellness')) {
      const stop = tourStops.find(s => s.title.toUpperCase().includes('CAFE'));
      return stop?.character || 'https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?auto=format&fit=crop&w=120&q=80';
    }
    // Default Fallback: Marketing Turtle/Lobby Artwork
    const defaultStop = tourStops.find(s => s.title.toUpperCase().includes('MARKETING') || s.title.toUpperCase().includes('CLINIC') || s.id === 16.0);
    return defaultStop?.character || 'https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?auto=format&fit=crop&w=120&q=80';
  };

  // Setup Initial Arrival Name Gate & Generate TUR-### Unique Key
  const handleNameActivation = () => {
    if (!childName.trim()) return alert("Please drop in your name!");
    const randomThreeDigit = Math.floor(100 + Math.random() * 900);
    setAssignedPin(`TUR-${randomThreeDigit}`);
    setIsNameConfirmed(true);
  };

  // Shuffles Career Question Options
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
  // If the user is currently looking at the character dialogue and a question exists, NOW trigger the quiz phase
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
  
  // Moving between steps or back to the map always guarantees the quiz panel is hidden initially
  const nextIndex = tourStops.findIndex(stop => stop.id === currentStep.nextStepIndex);
  if (nextIndex !== -1) {
    setCurrentStepIndex(nextIndex);
  } else {
    const mapIdx = tourStops.findIndex(s => s.type === 'map');
    if (mapIdx !== -1) setCurrentStepIndex(mapIdx);
  }
  
  // CRITICAL RESET FIX: Always hide the quiz box when landing on a fresh stop!
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
        clinical: 'Patterson Star Doctor/Nurse',
        technical: 'Expert Hospital Tech Wizard',
        creative: 'Master Wellness Chef'
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

      setFoundBadge({
        name: data["Child Name"],
        career: data["Assigned Career"],
        avatarHat: hat,
        avatarProp: prop,
        pin: data["Notes"] || "TUR-AUTH"
      });
    });
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
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="text-center font-bold text-slate-600 animate-pulse">🐢 Waking up the hospital turtles...</div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-sm h-[820px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border-8 border-gray-800 relative">
        
        {/* HEADER BAR */}
        <div className="bg-slate-800 text-white px-4 py-3 font-bold tracking-wide shadow-md flex justify-between items-center gap-2">
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
            <div className="flex-1 bg-gradient-to-b from-blue-900 to-indigo-950 p-6 flex flex-col justify-between h-full text-white text-center">
              <div className="my-auto flex flex-col items-center gap-4">
                <div className="text-5xl animate-bounce">🐢</div>
                <h1 className="text-2xl font-black tracking-wide">Patterson Health Adventure</h1>
                <p className="text-xs text-indigo-200 px-4 leading-relaxed">
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
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Start Adventure ➔
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-indigo-400 font-bold">Secure Clinic Device Profile Pipeline</div>
            </div>
          ) : (
            <>
              {/* MODE 1: Standard Tour System */}
              {appMode === 'tour' && currentStep.type === 'tour' && (
                <div className="flex-1 bg-no-repeat relative flex flex-col justify-end p-4 h-full" style={{ backgroundImage: `url(${currentStep.background})`, backgroundPosition: currentStep.bgPosition, backgroundSize: currentStep.bgSize }}>
                  {!quizActive && (
                    <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                      <img src={currentStep.character} alt={currentStep.characterName} className="w-4/5 h-auto object-contain mt-12" />
                    </div>
                  )}
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-gray-200 z-10 text-center mb-2 min-h-[160px] flex flex-col justify-center">
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
                        <p className="text-sm font-medium text-gray-800 mb-2">{currentStep.question}</p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {shuffledStopOptions.map((opt, i) => {
                            let buttonStyle = "bg-slate-50 border border-slate-300 text-slate-700 hover:bg-slate-100";
                            if (quizFeedback !== null) {
                              if (opt.correct) {
                                buttonStyle = "bg-emerald-50 border border-emerald-400 text-emerald-700 pointer-events-none";
                              } else {
                                buttonStyle = "bg-rose-50 border border-rose-400 text-rose-700 pointer-events-none";
                              }
                            }
                            return (
                              <button key={i} onClick={() => handleAnswerSubmit(opt.correct)} className={`p-2 font-bold text-xs rounded-xl cursor-pointer transition-all ${buttonStyle}`}>
                                {opt.text}
                              </button>
                            );
                          })}
                        </div>

                        {quizFeedback === 'wrong' && (
                          <div className="text-center mt-1">
                            <button onClick={() => setQuizFeedback(null)} className="text-[10px] bg-slate-700 text-white px-2.5 py-1 rounded-lg">Retry Choice 🔄</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {(!quizActive || quizFeedback === 'correct') && (
                    <button onClick={handleNextAction} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl z-10 uppercase tracking-wider cursor-pointer shadow-md hover:bg-emerald-700">
                      {quizFeedback === 'correct' ? 'Collect Stamp & Map Hub ➔' : currentStep.buttonText}
                    </button>
                  )}
                </div>
              )}

              {/* MODE 2: Map System */}
              {appMode === 'tour' && currentStep.type === 'map' && (
                <div className="flex-1 bg-slate-50 p-4 flex flex-col justify-between overflow-y-auto h-full">
                  <div className="text-center mb-2 flex justify-between items-center bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-left">
                      <h2 className="text-sm font-extrabold text-slate-800">Agent: {childName}</h2>
                      <p className="text-[10px] text-slate-400">Unlock stamps at all {totalRoundsCount} locations!</p>
                    </div>
                    <span className="text-xs bg-indigo-100 text-indigo-700 font-black px-2.5 py-1 rounded-lg border border-indigo-300 font-mono tracking-wider">
                      {assignedPin}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3 my-auto">
                    <div className="border-b border-gray-200 pb-2">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Main Hallway</span>
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 4.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-blue-50 border border-blue-400 rounded-lg text-center text-xs font-bold text-blue-700 cursor-pointer relative active:scale-95">🏃‍♂️ PT {isTargetCompleted("PT") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 5.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-blue-50 border border-blue-400 rounded-lg text-center text-xs font-bold text-blue-700 cursor-pointer relative active:scale-95">🩺 Clinic {isTargetCompleted("CLINIC") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 6.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-purple-50 border border-purple-400 rounded-lg text-center text-xs font-bold text-purple-700 cursor-pointer relative active:scale-95">🧠 Behav. {isTargetCompleted("BEHAVIORAL") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 7.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-blue-50 border border-blue-400 rounded-lg text-center text-xs font-bold text-blue-700 cursor-pointer relative active:scale-95">🔬 Lab {isTargetCompleted("LAB") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 8.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-blue-50 border border-blue-400 rounded-lg text-center text-xs font-bold text-blue-700 cursor-pointer relative active:scale-95">🏥 Surg. {isTargetCompleted("SURGERY") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 9.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-blue-50 border border-blue-400 rounded-lg text-center text-xs font-bold text-blue-700 cursor-pointer relative active:scale-95">🩻 Radio. {isTargetCompleted("RADIOLOGY") && '⭐'}</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Left Wing & Tech</span>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 10.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2.5 bg-amber-50 border border-amber-500 rounded-xl text-center text-xs font-bold text-amber-800 cursor-pointer relative active:scale-95">☕ Cafe {isTargetCompleted("CAFE") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 11.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-slate-100 border border-slate-400 rounded-lg text-center text-[11px] font-medium text-slate-700 cursor-pointer relative active:scale-95">💼 Business {isTargetCompleted("BUSINESS") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 12.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-zinc-100 border border-zinc-400 rounded-lg text-center text-[11px] font-medium text-zinc-700 cursor-pointer relative active:scale-95">⚙️ Mech. Room {isTargetCompleted("MECHANICAL") && '⭐'}</button>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Right Wing & Admin</span>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 13.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2.5 bg-red-50 border border-red-400 rounded-xl text-center text-xs font-bold text-red-700 cursor-pointer relative active:scale-95">🚨 Emergency {isTargetCompleted("EMERGENCY") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 15.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-slate-100 border border-slate-400 rounded-lg text-center text-[11px] font-medium text-slate-700 cursor-pointer relative active:scale-95">🏨 Hospital Beds {isTargetCompleted("HOSPITAL") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 14.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-slate-100 border border-slate-400 rounded-lg text-center text-[11px] font-medium text-slate-700 cursor-pointer relative active:scale-95">👔 Admin Offices {isTargetCompleted("ADMIN") && '⭐'}</button>
                        <button onClick={() => { const i = tourStops.findIndex(s => s.id === 16.0); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-slate-100 border border-slate-400 rounded-lg text-center text-[11px] font-medium text-slate-700 cursor-pointer relative active:scale-95">📣 Marketing {isTargetCompleted("COMMUNITY") && '⭐'}</button>
                      </div>
                    </div>

                    {/* OUTSIDE / OPERATIONS SECTION */}
                    <div className="border-t border-gray-200 pt-2 mt-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Facility Ground Operations</span>
                      <button onClick={() => { const i = tourStops.findIndex(s => s.id === 17.0); if (i !== -1) setCurrentStepIndex(i); }} className="w-full p-2.5 bg-zinc-800 border border-zinc-900 rounded-xl text-center text-xs font-bold text-white cursor-pointer relative active:scale-95 flex items-center justify-center gap-2 shadow-sm">
                        🛠️ Maintenance Support Crew {isTargetCompleted("MAINTENANCE") && '⭐'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 border-t border-gray-200">
                    <button 
                      onClick={() => setAppMode('careerQuiz')} 
                      disabled={completedStops.length < totalRoundsCount} 
                      className={`w-full py-3 rounded-xl font-bold text-sm text-center uppercase transition-all duration-300 ${completedStops.length >= totalRoundsCount ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white animate-pulse cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    >
                      {completedStops.length >= totalRoundsCount ? '🎓 Claim Graduation Badge!' : `🔒 Complete All ${completedStops.length}/${totalRoundsCount} Rounds to Graduate`}
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 3: Career Matchmaker Quiz */}
              {appMode === 'careerQuiz' && (
                <div className="flex-1 bg-indigo-50 p-6 flex flex-col justify-between h-full">
                  <div className="text-center">
                    <span className="text-xs uppercase bg-indigo-200 text-indigo-800 px-3 py-1 rounded-full font-bold">Career Explorer Quiz</span>
                    <h2 className="text-lg font-black text-slate-800 mt-4">{matchmakerQuestions[currentQuizQuestion].q}</h2>
                  </div>
                  <div className="flex flex-col gap-3 my-auto overflow-y-auto max-h-[460px] p-1">
                    {shuffledCareerOptions.map((opt, idx) => (
                      <button key={idx} onClick={() => handleCareerAnswer(opt.type)} className="w-full p-4 bg-white hover:bg-indigo-100 border-2 border-indigo-400 font-bold text-xs text-slate-700 rounded-2xl shadow-sm text-left transition-all active:scale-95 cursor-pointer mb-2">
                        {opt.text}
                      </button>
                    ))}
                  </div>
                  <div className="text-center text-xs text-indigo-400 font-bold">Question {currentQuizQuestion + 1} of {matchmakerQuestions.length}</div>
                </div>
              )}

              {/* MODE 4: Character / Avatar Builder */}
              {appMode === 'avatarBuilder' && (
                <div className="flex-1 bg-slate-100 p-4 flex flex-col justify-between overflow-y-auto h-full">
                  <div className="text-center mb-1">
                    <span className="text-[10px] uppercase font-black text-indigo-600 bg-indigo-100 px-2.5 py-0.5 rounded-full tracking-wider">Step 2: Security Credentials</span>
                    <h2 className="text-sm font-extrabold text-slate-800 mt-1">Finalize Official ID Badge</h2>
                  </div>

                  {/* 🪪 UPGRADED HORIZONTAL HIGH-FIDELITY BADGE ENGRAVER PREVIEW */}
                  <div className="w-[340px] h-[215px] bg-white rounded-2xl shadow-xl border border-slate-300 mx-auto my-auto overflow-hidden flex flex-col relative flex-shrink-0 text-slate-800 font-sans tracking-normal select-none">
                    
                    {/* TOP BADGE SLOT PUNCH SIMULATOR OUTLINE */}
                    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-slate-200 border border-slate-300 rounded-full opacity-60 z-30"></div>

                    {/* MASTER BRANDING ROW */}
                    <div className="flex justify-between items-start px-4 pt-5 pb-1 bg-white relative z-10 border-b border-slate-100">
                      <div className="flex flex-col text-left leading-tight">
                        <span className="text-[13px] font-black tracking-tighter text-[#0b2545] font-serif">Patterson</span>
                        <span className="text-[8px] font-bold text-[#1f7a8c] uppercase tracking-widest -mt-0.5">Health Center</span>
                      </div>
                      <div className="text-right flex flex-col items-end leading-none">
                        <span className="text-[10px] font-black text-[#588157] tracking-widest uppercase flex items-center gap-0.5">★ TURTLE TEAM ★</span>
                        <span className="text-[6px] font-extrabold text-[#0b2545] uppercase tracking-widest mt-0.5">HONORARY MEMBER</span>
                      </div>
                    </div>

                    {/* CORE SPLIT WORKSPACE INTERFACE */}
                    <div className="flex-1 flex px-4 items-center gap-4 bg-white relative">
                      {/* Left: Professional Illustrated Portrait Window Frame */}
                      <div className="w-[85px] h-[100px] bg-slate-50 border-2 border-[#cc2936] rounded-xl shadow-md relative overflow-visible flex items-center justify-center flex-shrink-0 bg-radial from-white to-slate-100">
                        <img 
                          src={getDynamicArtwork()} 
                          alt="Explorer Avatar" 
                          className="w-full h-full object-contain rounded-lg p-1"
                        />
                        {/* Custom Cosmetic Accent Layer Anchors */}
                        <span className="absolute -top-[18px] left-0 right-0 text-2xl text-center drop-shadow-md z-30 animate-pulse">{avatarHat.split(' ')[0]}</span>
                        <span className="absolute -bottom-1.5 -right-2.5 bg-[#0b2545] text-white rounded-full w-[24px] h-[24px] flex items-center justify-center shadow-md text-sm border-2 border-white font-bold z-30">{avatarProp.split(' ')[0]}</span>
                      </div>

                      {/* Right: Identity Metadata Cluster */}
                      <div className="flex-1 flex flex-col justify-center text-center pl-1">
                        <h2 className="text-2xl font-black text-[#0b2545] tracking-tight uppercase leading-none max-w-[170px] mx-auto truncate">
                          {childName || "EXPLORER"}
                        </h2>
                        
                        <div className="w-12 h-[2px] bg-[#cc2936] mx-auto my-1.5 rounded-full"></div>

                        <div className="text-[#cc2936] font-black text-[12px] uppercase tracking-wide leading-none max-w-[170px] mx-auto truncate">
                          {finalCareer ? finalCareer.toUpperCase().replace('PATTERSON ', '') : "STAFF MEMBER"}
                        </div>
                        
                        <div className="mt-2 text-[5px] text-slate-400 font-bold uppercase tracking-widest">
                          HONORARY PATTERSON HEALTH CENTER
                        </div>
                        <div className="text-[#588157] font-black text-[7px] tracking-wider uppercase leading-none mt-0.5">
                          ★ CORRIDOR ADVENTURER ★
                        </div>
                      </div>

                      {/* EMBOSSED GOLD MEDALLION BADGE SEAL ROSETTE */}
                      <div className="absolute right-2 bottom-0 w-[42px] h-[42px] bg-gradient-to-tr from-[#b8860b] via-[#ffd700] to-[#daa520] rounded-full shadow-md border border-[#b8860b] flex flex-col items-center justify-center p-0.5 text-center leading-none opacity-90 scale-95 select-none transform rotate-3">
                        <span className="text-[4px] font-black text-[#4a3600] uppercase tracking-tighter">OFFICIAL</span>
                        <span className="text-[6px] font-black text-[#4a3600] tracking-tighter my-0.5">TURTLE</span>
                        <span className="text-[4px] font-black text-[#4a3600] uppercase tracking-tighter">TEAM</span>
                      </div>
                    </div>

                    {/* LOWER TRACKING BAR METRICS */}
                    <div className="h-8 px-4 flex items-center justify-between bg-slate-50 border-t border-slate-100 relative z-20">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px]">🪪</span>
                        <div className="flex flex-col text-left leading-none">
                          <span className="text-[5px] font-bold text-slate-400 uppercase tracking-tighter">BADGE ID</span>
                          <span className="text-[9px] font-mono font-black text-[#cc2936] tracking-wider">{assignedPin}</span>
                        </div>
                      </div>
                      
                      <span className="text-[6px] font-mono font-bold text-slate-400 border border-slate-300 rounded-md px-1.5 py-0.5 bg-white shadow-3xs uppercase">
                        SYS LOGGED
                      </span>
                    </div>

                    {/* BLUE CORE VALUES SLOGAN STRIP */}
                    <div className="bg-[#0b2545] text-white text-[6px] font-bold py-1 flex justify-around items-center uppercase tracking-widest px-2 relative z-20">
                      <span>🤍 BE KIND</span>
                      <span>🌱 BE CURIOUS</span>
                      <span>👥 HELP OTHERS</span>
                    </div>
                  </div>

                  {/* Selector Controls */}
                  <div className="flex flex-col gap-2 mt-2 mb-2">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Select Custom Hat Option</label>
                      <div className="grid grid-cols-2 gap-1">
                        {['🎓 Graduate Cap', '🤠 Cowboy Hat', '🧑‍🍳 Chef Hat', '👑 Golden Crown'].map(h => (
                          <button key={h} onClick={() => setAvatarHat(h)} className={`py-1 px-2 text-xs font-bold rounded-lg border text-center transition-all ${avatarHat === h ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white text-slate-600'}`}>{h}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Select Specialized Tool Accessory</label>
                      <div className="grid grid-cols-2 gap-1">
                        {['🩺 Stethoscope', '🔬 Microscope', '🩹 Bandages', '🩻 Shell X-Ray'].map(p => (
                          <button key={p} onClick={() => setAvatarProp(p)} className={`py-1 px-2 text-xs font-bold rounded-lg border text-center transition-all ${avatarProp === p ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white text-slate-600'}`}>{p}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button onClick={submitBadgeOrder} disabled={submittingBadge} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black py-3 rounded-xl shadow-lg text-xs uppercase tracking-wider">
                    {submittingBadge ? '🖨️ Transmitting to Smart-21 Spooler...' : '🔒 Authorize & Print CR-80 ID Card ➔'}
                  </button>
                </div>
              )}

              {/* MODE 5: Badge Print Queue Success Splash Screen */}
              {appMode === 'badgeSuccess' && (
                <div className="flex-1 bg-gradient-to-b from-emerald-50 to-teal-100 p-6 flex flex-col justify-center items-center text-center h-full">
                  <div className="w-20 h-20 bg-emerald-500 rounded-full text-white flex items-center justify-center text-4xl shadow-xl animate-bounce mb-6">🎉</div>
                  <h2 className="text-2xl font-black text-emerald-800">Badge Ordered!</h2>
                  <p className="text-slate-600 text-sm font-medium mt-3 px-2 leading-relaxed">
                    Awesome job, <strong>{childName}</strong>! Your customized <strong>{finalCareer}</strong> official ID card layout has been sent directly to the front reception desk terminal under Security Key: <strong>{assignedPin}</strong>.
                  </p>
                  <button onClick={forceGlobalReset} className="mt-8 bg-slate-800 text-white text-xs font-bold py-3 px-6 rounded-xl shadow uppercase tracking-wide">
                    Start a New Tour 🔄
                  </button>
                </div>
              )}

              {/* MODE 6: Fun & Games Arcade Hub */}
              {appMode === 'gamesHub' && (
                <div className="flex-1 bg-indigo-900 p-4 flex flex-col justify-between h-full text-white">
                  <div className="text-center mt-4">
                    <span className="text-4xl">🎮</span>
                    <h2 className="text-xl font-black mt-2">Turtle Team Play Zone</h2>
                    <p className="text-xs text-indigo-200 mt-1">Extra mini-games and coloring pages coming soon!</p>
                  </div>
                  <div className="bg-white/10 border border-white/10 rounded-2xl p-6 text-center my-auto">
                    <p className="text-sm font-medium text-indigo-100">🐢 Turtle Shell Memory Matcher</p>
                    <span className="inline-block mt-2 text-[10px] bg-amber-400 text-slate-900 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Under Construction</span>
                  </div>
                  <button onClick={() => setAppMode('tour')} className="w-full bg-white text-indigo-950 font-bold py-2.5 rounded-xl text-xs uppercase shadow-md">
                    Return to Adventure Map ➔
                  </button>
                </div>
              )}

              {/* MODE 7: Look Up Existing Badge */}
              {appMode === 'viewBadge' && (
                <div className="flex-1 bg-slate-100 p-4 flex flex-col justify-between overflow-y-auto h-full">
                  <div className="text-center mb-2">
                    <span className="text-xl">🪪</span>
                    <h2 className="text-md font-extrabold text-slate-800 mt-1">Staff Credential Retrieval</h2>
                    <p className="text-xs text-slate-500">Type your unique TUR code or your name</p>
                  </div>

                  {!foundBadge ? (
                    <div className="bg-white rounded-2xl p-4 shadow-md border border-slate-200 my-auto flex flex-col gap-3">
                      <input 
                        type="text" 
                        placeholder="ENTER NAME OR CODE (e.g. TUR-123)" 
                        value={lookupValue} 
                        onChange={(e) => setLookupValue(e.target.value.toUpperCase())} 
                        className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-3 font-black text-slate-900 text-center text-sm focus:border-indigo-500 focus:outline-none tracking-wide placeholder:text-slate-300"
                      />
                      {searchError && <p className="text-rose-600 text-[11px] font-bold text-center">{searchError}</p>}
                      <button onClick={handleLookupBadge} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider shadow active:scale-95">
                        Search Database ➔
                      </button>
                    </div>
                  ) : (
                    <div className="my-auto flex flex-col gap-4">
                      
                      {/* 🪪 UPGRADED RETRIEVAL DESIGN FRAME CHASSIS */}
                      <div className="w-[340px] h-[215px] bg-white rounded-2xl shadow-xl border border-slate-300 mx-auto overflow-hidden flex flex-col relative text-slate-800 font-sans tracking-normal select-none">
                        
                        {/* TOP SLOT PUNCH SIMULATOR OUTLINE */}
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-slate-200 border border-slate-300 rounded-full opacity-60 z-30"></div>

                        {/* MASTER BRANDING ROW */}
                        <div className="flex justify-between items-start px-4 pt-5 pb-1 bg-white relative z-10 border-b border-slate-100">
                          <div className="flex flex-col text-left leading-tight">
                            <span className="text-[13px] font-black tracking-tighter text-[#0b2545] font-serif">Patterson</span>
                            <span className="text-[8px] font-bold text-[#1f7a8c] uppercase tracking-widest -mt-0.5">Health Center</span>
                          </div>
                          <div className="text-right flex flex-col items-end leading-none">
                            <span className="text-[10px] font-black text-[#588157] tracking-widest uppercase flex items-center gap-0.5">★ TURTLE TEAM ★</span>
                            <span className="text-[6px] font-extrabold text-[#0b2545] uppercase tracking-widest mt-0.5">HONORARY MEMBER</span>
                          </div>
                        </div>

                        {/* MAIN CONTENT SPLIT BLOCK */}
                        <div className="flex-1 flex px-4 items-center gap-4 bg-white relative">
                          <div className="w-[85px] h-[100px] bg-slate-50 border-2 border-[#cc2936] rounded-xl shadow-md relative overflow-visible flex items-center justify-center flex-shrink-0 bg-radial from-white to-slate-100">
                            <img 
                              src={getDynamicArtwork()} 
                              alt="Staff Character illustration" 
                              className="w-full h-full object-contain rounded-lg p-1"
                            />
                            <span className="absolute -top-[18px] left-0 right-0 text-2xl text-center drop-shadow-md z-30">{foundBadge.avatarHat.split(' ')[0]}</span>
                            <span className="absolute -bottom-1.5 -right-2.5 bg-[#0b2545] text-white rounded-full w-[24px] h-[24px] flex items-center justify-center text-xs border-2 border-white font-bold z-30">{foundBadge.avatarProp.split(' ')[0]}</span>
                          </div>

                          <div className="flex-1 flex flex-col justify-center text-center pl-1">
                            <h2 className="text-2xl font-black text-[#0b2545] tracking-tight uppercase leading-none max-w-[170px] mx-auto truncate">
                              {foundBadge.name}
                            </h2>
                            <div className="w-12 h-[2px] bg-[#cc2936] mx-auto my-1.5 rounded-full"></div>
                            <div className="text-[#cc2936] font-black text-[12px] uppercase tracking-wide leading-none max-w-[170px] mx-auto truncate">
                              {foundBadge.career ? foundBadge.career.toUpperCase().replace('PATTERSON ', '') : "STAFF EXPLORER"}
                            </div>
                            
                            <div className="mt-2 text-[5px] text-slate-400 font-bold uppercase tracking-widest">
                              HONORARY PATTERSON HEALTH CENTER
                            </div>
                            <div className="text-[#588157] font-black text-[7px] tracking-wider uppercase leading-none mt-0.5">
                              ★ CORRIDOR ADVENTURER ★
                            </div>
                          </div>

                          {/* EMBOSSED GOLD MEDALLION BADGE SEAL ROSETTE */}
                          <div className="absolute right-2 bottom-0 w-[42px] h-[42px] bg-gradient-to-tr from-[#b8860b] via-[#ffd700] to-[#daa520] rounded-full shadow-md border border-[#b8860b] flex flex-col items-center justify-center p-0.5 text-center leading-none opacity-90 scale-95 select-none transform rotate-3">
                            <span className="text-[4px] font-black text-[#4a3600] uppercase tracking-tighter">OFFICIAL</span>
                            <span className="text-[6px] font-black text-[#4a3600] tracking-tighter my-0.5">TURTLE</span>
                            <span className="text-[4px] font-black text-[#4a3600] uppercase tracking-tighter">TEAM</span>
                          </div>
                        </div>

                        {/* LOWER METRIC FOOTER STRIP */}
                        <div className="h-9 px-4 flex items-center justify-between border-t border-slate-100 bg-slate-50 relative">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 text-[10px]">🪪</span>
                            <div className="flex flex-col text-left leading-none">
                              <span className="text-[5px] font-bold text-slate-400 uppercase tracking-tighter">BADGE ID</span>
                              <span className="text-[9px] font-mono font-black text-[#cc2936] tracking-wider">{foundBadge.pin}</span>
                            </div>
                          </div>
                          
                          <span className="text-[6px] font-mono font-bold text-emerald-600 border border-emerald-300 rounded px-1.5 py-0.5 bg-white shadow-3xs uppercase">
                            Active Card
                          </span>
                        </div>

                        {/* BLUE CORE VALUES SLOGAN BOTTOM BASE STRIP */}
                        <div className="bg-[#0b2545] text-white text-[6px] font-bold py-1 flex justify-around items-center uppercase tracking-widest px-2 select-none">
                          <span>🤍 BE KIND</span>
                          <span>🌱 BE CURIOUS</span>
                          <span>👥 HELP OTHERS</span>
                        </div>
                      </div>

                      <button onClick={() => { setFoundBadge(null); setLookupValue(''); }} className="mx-auto text-xs font-bold text-slate-500 underline">
                        Search Another Code
                      </button>
                    </div>
                  )}

                  <button onClick={() => setAppMode('tour')} className="w-full bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs uppercase shadow-md mt-2">
                    Return to Map Hub
                  </button>
                </div>
              )}
            </>
          )}

        </div>

        {/* STICKY VISUAL BOTTOM NAVIGATION BAR */}
        <div className="absolute bottom-0 left-0 right-0 h-[65px] bg-white border-t border-slate-200 grid grid-cols-5 items-center px-1 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => { if(!isNameConfirmed) return; setAppMode('tour'); const idx = tourStops.findIndex(s => s.type === 'map'); if (idx !== -1) setCurrentStepIndex(idx); }} 
            className={`flex flex-col items-center justify-center gap-0.5 transition-all ${!isNameConfirmed ? 'opacity-20 cursor-not-allowed' : ''} ${appMode === 'tour' && currentStep?.type === 'map' ? 'text-indigo-600 font-black scale-105' : 'text-slate-400'}`}
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
            className={`flex flex-col items-center justify-center gap-0.5 transition-all ${(!isNameConfirmed || completedStops.length < totalRoundsCount) ? 'opacity-30' : ''} ${appMode === 'careerQuiz' || appMode === 'avatarBuilder' || appMode === 'badgeSuccess' ? 'text-indigo-600 font-black scale-105' : 'text-slate-400'}`}
          >
            <span className="text-base">🎓</span>
            <span className="text-[9px] font-bold tracking-tighter">Grad Quiz</span>
          </button>

          <button 
            onClick={() => { if(!isNameConfirmed) return; setAppMode('gamesHub'); }} 
            className={`flex flex-col items-center justify-center gap-0.5 transition-all ${!isNameConfirmed ? 'opacity-20 cursor-not-allowed' : ''} ${appMode === 'gamesHub' ? 'text-indigo-600 font-black scale-105' : 'text-slate-400'}`}
          >
            <span className="text-base">🎮</span>
            <span className="text-[9px] font-bold tracking-tighter">Arcade</span>
          </button>

          <button 
            onClick={() => { if(!isNameConfirmed) return; setAppMode('viewBadge'); setFoundBadge(null); setLookupValue(''); setSearchError(''); }} 
            className={`flex flex-col items-center justify-center gap-0.5 transition-all ${!isNameConfirmed ? 'opacity-20 cursor-not-allowed' : ''} ${appMode === 'viewBadge' ? 'text-indigo-600 font-black scale-105' : 'text-slate-400'}`}
          >
            <span className="text-base">🪪</span>
            <span className="text-[9px] font-bold tracking-tighter">My Badge</span>
          </button>

          <button 
            onClick={forceGlobalReset} 
            className="flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:text-rose-600 transition-all"
          >
            <span className="text-base">🔄</span>
            <span className="text-[9px] font-bold tracking-tighter">Reset</span>
          </button>
        </div>

      </div>
    </div>
  );
}