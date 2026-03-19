
import React, { useRef, useState, useEffect } from 'react';

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
  aspectRatio?: 'square' | 'video' | 'portrait';
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose, aspectRatio = 'video' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' }, 
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsActive(true);
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Could not access camera. Please check permissions.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const takePicture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        onCapture(canvas.toDataURL('image/jpeg', 0.8));
        onClose();
      }
    }
  };

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-800">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-white font-black text-lg">Live Camera</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl">&times;</button>
        </div>
        
        <div className="p-4">
          {error ? (
            <div className="aspect-video flex items-center justify-center text-red-500 font-bold bg-slate-800 rounded-3xl p-8 text-center">
              {error}
            </div>
          ) : (
            <div className={`relative bg-black rounded-3xl overflow-hidden shadow-inner ${aspectClasses[aspectRatio]}`}>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold">
                  Starting camera...
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-8 flex justify-center gap-4">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-slate-800 text-slate-300 rounded-2xl font-bold hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={takePicture}
            disabled={!isActive}
            className="px-10 py-3 bg-primary-600 text-white rounded-2xl font-black shadow-lg shadow-primary-500/20 hover:bg-primary-700 active:scale-95 transition-all disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {isActive ? 'CAPTURE PHOTO' : 'Initializing Camera...'}
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
