/// <reference path="../mediapipe-tasks-vision.d.ts" />
import { useState, useRef, useCallback } from 'react';
import { HandSkeleton } from './HandSkeleton';
import type { Hand } from '../types';

declare const HandLandmarker: any;
declare const FilesetResolver: any;

export function HandTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handLandmarkerRef = useRef<any>(null);
  const animationRef = useRef<number>(0);
  const isCameraRunningRef = useRef(false);
  const isAIInitializedRef = useRef(false);

  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [isAIInitialized, setIsAIInitialized] = useState(false);
  const [hands, setHands] = useState<Hand[]>([]);
  const [detectionStatus, setDetectionStatus] = useState('Ready to start');
  const [error, setError] = useState('');
  const [loadingProgress, setLoadingProgress] = useState('');

  const initHandDetector = useCallback(async () => {
    try {
      setLoadingProgress('Loading Hand Detection runtime...');
      console.log('Initializing hand detector...');

      const visionModule = await import(/* @vite-ignore */ '@mediapipe/tasks-vision');
      const HandLandmarkerFn = (visionModule as any).default?.HandLandmarker || (visionModule as any).HandLandmarker;
      const FilesetResolverFn = (visionModule as any).default?.FilesetResolver || (visionModule as any).FilesetResolver;

      setLoadingProgress('Initializing Hand Detector...');
      console.log('Loading MediaPipe tasks vision...');

      const vision = await FilesetResolverFn.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
      );

      console.log('Creating hand landmarker with model...');

      const detector = await HandLandmarkerFn.createFromOptions(vision, {
        baseOptions: { 
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.1,
        minHandPresenceConfidence: 0.1,
        minTrackingConfidence: 0.1,
      });

      console.log('Hand detector initialized successfully!');
      handLandmarkerRef.current = detector;
      setLoadingProgress('');
    } catch (err) {
      console.error('Error initializing hand detector:', err);
      setError(`Failed to load hand detection model: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setLoadingProgress('');
    }
  }, []);

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            isCameraRunningRef.current = true;
            setIsCameraRunning(true);
            setDetectionStatus('Camera active - ready to start hand detection');
          }).catch((e) => {
            console.error('Play error:', e);
            setError('Camera play failed');
          });
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera');
    }
  };

  const startAI = async () => {
    if (!isCameraRunningRef.current) {
      setError('Please start camera first');
      return;
    }

    try {
      setError('');
      await initHandDetector();
      isAIInitializedRef.current = true;
      setIsAIInitialized(true);
      setDetectionStatus('Hand detection active');

      let frameCount = 0;

      const processFrame = () => {
        if (
          !isCameraRunningRef.current ||
          !isAIInitializedRef.current ||
          !handLandmarkerRef.current ||
          !videoRef.current ||
          videoRef.current.readyState < 2 ||
          videoRef.current.videoWidth === 0 ||
          videoRef.current.videoHeight === 0
        ) {
          animationRef.current = requestAnimationFrame(processFrame);
          return;
        }

        frameCount++;

        try {
          const results = handLandmarkerRef.current.detectForVideo(
            videoRef.current,
            performance.now()
          );

          if (results.landmarks && results.landmarks.length > 0) {
            const detectedHands: Hand[] = results.landmarks.map((landmarks: any[], idx: number) => ({
              landmarks: landmarks.map((l: any) => ({
                x: l.x,
                y: l.y,
                z: l.z || 0,
                visibility: l.visibility || 1,
              })),
              handedness: results.handedness?.[idx]?.displayName || 'Unknown',
              confidence: results.handedness?.[idx]?.score || 0,
            }));

            setHands(detectedHands);
            setDetectionStatus(`Tracking ${detectedHands.length} hand(s) | Frame ${frameCount}`);
          } else {
            setDetectionStatus(`Scanning... (frame ${frameCount})`);
            setHands([]);
          }
        } catch (err) {
          console.error('Detection error:', err);
        }

        animationRef.current = requestAnimationFrame(processFrame);
      };

      processFrame();
    } catch (err) {
      console.error('Error starting AI:', err);
      setError('Failed to start hand detection');
      isAIInitializedRef.current = false;
      setIsAIInitialized(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    isCameraRunningRef.current = false;
    isAIInitializedRef.current = false;
    setIsCameraRunning(false);
    setIsAIInitialized(false);
    setHands([]);
    setDetectionStatus('Ready to start');
  }, []);

  return (
    <div className="hand-tracker">
      <div className="mb-4 text-center text-sm text-slate-500">
        👋 Hand Tracking | Show your hands to camera • Both hands supported
      </div>

      <div className="relative mx-auto" style={{ width: '640px' }}>
        {isAIInitialized && (
          <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-xs font-mono z-10" style={{ color: hands.length > 0 ? '#00FF00' : '#FF9800' }}>
            {hands.length > 0 ? 'STATUS: TRACKING ACTIVE' : 'STATUS: SCANNING...'}
          </div>
        )}
        <video
          ref={videoRef}
          width={640}
          height={480}
          className="block border-2 border-slate-300 rounded-lg"
          playsInline
        />
        <HandSkeleton 
          hands={hands} 
          canvasWidth={640} 
          canvasHeight={480} 
          isCameraRunning={isCameraRunning} 
        />
      </div>

      <div className="text-center mt-6">
        <button
          onClick={startCamera}
          disabled={isCameraRunning}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium mr-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700"
        >
          {isCameraRunning ? '✓ Camera Running' : 'Start Camera'}
        </button>

        <button
          onClick={startAI}
          disabled={!isCameraRunning || isAIInitialized}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium mr-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
        >
          {isAIInitialized ? '✓ Detection Active' : 'Start Hand Detection'}
        </button>

        <button
          onClick={stopCamera}
          disabled={!isCameraRunning}
          className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700"
        >
          Stop
        </button>
      </div>

      <div className="text-center mt-4 text-sm">
        {loadingProgress && <div className="text-orange-500">{loadingProgress}</div>}
        <div style={{ color: detectionStatus.includes('Tracking') ? '#4CAF50' : '#666' }}>
          {detectionStatus}
        </div>
        {error && <div className="text-red-500 mt-2">{error}</div>}
      </div>
    </div>
  );
}