import { useRef, useState, useEffect } from 'react';

export default function TurtleBooth({ onPhotoCaptured, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  // 1. Initialize Webcam Stream
  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480, facingMode: 'user' } 
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
      // Clean up webcam stream on exit
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 2. Take Snapshot & Composite Graphic
  const takeSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 400;

    // Draw video frame cropped to square
    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - minDim) / 2;
    const startY = (video.videoHeight - minDim) / 2;

    // Mirror horizontal display so it feels like a real mirror
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform

    // Draw Turtle Overlay Frame (Green Shell / Visor)
    ctx.fillStyle = '#10b981'; // Patterson Emerald
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#047857';

    // Top Green Turtle Visor Hat
    ctx.beginPath();
    ctx.arc(200, 80, 140, Math.PI, 2 * Math.PI);
    ctx.fillStyle = '#059669';
    ctx.fill();
    ctx.stroke();

    // Cute Turtle Eyes on Visor
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(140, 60, 20, 0, 2 * Math.PI);
    ctx.arc(260, 60, 20, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(145, 60, 8, 0, 2 * Math.PI);
    ctx.arc(255, 60, 8, 0, 2 * Math.PI);
    ctx.fill();

    const dataUrl = canvas.toDataURL('image/png');
    setCapturedImage(dataUrl);
    if (onPhotoCaptured) {
      onPhotoCaptured(dataUrl);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-3xl p-5 w-full max-w-sm text-center shadow-2xl flex flex-col items-center gap-3">
        <div className="flex justify-between items-center w-full border-b border-slate-100 pb-2">
          <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider">📸 Turtle Selfie Booth</h3>
          {onClose && (
            <button onClick={onClose} className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-lg font-bold">
              ✕ Close
            </button>
          )}
        </div>

        {/* LIVE CAMERA PREVIEW */}
        <div className="relative w-[280px] h-[280px] rounded-2xl overflow-hidden bg-slate-900 border-4 border-emerald-500 shadow-inner flex items-center justify-center">
          {!capturedImage ? (
            <>
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover -scale-x-100" 
                playsInline 
                muted 
              />
              
              {/* LIVE AR GRAPHIC OVERLAY */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-2">
                {/* Turtle Hat Visor */}
                <div className="w-48 h-16 bg-emerald-600 rounded-b-full border-2 border-emerald-800 flex justify-center items-center gap-8 shadow-md mt-1">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-slate-900 rounded-full"></div>
                  </div>
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-slate-900 rounded-full"></div>
                  </div>
                </div>
                
                {/* Alignment Guide Text */}
                <span className="text-[10px] bg-slate-900/80 text-emerald-300 font-bold px-3 py-1 rounded-full mb-1">
                  Center your face inside the mask!
                </span>
              </div>
            </>
          ) : (
            <img src={capturedImage} alt="Turtle Captured Selfie" className="w-full h-full object-cover" />
          )}
        </div>

        {/* CANVAS HIDDEN RENDERER */}
        <canvas ref={canvasRef} className="hidden" />

        {/* CONTROLS */}
        <div className="w-full flex gap-2 mt-1">
          {!capturedImage ? (
            <button 
              onClick={takeSnapshot} 
              disabled={!cameraReady}
              className="w-full bg-emerald-600 active:bg-emerald-700 text-white font-black text-xs py-3 rounded-xl uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              📸 Snap Turtle Photo!
            </button>
          ) : (
            <>
              <button 
                onClick={retakePhoto} 
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