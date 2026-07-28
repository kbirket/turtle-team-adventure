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
    canvas.width = 500;
    canvas.height = 500;

    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - minDim) / 2;
    const startY = (video.videoHeight - minDim) / 2;

    // 1. Create a Circular Clipping Path for the inner photo area
    ctx.save();
    ctx.beginPath();
    ctx.arc(250, 245, 185, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    // 2. Draw mirrored user photo inside the inner circle
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // 3. Draw Gold Frame with 15px margin padding so outer edges never get clipped
    const frameImg = new Image();
    frameImg.src = '/gold-frame.png';
    frameImg.onload = () => {
      ctx.drawImage(frameImg, 15, 15, 470, 470);
      
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
          <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider">📸 Turtle Team Selfie Cam</h3>
          {onClose && (
            <button onClick={onClose} className="text-xs bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-bold">
              ✕ Close
            </button>
          )}
        </div>

        {/* LIVE CAMERA PREVIEW WITH GOLD FRAME OVERLAY */}
        <div className="relative w-[280px] h-[280px] rounded-2xl overflow-hidden bg-slate-900 border-4 border-amber-400 shadow-inner flex items-center justify-center">
          {!capturedImage ? (
            <>
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover -scale-x-100" 
                playsInline 
                muted 
              />
              
              {/* LIVE GOLD FRAME OVERLAY */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-2">
                <img 
                  src="/gold-frame.png" 
                  alt="Gold Frame Overlay" 
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Alignment Tip */}
              <div className="absolute bottom-2 bg-slate-900/80 backdrop-blur-sm text-amber-300 text-[9px] font-bold px-3 py-1 rounded-full border border-amber-400/40 pointer-events-none">
                Center your face inside the gold ring! ✨
              </div>
            </>
          ) : (
            <img src={capturedImage} alt="Captured Selfie" className="w-full h-full object-contain" />
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* CONTROLS */}
        <div className="w-full flex gap-2 mt-1">
          {!capturedImage ? (
            <button 
              onClick={takeSnapshot} 
              disabled={!cameraReady}
              className="w-full bg-amber-500 active:bg-amber-600 text-slate-950 font-black text-xs py-3 rounded-xl uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              📸 Snap Turtle Photo!
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