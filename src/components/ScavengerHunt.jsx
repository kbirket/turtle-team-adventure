// src/components/ScavengerHunt.jsx
import React, { useState } from 'react';

const CLOUD_NAME = 'dbvm7hy4d'; 
const UPLOAD_PRESET = 'ScavengerHunt';

export default function ScavengerHunt({ onBackToArcade }) {
  const [uploading, setUploading] = useState(false);
  const [completedItems, setCompletedItems] = useState([]);
  const [facebookConsent, setFacebookConsent] = useState(null); // null = unselected, true = yes, false = no

  const huntItems = [
    { id: 1, label: 'Patterson Health Center Booth 🏥', key: 'booth' },
    { id: 2, label: 'Someone Mid-Scream or Laughing on a Ride! 🎢', key: 'ride_scream' },
    { id: 3, label: 'A Hand Sanitizer Station 🧴', key: 'sanitizer' },
    { id: 4, label: 'A Fair Animal Taking a Huge Nap in the Barn 😴', key: 'sleeping_animal' },
    { id: 5, label: 'A Giant Carnival Prize Stuffed Animal 🧸', key: 'carnival_prize' },
    { id: 6, label: 'A 4-H Purple or Blue Prize Ribbon 🏅', key: 'ribbon' },
    { id: 7, label: 'Someone Wearing Boots Covered in Barn Dust 👢', key: 'dusty_boots' },
    { id: 8, label: 'Carnival rides glowing or spinning in action!', key: 'glow-ride' },
  ];

  const handleImageUpload = async (event, item) => {
    // Safety check just in case
    if (facebookConsent === null) return;

    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    // Attach tags so you can filter approved photos easily in Cloudinary!
    formData.append('tags', facebookConsent ? 'fb_approved,scavenger_hunt' : 'private,scavenger_hunt');

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      const data = await response.json();

      if (data.secure_url) {
        setCompletedItems((prev) => [...prev, item.id]);
        alert(
          facebookConsent
            ? `Awesome shot! Saved & tagged for our Facebook page! 📸`
            : `Great find! Photo saved safely! 📸`
        );
      } else {
        alert('Upload failed. Please check your connection!');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Oops! Upload error. Try again!');
    } finally {
      setUploading(false);
    }
  };

  const isPermissionSelected = facebookConsent !== null;

  return (
    <div className="flex-1 bg-[#3b0764] p-4 flex flex-col justify-between overflow-y-auto h-full text-white text-center">
      {/* Header */}
      <div className="flex justify-between items-center bg-white/10 border border-white/20 p-3 rounded-2xl mb-3 flex-shrink-0">
        <h2 className="text-sm font-black text-[#22d3ee] uppercase tracking-wider">
          📸 Photo Scavenger Hunt
        </h2>
        {onBackToArcade && (
          <button
            onClick={onBackToArcade}
            className="text-xs bg-white/20 hover:bg-white/30 text-white font-bold px-3 py-1.5 rounded-xl transition-all"
          >
            ◀ Back
          </button>
        )}
      </div>

      {/* Required Permission Box */}
      <div className={`p-3 rounded-2xl mb-3 flex flex-col gap-2 flex-shrink-0 border-2 transition-all ${
        !isPermissionSelected 
          ? 'bg-amber-500/20 border-amber-400 animate-pulse' 
          : 'bg-white/10 border-white/20'
      }`}>
        <p className="text-xs font-bold text-amber-300">
          ⚠️ Parent Permission Required: May we feature your child's photos on the Patterson Health Center Facebook page?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFacebookConsent(true)}
            className={`py-2.5 text-xs font-black rounded-xl uppercase transition-all ${
              facebookConsent === true
                ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-300 scale-105'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {facebookConsent === true ? '✓ Yes, Approved' : 'Yes'}
          </button>
          <button
            type="button"
            onClick={() => setFacebookConsent(false)}
            className={`py-2.5 text-xs font-black rounded-xl uppercase transition-all ${
              facebookConsent === false
                ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-300 scale-105'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {facebookConsent === false ? '✗ No, Keep Private' : 'No'}
          </button>
        </div>
      </div>

      {/* Hunt List */}
      <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-1">
        {huntItems.map((item) => {
          const isDone = completedItems.includes(item.id);

          return (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all ${
                isDone
                  ? 'bg-emerald-900/60 border-emerald-400'
                  : 'bg-white/10 border-white/20'
              }`}
            >
              <span className="text-xs font-black text-left flex-1 mr-2">{item.label}</span>

              {isDone ? (
                <span className="text-emerald-400 font-black text-xs bg-emerald-950/80 px-2.5 py-1.5 rounded-xl border border-emerald-400/30 flex-shrink-0">
                  ✅ SAVED!
                </span>
              ) : (
                <label className={`text-xs font-black px-3 py-2 rounded-xl transition-all flex-shrink-0 ${
                  !isPermissionSelected
                    ? 'bg-gray-600/50 text-white/50 cursor-not-allowed border border-white/10'
                    : 'bg-[#e11d48] active:bg-[#be123c] text-white cursor-pointer shadow active:scale-95'
                }`}>
                  {uploading 
                    ? 'UPLOADING...' 
                    : !isPermissionSelected 
                      ? 'SELECT PERMISSION 👆' 
                      : 'SNAP PHOTO 📷'
                  }
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleImageUpload(e, item)}
                    disabled={uploading || !isPermissionSelected}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}