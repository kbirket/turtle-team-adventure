import { useRef, useState, useEffect } from 'react';

export default function TurtleBooth({ onPhotoCaptured, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
          setCameraReady(true);
        }
      } catch (err) {
        console.error("Camera access error:", err);
        alert("Camera permission denied or camera unavailable.");
      }
    }
    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  const takeSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 400;

    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - minDim) / 2;
    const startY = (video.videoHeight - minDim) / 2;

    // 1. Draw mirrored user photo
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // 2. Draw clean badge overlay onto saved canvas
    const overlayImg = new Image();
    overlayImg.src = '/characters/doctor/avatar.png'; // Uses your official high-res turtle asset
    overlayImg.onload = () => {
      // Draw cute turtle head floating at top-center of photo
      ctx.drawImage(overlayImg, 260, 10, 130, 130);
      
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImage(dataUrl);
      if (onPhotoCaptured) onPhotoCaptured(dataUrl);
    };
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-3xl p-5 w-full max-w-sm text-center shadow-2xl flex flex-col items-center gap-3">
        
        {/* HEADER */}
        <div className="flex justify-between items-center w-full border-b border-slate-100 pb-2">
          <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider">📸 Turtle Selfie Cam</h3>
          {onClose && (
            <button onClick={onClose} className="text-xs bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-bold">
              ✕ Close
            </button>
          )}
        </div>

        {/* LIVE CAMERA DISPLAY WITH POLISHED OVERLAY */}
        <div className="relative w-[280px] h-[280px] rounded-2xl overflow-hidden bg-slate-900 border-4 border-emerald-500 shadow-inner flex items-center justify-center">
          {!capturedImage ? (
            <>
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover -scale-x-100" 
                playsInline 
                muted 
              />
              
              {/* CUTE LIVE GRAPHIC OVERLAY */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2">
                {/* Top Corner Mascot Sticker */}
                <div className="self-end bg-white/90 backdrop-blur-sm p-1 rounded-2xl shadow-lg border border-emerald-300 flex items-center gap-1.5 pr-2.5">
                  <img src="/characters/doctor/avatar.png" alt="Turtle Mascot" className="w-8 h-8 object-contain" />
                  <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wide">Patterson Turtle</span>
                </div>

                {/* Alignment Helper */}
                <div className="self-center bg-slate-900/75 backdrop-blur-sm text-emerald-300 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                  Smile & Line Up Your Face! 😊
                </div>
              </div>
            </>
          ) : (
            <img src={capturedImage} alt="Captured Selfie" className="w-full h-full object-cover" />
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* ACTION BUTTONS */}
        <div className="w-full flex gap-2 mt-1">
          {!capturedImage ? (
            <button 
              onClick={takeSnapshot} 
              disabled={!cameraReady}
              className="w-full bg-emerald-600 active:bg-emerald-700 text-white font-black text-xs py-3 rounded-xl uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              📸 Take Badge Photo!
            </button>
          ) : (
            <>
              <button 
                onClick={() => setCapturedImage(null)} 
                className="flex-1 bg-slate-200 active:bg-slate-300 text-slate-700 font-black text-xs py-3 rounded-xl uppercase active:scale-95 transition-all cursor-pointer"
              >
                🔄 Retake
              </button>
              <button 
                onClick={onClose} 
                className="flex-1 bg-indigo-600 active:bg-indigo-700 text-white font-black text-xs py-3 rounded-xl uppercase tracking-wider shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Use Photo ✅
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}