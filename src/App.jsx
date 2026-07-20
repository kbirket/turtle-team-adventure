import { useState, useEffect } from 'react';
import Airtable from 'airtable';

const base = new Airtable({ 
  apiKey: import.meta.env.VITE_AIRTABLE_PAT 
}).base(import.meta.env.VITE_AIRTABLE_BASE_ID);

export default function App() {
  const [tourStops, setTourStops] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // GAME PROGRESS STATE
  const [completedStops, setCompletedStops] = useState([]);
  const [quizActive, setQuizActive] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [shuffledStopOptions, setShuffledStopOptions] = useState([]);

  // FINALE ENGINE STATE
  const [appMode, setAppMode] = useState('tour'); // 'tour', 'careerQuiz', 'avatarBuilder', 'badgeSuccess'
  const [childName, setChildName] = useState('');
  
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

        setTourStops(formattedStops);
        setLoading(false);
      });
  }, []);

  const currentStep = tourStops[currentStepIndex];

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

  // Shuffles Department Stop Quiz Options
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
      setQuizActive(false);
      setQuizFeedback(null);
    }
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
    if (!childName.trim()) return alert("Please type your name first!");
    setSubmittingBadge(true);

    base('Badge Orders').create([
      {
        fields: {
          "Child Name": childName,
          "Assigned Career": finalCareer,
          "Avatar Choice": `Hat: ${avatarHat} | Item: ${avatarProp}`
        }
      }
    ], (err) => {
      setSubmittingBadge(false);
      if (err) {
        console.error(err);
        alert("Oops! Had trouble sending your order to the printer.");
        return;
      }
      setAppMode('badgeSuccess');
    });
  };

  const isTargetCompleted = (keyword) => {
    return completedStops.some(t => t.toUpperCase().includes(keyword.toUpperCase()));
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
      <div className="w-full max-w-sm h-[800px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border-8 border-gray-800 relative">
        
        {/* HEADER BAR */}
        <div className="bg-slate-800 text-white px-4 py-3 font-bold tracking-wide shadow-md flex justify-between items-center gap-2">
          <span className="truncate text-sm sm:text-base">
            {appMode === 'tour' ? currentStep.title : '🎓 Graduation Center'}
          </span>
          {appMode === 'tour' && (
            <span className="flex-shrink-0 text-xs bg-white/20 px-2 py-0.5 rounded-full whitespace-nowrap">
              📖 {completedStops.length} Stamps
            </span>
          )}
        </div>

        {/* MODE 1: Standard Tour System */}
        {appMode === 'tour' && currentStep.type === 'tour' && (
          <div className="flex-1 bg-no-repeat relative flex flex-col justify-end p-4" style={{ backgroundImage: `url(${currentStep.background})`, backgroundPosition: currentStep.bgPosition, backgroundSize: currentStep.bgSize }}>
            {!quizActive && (
              <div className="absolute inset-0 flex justify-center items-center pointer-events-none">
                <img src={currentStep.character} alt={currentStep.characterName} className="w-4/5 h-auto object-contain mt-12" />
              </div>
            )}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-gray-200 z-10 text-center mb-2 min-h-[160px] flex flex-col justify-center">
              {!quizActive ? (
                <>
                  <h3 className="font-bold text-lg text-emerald-700 mb-1">{currentStep.characterName} {isTargetCompleted(currentStep.title) && '✅'}</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{currentStep.dialogue}</p>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <h3 className="font-extrabold text-indigo-700 text-base">✨ Stamp Challenge! ✨</h3>
                  <p className="text-sm font-medium text-gray-800 mb-2">{currentStep.question}</p>
                  {quizFeedback === null ? (
                    <div className="grid grid-cols-2 gap-2">
                      {shuffledStopOptions.map((opt, i) => (
                        <button key={i} onClick={() => handleAnswerSubmit(opt.correct)} className={`p-2 font-bold text-xs rounded-xl cursor-pointer ${opt.correct ? 'bg-emerald-50 border border-emerald-400 text-emerald-700' : 'bg-rose-50 border border-rose-400 text-rose-700'}`}>{opt.text}</button>
                      ))}
                    </div>
                  ) : quizFeedback === 'correct' ? (
                    <div className="text-center">
                      <p className="text-emerald-600 font-black text-sm">🎉 CORRECT! 🎉</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-rose-600 font-black text-sm">❌ Try again! ❌</p>
                      <button onClick={() => setQuizFeedback(null)} className="mt-2 text-xs bg-slate-700 text-white px-3 py-1 rounded-lg">Retry</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {(!quizActive || quizFeedback === 'correct') && (
              <button onClick={handleNextAction} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl z-10 uppercase tracking-wider cursor-pointer">
                {quizFeedback === 'correct' ? 'Collect Stamp & Continue ➔' : currentStep.buttonText}
              </button>
            )}
          </div>
        )}

        {/* MODE 2: Map System */}
        {appMode === 'tour' && currentStep.type === 'map' && (
          <div className="flex-1 bg-slate-50 p-4 flex flex-col justify-between overflow-y-auto">
            <div className="text-center mb-2">
              <h2 className="text-lg font-extrabold text-slate-800">Patterson Health Hub</h2>
              <p className="text-xs text-slate-500">Earn stamps to complete your passport!</p>
            </div>

            <div className="flex flex-col gap-3 my-auto">
              <div className="border-b border-gray-200 pb-2">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Main Hallway</span>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => { const i = tourStops.findIndex(s => s.title.toUpperCase().includes("PT")); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-blue-50 border border-blue-400 rounded-lg text-center text-xs font-bold text-blue-700 cursor-pointer relative active:scale-95">🏃‍♂️ PT {isTargetCompleted("PT") && '⭐'}</button>
                  <button onClick={() => { const i = tourStops.findIndex(s => s.title.toUpperCase().includes("CLINIC")); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-blue-50 border border-blue-400 rounded-lg text-center text-xs font-bold text-blue-700 cursor-pointer relative active:scale-95">🩺 Clinic {isTargetCompleted("CLINIC") && '⭐'}</button>
                  <button onClick={() => { const i = tourStops.findIndex(s => s.title.toUpperCase().includes("BEHAVIORAL")); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-purple-50 border border-purple-400 rounded-lg text-center text-xs font-bold text-purple-700 cursor-pointer relative active:scale-95">🧠 Behav. {isTargetCompleted("BEHAVIORAL") && '⭐'}</button>
                  <button onClick={() => { const i = tourStops.findIndex(s => s.title.toUpperCase().includes("LAB")); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-blue-50 border border-blue-400 rounded-lg text-center text-xs font-bold text-blue-700 cursor-pointer relative active:scale-95">🔬 Lab {isTargetCompleted("LAB") && '⭐'}</button>
                  <button onClick={() => { const i = tourStops.findIndex(s => s.title.toUpperCase().includes("SURGERY")); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-blue-50 border border-blue-400 rounded-lg text-center text-xs font-bold text-blue-700 cursor-pointer relative active:scale-95">🏥 Surg. {isTargetCompleted("SURGERY") && '⭐'}</button>
                  <button onClick={() => { const i = tourStops.findIndex(s => s.title.toUpperCase().includes("RADIOLOGY")); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-blue-50 border border-blue-400 rounded-lg text-center text-xs font-bold text-blue-700 cursor-pointer relative active:scale-95">🩻 Radio. {isTargetCompleted("RADIOLOGY") && '⭐'}</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Left Wing & Tech</span>
                  <button onClick={() => { const i = tourStops.findIndex(s => s.title.toUpperCase().includes("CAFE")); if (i !== -1) setCurrentStepIndex(i); }} className="p-2.5 bg-amber-50 border border-amber-500 rounded-xl text-center text-xs font-bold text-amber-800 cursor-pointer relative active:scale-95">☕ Cafe {isTargetCompleted("CAFE") && '⭐'}</button>
                  <button onClick={() => { const i = tourStops.findIndex(s => s.title.toUpperCase().includes("BUSINESS")); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-slate-100 border border-slate-400 rounded-lg text-center text-[11px] font-medium text-slate-700 cursor-pointer relative active:scale-95">💼 Business {isTargetCompleted("BUSINESS") && '⭐'}</button>
                  <button onClick={() => { const i = tourStops.findIndex(s => s.title.toUpperCase().includes("MECHANICAL")); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-zinc-100 border border-zinc-400 rounded-lg text-center text-[11px] font-medium text-zinc-700 cursor-pointer relative active:scale-95">⚙️ Mech. Room {isTargetCompleted("MECHANICAL") && '⭐'}</button>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Right Wing & Admin</span>
                  <button onClick={() => { const i = tourStops.findIndex(s => s.title.toUpperCase().includes("EMERGENCY")); if (i !== -1) setCurrentStepIndex(i); }} className="p-2.5 bg-red-50 border border-red-400 rounded-xl text-center text-xs font-bold text-red-700 cursor-pointer relative active:scale-95">🚨 Emergency {isTargetCompleted("EMERGENCY") && '⭐'}</button>
                  <button onClick={() => { const i = tourStops.findIndex(s => s.title.toUpperCase().includes("HOSPITAL")); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-slate-100 border border-slate-400 rounded-lg text-center text-[11px] font-medium text-slate-700 cursor-pointer relative active:scale-95">🏨 Hospital Beds {isTargetCompleted("HOSPITAL") && '⭐'}</button>
                  <button onClick={() => { const i = tourStops.findIndex(s => s.title.toUpperCase().includes("ADMIN")); if (i !== -1) setCurrentStepIndex(i); }} className="p-2 bg-slate-100 border border-slate-400 rounded-lg text-center text-[11px] font-medium text-slate-700 cursor-pointer relative active:scale-95">👔 Admin Offices {isTargetCompleted("ADMIN") && '⭐'}</button>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-gray-200">
              <button onClick={() => setAppMode('careerQuiz')} disabled={completedStops.length < 3} className={`w-full py-3 rounded-xl font-bold text-sm text-center uppercase transition-all duration-300 ${completedStops.length >= 3 ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white animate-pulse cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                {completedStops.length >= 3 ? '🎓 Claim Graduation Badge!' : '🔒 Collect 3+ stamps to graduate'}
              </button>
            </div>
          </div>
        )}

        {/* MODE 3: Career Matchmaker Quiz */}
        {appMode === 'careerQuiz' && (
          <div className="flex-1 bg-indigo-50 p-6 flex flex-col justify-between">
            <div className="text-center">
              <span className="text-xs uppercase bg-indigo-200 text-indigo-800 px-3 py-1 rounded-full font-bold">Career Explorer Quiz</span>
              <h2 className="text-lg font-black text-slate-800 mt-4">{matchmakerQuestions[currentQuizQuestion].q}</h2>
            </div>
            <div className="flex flex-col gap-3 my-auto overflow-y-auto max-h-[500px] p-1">
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
          <div className="flex-1 bg-slate-100 p-4 flex flex-col justify-between overflow-y-auto">
            <div className="text-center mb-1">
              <span className="text-[10px] uppercase font-black text-indigo-600 bg-indigo-100 px-2.5 py-0.5 rounded-full tracking-wider">Step 2: Security Credentials</span>
              <h2 className="text-sm font-extrabold text-slate-800 mt-1">Finalize Official ID Badge</h2>
            </div>

            {/* 🪪 FIXED PROPORTION CR-80 SMART-21 PRINT SPEC PREVIEW FRAME */}
            <div className="w-[324px] h-[204px] bg-white rounded-xl shadow-xl border border-slate-300 mx-auto my-auto overflow-hidden flex flex-row relative before:content-[''] before:absolute before:top-0 before:bottom-0 before:left-0 before:w-2 before:bg-gradient-to-b before:from-blue-600 before:to-emerald-500 flex-shrink-0">
              
              {/* Left Stripe ID Info Core */}
              <div className="flex-1 p-3 flex flex-col justify-between relative bg-gradient-to-r from-slate-50 to-white pl-4">
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]"></div>
                
                <div>
                  <span className="text-[10px] font-black tracking-widest text-slate-800 block uppercase leading-none">PATTERSON</span>
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">HEALTH CENTER</span>
                  
                  <div className="mt-4">
                    <input 
                      type="text" 
                      placeholder="ENTER FULL NAME" 
                      value={childName} 
                      onChange={(e) => setChildName(e.target.value.toUpperCase())} 
                      className="w-full bg-transparent font-black text-slate-900 text-sm border-b border-dashed border-slate-400 focus:border-blue-500 focus:outline-none tracking-wide pb-0.5 placeholder:text-slate-300" 
                    />
                    <div className="mt-2 text-left text-emerald-600 font-black text-[9px] uppercase tracking-wider">
                      🛡️ {finalCareer}
                    </div>
                  </div>
                </div>

                {/* Professional Functional Barcode System Spec */}
                <div className="flex flex-col gap-0.5">
                  <div className="w-36 h-4 flex gap-[1px] items-center opacity-70">
                    <div className="h-full bg-slate-800 w-[2px]"></div><div className="h-full bg-slate-800 w-[1px]"></div><div className="h-full bg-slate-800 w-[3px]"></div><div className="h-full bg-slate-800 w-[1px]"></div><div className="h-full bg-slate-800 w-[4px]"></div><div className="h-full bg-slate-800 w-[1px]"></div><div className="h-full bg-slate-800 w-[2px]"></div><div className="h-full bg-slate-800 w-[3px]"></div>
                  </div>
                  <span className="text-[6px] font-mono tracking-widest text-slate-400">SMART21-AUTH-{Math.floor(100000 + Math.random() * 900000)}</span>
                </div>
              </div>

              {/* Right Profile Photo Plate Column */}
              <div className="w-28 bg-slate-900 flex flex-col justify-center items-center p-2 border-l border-slate-800 relative">
                <span className="absolute top-2 text-[7px] font-black tracking-widest text-slate-500 uppercase">OFFICIAL STAFF</span>
                
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 p-0.5 shadow-md relative mt-2">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-3xl relative overflow-visible">
                    🐢
                    <span className="absolute -top-3 left-0 right-0 text-xl text-center drop-shadow-sm">{avatarHat.split(' ')[0]}</span>
                    <span className="absolute -bottom-1 -right-1 bg-slate-800 text-white rounded-full w-5 h-5 flex items-center justify-center shadow text-xs border border-white">{avatarProp.split(' ')[0]}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CUSTOMIZATION OPTIONS SELECTORS CONTROLS */}
            <div className="flex flex-col gap-2 mt-2 mb-2">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Select Custom Hat Option</label>
                <div className="grid grid-cols-2 gap-1">
                  {['🎓 Graduate Cap', '🤠 Cowboy Hat', '🧑‍🍳 Chef Hat', '👑 Golden Crown'].map(h => (
                    <button key={h} onClick={() => setAvatarHat(h)} className={`py-1 px-2 text-xs font-bold rounded-lg border text-center transition-all active:scale-95 cursor-pointer ${avatarHat === h ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-300 text-slate-600'}`}>{h}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Select Specialized Tool Accessory</label>
                <div className="grid grid-cols-2 gap-1">
                  {['🩺 Stethoscope', '🔬 Microscope', '🩹 Bandages', '🩻 Shell X-Ray'].map(p => (
                    <button key={p} onClick={() => setAvatarProp(p)} className={`py-1 px-2 text-xs font-bold rounded-lg border text-center transition-all active:scale-95 cursor-pointer ${avatarProp === p ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-300 text-slate-600'}`}>{p}</button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={submitBadgeOrder} disabled={submittingBadge} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black py-3 rounded-xl shadow-lg tracking-wider uppercase text-xs cursor-pointer transition-all active:scale-95">
              {submittingBadge ? '🖨️ Transmitting to Smart-21 Spooler...' : '🔒 Authorize & Print CR-80 ID Card ➔'}
            </button>
          </div>
        )}

        {/* MODE 5: Badge Print Queue Success Splash Screen */}
        {appMode === 'badgeSuccess' && (
          <div className="flex-1 bg-gradient-to-b from-emerald-50 to-teal-100 p-6 flex flex-col justify-center items-center text-center">
            <div className="w-20 h-20 bg-emerald-500 rounded-full text-white flex items-center justify-center text-4xl shadow-xl animate-bounce mb-6">🎉</div>
            <h2 className="text-2xl font-black text-emerald-800">Badge Ordered!</h2>
            <p className="text-slate-600 text-sm font-medium mt-3 px-2 leading-relaxed">
              Awesome job, <strong>{childName}</strong>! Your customized <strong>{finalCareer}</strong> official ID card layout has been sent directly to the front reception desk terminal.
            </p>
            <p className="text-xs text-slate-400 font-bold mt-4 italic">Head over to the front desk to pick up your printed custom badge!</p>
            <button onClick={() => { setAppMode('tour'); setCurrentStepIndex(0); setCompletedStops([]); setChildName(''); setCurrentQuizQuestion(0); setCareerScores({ clinical: 0, technical: 0, creative: 0 }); }} className="mt-8 bg-slate-800 text-white text-xs font-bold py-3 px-6 rounded-xl shadow cursor-pointer active:scale-95 uppercase tracking-wide">
              Start a New Tour 🔄
            </button>
          </div>
        )}

      </div>
    </div>
  );
}// Vercel Vite Build
