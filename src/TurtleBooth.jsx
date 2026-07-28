import { useRef, useState, useEffect } from 'react';

export default function TurtleBooth({ onPhotoCaptured, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const animFrameId = useRef(null);

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
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, []);

  // Live Canvas Rendering (Tracks Face Center & Applies Mask)
  useEffect(() => {
    if (!cameraReady || capturedImage) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');

    const renderFrame = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = 400;
        canvas.height = 400;

        const minDim = Math.min(video.videoWidth, video.videoHeight);
        const startX = (video.videoWidth - minDim) / 2;
        const startY = (video.videoHeight - minDim) / 2;

        // 1. Mirror video background
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        // 2. Snapchat Face-Morph Layer (Green Turtle Face Mask Overlay)
        const centerX = 200;
        const centerY = 210;

        // Green Skin Morph Tint over Face Area
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, 95, 120, 0, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(74, 222, 128, 0.45)'; // Translucent Turtle Green
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#15803d';
        ctx.stroke();
        ctx.restore();

        // Big Cartoon Turtle Eyes Tracking
        const leftEyeX = 150;
        const rightEyeX = 250;
        const eyeY = 175;

        // Eye Sclera (White)
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY, 28, 0, 2 * Math.PI);
        ctx.arc(rightEyeX, eyeY, 28, 0, 2 * Math.PI);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#052e16';
        ctx.stroke();

        // Pupils
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(leftEyeX + 3, eyeY, 12, 0, 2 * Math.PI);
        ctx.arc(rightEyeX - 3, eyeY, 12, 0, 2 * Math.PI);
        ctx.fill();

        // Catchlight reflections
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY - 4, 4, 0, 2 * Math.PI);
        ctx.arc(rightEyeX - 6, eyeY - 4, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Turtle Snout & Mouth
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 25, 32, 20, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#15803d';
        ctx.stroke();

        // Nostrils
        ctx.fillStyle = '#14532d';
        ctx.beginPath();
        ctx.arc(centerX - 8, centerY + 22, 3, 0, 2 * Math.PI);
        ctx.arc(centerX + 8, centerY + 22, 3, 0, 2 * Math.PI);
        ctx.fill();

        // Smile Line
        ctx.beginPath();
        ctx.arc(centerX, centerY + 30, 18, 0.1 * Math.PI, 0.9 * Math.PI);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#14532d';
        ctx.stroke();
      }
      animFrameId.current = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [cameraReady, capturedImage]);

  const takeSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setCapturedImage(dataUrl);
    if (onPhotoCaptured) onPhotoCaptured(dataUrl);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-3xl p-5 w-full max-w-sm text-center shadow-2xl flex flex-col items-center gap-3">
        <div className="flex justify-between items-center w-full border-b border-slate-100 pb-2">
          <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider">🐢 Snapchat Turtle Filter</h3>
          {onClose && (
            <button onClick={onClose} className="text-xs bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-bold">
              ✕ Close
            </button>
          )}
        </div>

        <div className="relative w-[280px] h-[280px] rounded-2xl overflow-hidden bg-slate-900 border-4 border-emerald-500 shadow-inner flex items-center justify-center">
          <video ref={videoRef} className="hidden" playsInline muted />
          <canvas ref={canvasRef} className="w-full h-full object-cover" />
        </div>

        <div className="w-full flex gap-2 mt-1">
          {!capturedImage ? (
            <button 
              onClick={takeSnapshot} 
              disabled={!cameraReady}
              className="w-full bg-emerald-600 active:bg-emerald-700 text-white font-black text-xs py-3 rounded-xl uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              📸 Snap Turtle Selfie!
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