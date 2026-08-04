// src/components/scavengerhunt.jsx
import React, { useState } from 'react';

const CLOUD_NAME = 'dbvm7hy4d'; 
const UPLOAD_PRESET = 'ScavengerHunt';

export default function ScavengerHunt({ onBackToArcade }) {
  const [uploading, setUploading] = useState(false);
  const [completedItems, setCompletedItems] = useState([]);

 const huntItems = [
  { id: 1, label: 'Patterson Health Center Booth or Banner 🏥', key: 'booth' },
  { id: 2, label: 'Someone Mid-Scream or Laughing on a Ride! 🎢', key: 'ride_scream' },
  { id: 3, label: 'A Hand Sanitizer Station 🧴', key: 'sanitizer' },
  { id: 4, label: 'A Fair Animal Taking a Huge Nap in the Barn 😴', key: 'sleeping_animal' },
  { id: 5, label: 'A Giant Carnival Prize Stuffed Animal 🧸', key: 'carnival_prize' },
  { id: 6, label: 'A 4-H Purple or Blue Prize Ribbon 🏅', key: 'ribbon' },
  { id: 7, label: 'Someone Wearing Boots Covered in Barn Dust 👢', key: 'dusty_boots' },
  { id: 8, label: 'Carnival rides glowing or spinning in action!,' key: 'glow-ride'},
];

  const handleImageUpload = async (event, item) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();

      if (data.secure_url) {
        setCompletedItems((prev) => [...prev, item.id]);
        alert(`Awesome shot! Saved for the Facebook feature! 📸`);
      } else {
        alert('Upload failed. Please check your preset or connection!');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Oops! Upload error. Try again!');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 bg-[#3b0764] p-4 flex flex-col justify-between overflow-y-auto h-full text-white text-center">
      {/* Top Header */}
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

      {/* Hunt List */}
      <div className="flex-1 flex flex-col gap-3 my-auto">
        <p className="text-xs text-white/80 font-medium">
          Snap photos of these items around the hospital to be featured on our Facebook page! 🌟
        </p>

        {huntItems.map((item) => {
          const isDone = completedItems.includes(item.id);

          return (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${
                isDone
                  ? 'bg-emerald-900/60 border-emerald-400'
                  : 'bg-white/10 border-white/20'
              }`}
            >
              <span className="text-xs font-black text-left">{item.label}</span>

              {isDone ? (
                <span className="text-emerald-400 font-black text-xs bg-emerald-950/80 px-2.5 py-1.5 rounded-xl border border-emerald-400/30">
                  ✅ SAVED!
                </span>
              ) : (
                <label className="bg-[#e11d48] active:bg-[#be123c] text-white text-xs font-black px-3 py-2 rounded-xl cursor-pointer shadow active:scale-95 transition-all">
                  {uploading ? 'UPLOADING...' : 'SNAP PHOTO 📷'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleImageUpload(e, item)}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-3 bg-white/5 border border-white/10 p-2.5 rounded-xl text-[10px] text-white/60 font-bold flex-shrink-0">
        Photos are safely uploaded to the Patterson Health Center media library.
      </div>
    </div>
  );
}