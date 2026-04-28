import { useState, useRef, useCallback, useEffect } from 'react';
import { FullBodySkeleton } from './FullBodySkeleton';
import type { NormalizedLandmark, ExerciseType } from '../types';
import { analyzePosture } from '../utils/postureComparison';
import { loadExerciseModel, predictExercise, getExerciseType, extractExerciseFeatures } from '../utils/exerciseModel';
import { getDataCollector } from '../utils/dataCollector';

declare const PoseLandmarker: any;
declare const FilesetResolver: any;

interface BodyPose {
  landmarks: NormalizedLandmark[];
}

interface FullBodyTrackerProps {
  exercise: ExerciseType | null;
  freedomMode?: boolean;
  onLandmarksUpdate?: (landmarks: NormalizedLandmark[]) => void;
  showOverlay?: boolean;
  showPostureAnalysis?: boolean;
  smoothFactor?: number;
  onRepCountChange?: (count: number) => void;
}

export function FullBodyTracker({ exercise, freedomMode = false, onLandmarksUpdate, showOverlay = true, showPostureAnalysis = true, smoothFactor = 0.08, onRepCountChange }: FullBodyTrackerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseLandmarkerRef = useRef<any>(null);
  const animationRef = useRef<number>(0);
  const isCameraRunningRef = useRef(false);
  const isAIInitializedRef = useRef(false);
  const smoothedLandmarksRef = useRef<NormalizedLandmark[]>([]);

  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [isAIInitialized, setIsAIInitialized] = useState(false);
  const [poses, setPoses] = useState<BodyPose[]>([]);
  const [detectionStatus, setDetectionStatus] = useState('Ready to start');
  const [error, setError] = useState('');
  const [loadingProgress, setLoadingProgress] = useState('');
  const [postureAnalysis, setPostureAnalysis] = useState<any>(null);
  const [detectedExercise, setDetectedExercise] = useState<ExerciseType | null>(null);
  const [repCount, setRepCount] = useState(0);
  const repStateRef = useRef({ phase: 'up' as 'up' | 'down', lastCount: 0 });
  const modelLoadedRef = useRef(false);
  const detectedExerciseRef = useRef<ExerciseType | null>(null);

  useEffect(() => {
    if (!modelLoadedRef.current) {
      modelLoadedRef.current = true;
      loadExerciseModel().then(loaded => {
        if (loaded) {
          console.log('Exercise model ready');
        }
      });
    }
  }, []);

  const initPoseDetector = useCallback(async () => {
    try {
      setLoadingProgress('Loading Pose Detection runtime...');
      console.log('Initializing pose detector...');

      const visionModule = await import(/* @vite-ignore */ '@mediapipe/tasks-vision');
      const PoseLandmarkerFn = (visionModule as any).default?.PoseLandmarker || (visionModule as any).PoseLandmarker;
      const FilesetResolverFn = (visionModule as any).default?.FilesetResolver || (visionModule as any).FilesetResolver;

      setLoadingProgress('Initializing Pose Detector...');
      console.log('Loading MediaPipe tasks vision...');

      const vision = await FilesetResolverFn.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'
      );

      console.log('Creating pose landmarker with model...');

      const detector = await PoseLandmarkerFn.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.15,
        minPosePresenceConfidence: 0.15,
        minTrackingConfidence: 0.15,
      });

      console.log('Pose detector initialized successfully!');
      poseLandmarkerRef.current = detector;
      setLoadingProgress('');
    } catch (err) {
      console.error('Error initializing pose detector:', err);
      setError(`Failed to load pose detection model: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
            setDetectionStatus('Camera active - ready to start pose detection');
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
      await initPoseDetector();
      isAIInitializedRef.current = true;
      setIsAIInitialized(true);
      setDetectionStatus('Pose detection active');

      let frameCount = 0;

      const processFrame = () => {
        if (
          !isCameraRunningRef.current ||
          !isAIInitializedRef.current ||
          !poseLandmarkerRef.current ||
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
          const results = poseLandmarkerRef.current.detectForVideo(
            videoRef.current,
            performance.now()
          );

          if (results.landmarks && results.landmarks.length > 0) {
            const rawLandmarks = results.landmarks[0].map((l: any) => ({
              x: l.x,
              y: l.y,
              z: l.z || 0,
              visibility: l.visibility || 1,
            }));

            const smoothed = rawLandmarks.map((l: NormalizedLandmark, i: number) => {
              const prev = smoothedLandmarksRef.current[i] || l;
              return {
                x: prev.x + smoothFactor * (l.x - prev.x),
                y: prev.y + smoothFactor * (l.y - prev.y),
                z: l.z,
                visibility: l.visibility,
              };
            });
            smoothedLandmarksRef.current = smoothed;

            const detectedPoses: BodyPose[] = [{
              landmarks: smoothed,
            }];

            setPoses(detectedPoses);
            if (onLandmarksUpdate) {
              onLandmarksUpdate(smoothed);
            }
            setDetectionStatus(`Tracking ${detectedPoses.length} body | Frame ${frameCount}`);
          } else {
            setDetectionStatus(`Scanning... (frame ${frameCount})`);
            setPoses([]);
          }
        } catch (err) {
          console.error('Detection error:', err);
        }

        animationRef.current = requestAnimationFrame(processFrame);
      };

      processFrame();
    } catch (err) {
      console.error('Error starting AI:', err);
      setError('Failed to start pose detection');
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
     detectedExerciseRef.current = null;
     setIsCameraRunning(false);
     setIsAIInitialized(false);
     setPoses([]);
     setRepCount(0);
     repStateRef.current = { phase: 'up', lastCount: 0 };
     setDetectionStatus('Ready to start');
   }, []);

  const currentPose = poses[0];

  const validateHumanPose = (landmarks: NormalizedLandmark[]): boolean => {
    if (!landmarks || landmarks.length < 33) return false;

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const nose = landmarks[0];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || 
        !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) return false;
    if (!leftElbow || !rightElbow || !leftWrist || !rightWrist || !nose) return false;

    const requiredPoints = [leftShoulder, rightShoulder, leftHip, rightHip, 
                           leftKnee, rightKnee, leftAnkle, rightAnkle, nose];
    for (const point of requiredPoints) {
      if (point.visibility !== undefined && point.visibility < 0.2) return false;
    }

    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    const hipWidth = Math.abs(rightHip.x - leftHip.x);
    const bodyWidth = (shoulderWidth + hipWidth) / 2;
    if (bodyWidth < 0.04 || bodyWidth > 0.8) return false;

    const torsoLength = Math.abs(leftHip.y - leftShoulder.y);
    if (torsoLength < 0.05 || torsoLength > 0.6) return false;

    const legLength = Math.abs(leftAnkle.y - leftHip.y);
    if (legLength < 0.08 || legLength > 0.85) return false;

    const leftArmLength = Math.sqrt(
      Math.pow(leftWrist.x - leftElbow.x, 2) + Math.pow(leftWrist.y - leftElbow.y, 2)
    );
    const rightArmLength = Math.sqrt(
      Math.pow(rightWrist.x - rightElbow.x, 2) + Math.pow(rightWrist.y - rightElbow.y, 2)
    );
    if (leftArmLength < 0.02 || rightArmLength < 0.02) return false;
    if (leftArmLength > 0.7 || rightArmLength > 0.7) return false;

    return true;
  };

  const detectExercise = (landmarks: NormalizedLandmark[]): ExerciseType | null => {
    if (!landmarks || landmarks.length < 33) return null;

    const isValidHuman = validateHumanPose(landmarks);
    if (!isValidHuman) return null;

     const result = predictExercise(landmarks);
     if (result && result.confidence > 0.4) {
       const exType = getExerciseType(result.exercise);
       if (exType) return exType;
     }

    const ls = landmarks[11]; // left shoulder
    const rs = landmarks[12]; // right shoulder
    const le = landmarks[13]; // left elbow
    const re = landmarks[14]; // right elbow
    const lw = landmarks[15]; // left wrist
    const rw = landmarks[16]; // right wrist
    const lh = landmarks[23]; // left hip
    const rh = landmarks[24]; // right hip
    const lk = landmarks[25]; // left knee
    const rk = landmarks[26]; // right knee
    const la = landmarks[27]; // left ankle
    const ra = landmarks[28]; // right ankle

    if (!ls || !rs || !lh || !rh || !lk || !rk || !la || !ra) return null;

    // Shoulder-hip width ratio and body angle checks
    const shoulderWidth = Math.abs(rs.x - ls.x);
    const hipWidth = Math.abs(rh.x - lh.x);
    const bodyWidth = (shoulderWidth + hipWidth) / 2;

    // Height checks (y values increase downward)
    const shoulderY = (ls.y + rs.y) / 2;
    const hipY = (lh.y + rh.y) / 2;
    const kneeY = (lk.y + rk.y) / 2;
    const ankleY = (la.y + ra.y) / 2;

    // Torso verticality (how upright the body is)
    const torsoVertical = Math.abs(ls.x - lh.x) < 0.1;

    // Body spans
    const verticalSpan = shoulderY - ankleY;
    const hipToAnkle = hipY - ankleY;
    const shoulderToHip = shoulderY - hipY;
    const shoulderToKnee = shoulderY - kneeY;

    // ============================================
    // PUSH-UP DETECTION
    // Body close to ground, horizontal, hands on ground
    // ============================================
    const isLowToGround = hipY > 0.6 && kneeY > 0.6;
    const bodyHorizontalForPushup = Math.abs(shoulderY - hipY) < 0.12 && Math.abs(hipY - kneeY) < 0.2;
    const armsBentForPushup = le && re && lw && rw && 
        (le.y > ls.y - 0.08) && (re.y > rs.y - 0.08);
    
    if (isLowToGround && bodyHorizontalForPushup && armsBentForPushup && verticalSpan < 0.5) {
      return 'pushup';
    }

    // ============================================
    // SQUAT DETECTION
    // Hips drop below knees, torso relatively upright
    // ============================================
    const kneesBentForSquat = lk.y > lh.y + 0.02 && rk.y > rh.y + 0.02;
    const hipsLowForSquat = hipY > 0.5 && hipY > kneeY;
    const torsoUprightForSquat = shoulderY < hipY + 0.2;
    const feetOnGroundForSquat = la.y > 0.7 && ra.y > 0.7;

    if (kneesBentForSquat && hipsLowForSquat && torsoUprightForSquat && feetOnGroundForSquat) {
      return 'squat';
    }

    // ============================================
    // LUNGE DETECTION
    // One leg forward, knee bent, back leg straight
    // ============================================
    const leftLegForward = la.x < lk.x - 0.02;
    const rightLegForward = ra.x < rk.x - 0.02;
    const kneeBentLunge = (lk.y > lh.y + 0.05) || (rk.y > rh.y + 0.05);
    const backLegStraightLunge = Math.abs(la.y - lk.y) > 0.15 || Math.abs(ra.y - rk.y) > 0.15;
    const torsoForwardLunge = Math.abs(shoulderY - hipY) < 0.18;

    if (kneeBentLunge && (leftLegForward || rightLegForward) && backLegStraightLunge && torsoForwardLunge) {
      return 'lunge';
    }

    // ============================================
    // SIT-UP DETECTION
    // Upper body raised from ground, torso vertical
    // ============================================
    const isSeatedOrReclined = hipY > kneeY - 0.05 && hipY > 0.6;
    const torsoUprightForSitup = shoulderY < hipY - 0.15 && Math.abs(ls.x - lw.x) < 0.2;
    const feetLiftedOrPlanted = Math.abs(la.y - lk.y) < 0.3 || la.y > 0.7;

    if ((isSeatedOrReclined || verticalSpan < 0.5) && torsoUprightForSitup && feetLiftedOrPlanted) {
      return 'situp';
    }

    // ============================================
    // BICEP CURL DETECTION
    // Arms bent at elbows, hands near shoulders
    // ============================================
    if ((le && ls && lw) || (re && rs && rw)) {
      let elbowBent = false;
      let handsNearShoulders = false;

      if (le && ls && lw) {
        const leftArmBent = le.y > ls.y + 0.05 && le.y > lw.y + 0.05;
        const leftHandNearBody = Math.abs(ls.x - lw.x) < 0.15;
        const leftElbowCloseToTorso = le.x > ls.x - 0.1 && le.x < ls.x + 0.2;
        elbowBent = leftArmBent || elbowBent;
        handsNearShoulders = (leftHandNearBody && leftElbowCloseToTorso) || handsNearShoulders;
      }

      if (re && rs && rw) {
        const rightArmBent = re.y > rs.y + 0.05 && re.y > rw.y + 0.05;
        const rightHandNearBody = Math.abs(rs.x - rw.x) < 0.15;
        const rightElbowCloseToTorso = re.x < rs.x + 0.1 && re.x > rs.x - 0.2;
        elbowBent = rightArmBent || elbowBent;
        handsNearShoulders = (rightHandNearBody && rightElbowCloseToTorso) || handsNearShoulders;
      }

       if (elbowBent && handsNearShoulders && shoulderY < hipY - 0.05) {
         return 'bicep_curl';
       }
    }

    // ============================================
    // SHOULDER PRESS DETECTION
    // Standing, arms pushing upward
    // ============================================
    if ((le && ls && lw) || (re && rs && rw)) {
      let armsPressingUp = false;
      const standingTall = torsoVertical && shoulderY < 0.4;

      if (le && ls && lw) {
        const leftPressing = lw.y < le.y - 0.1 && lw.y < ls.y - 0.1;
        armsPressingUp = leftPressing || armsPressingUp;
      }
      if (re && rs && rw) {
        const rightPressing = rw.y < re.y - 0.1 && rw.y < rs.y - 0.1;
        armsPressingUp = rightPressing || armsPressingUp;
      }

      if (armsPressingUp && standingTall) {
        return 'dumbbell_shoulder_press';
      }
    }

    // ============================================
    // DUMBBELL ROW DETECTION
    // Bent over, pulling arms back
    // ============================================
    const torsoForwardBent = shoulderY > hipY + 0.15;
    const armsPulling = (le && ls && le.x < ls.x - 0.15) || (re && rs && re.x > rs.x + 0.15);

    if (torsoForwardBent && armsPulling) {
      return 'dumbbell_rows';
    }

    // ============================================
    // LATERAL SHOULDER RAISE
    // Standing, arms spread out to sides
    // ============================================
    if ((le && ls && lw) || (re && rs && rw)) {
      let armsSpread = false;
      const standing = torsoVertical && shoulderY < 0.4;

      if (le && ls && lw) {
        const leftSpread = Math.abs(le.x - ls.x) > 0.2 && lw.y < le.y;
        armsSpread = leftSpread || armsSpread;
      }
      if (re && rs && rw) {
        const rightSpread = Math.abs(re.x - rs.x) > 0.2 && rw.y < re.y;
        armsSpread = rightSpread || armsSpread;
      }

      if (armsSpread && standing) {
        return 'lateral_shoulder_raises';
      }
    }

    // ============================================
    // JUMPING JACKS
    // Wide stance with arms up OR jumping motion
    // ============================================
    const legsWide = Math.abs(la.x - ra.x) > 0.4;
    const armsUp = lw && rw && lw.y < shoulderY - 0.15 && rw.y < shoulderY - 0.15;

    if ((legsWide && armsUp) || verticalSpan > 0.75) {
      return 'jumping_jacks';
    }

    // ============================================
    // TRICEP EXTENSION
    // Arms overhead, bent at elbows
    // ============================================
    if ((le && ls && lw) || (re && rs && rw)) {
      let armsOverhead = false;
      const elbowBent = (le && ls && le.y > ls.y + 0.1) || (re && rs && re.y > rs.y + 0.1);

      if (le && ls && lw) {
        const leftOverhead = lw.y < shoulderY - 0.1 && lw.y < le.y;
        armsOverhead = leftOverhead || armsOverhead;
      }
      if (re && rs && rw) {
        const rightOverhead = rw.y < shoulderY - 0.1 && rw.y < re.y;
        armsOverhead = rightOverhead || armsOverhead;
      }

      if (armsOverhead && elbowBent && torsoVertical) {
        return 'tricep_extensions';
      }
    }

    return null;
  };

   useEffect(() => {
     if (currentPose && currentPose.landmarks.length > 0) {
       const analysis = analyzePosture(currentPose.landmarks);
       setPostureAnalysis(analysis);

        if (freedomMode) {
          const detectionResult = predictExercise(currentPose.landmarks);
          if (detectionResult && detectionResult.confidence > 0.4) {
            const detected = getExerciseType(detectionResult.exercise);
            if (detected && detected !== detectedExerciseRef.current) {
             // Opt-in data collection: capture feature vector for model improvement
             try {
               const collector = getDataCollector();
               if (collector.hasConsent()) {
                 const featuresRecord = extractExerciseFeatures(currentPose.landmarks);
                 // Convert to ordered array matching training order
                 const featureKeys: string[] = ['shoulder_width','shoulder_level','hip_width','hip_level','torso_length','leg_length','body_center_x','body_center_y','left_arm_ext','left_arm_height','right_arm_ext','right_arm_height'];
                 const featureArray = featureKeys.map(k => featuresRecord[k] ?? 0);
                 collector.capture(featureArray, detected);
               }
             } catch (e) {
               // Silent fail - data collection is optional
             }

             detectedExerciseRef.current = detected;
             setDetectedExercise(detected);
             repStateRef.current = { phase: 'up', lastCount: 0 };
             setRepCount(0);
           }
         }
       }

       const currentEx = detectedExerciseRef.current || exercise;
       if (currentEx) {
         const reps = countReps(currentPose.landmarks, currentEx);
         setRepCount(reps);
         if (onRepCountChange) {
           onRepCountChange(reps);
         }
       }
     }
   }, [currentPose, freedomMode, exercise]);

  const countReps = (landmarks: NormalizedLandmark[], ex: ExerciseType) => {
    const ls = landmarks[11]; // left shoulder
    const rs = landmarks[12]; // right shoulder
    const le = landmarks[13]; // left elbow
    const re = landmarks[14]; // right elbow
    const lw = landmarks[15]; // left wrist
    const rw = landmarks[16]; // right wrist
    const lh = landmarks[23]; // left hip
    const rh = landmarks[24]; // right hip
    const lk = landmarks[25]; // left knee
    const rk = landmarks[26]; // right knee
    const la = landmarks[27]; // left ankle
    const ra = landmarks[28]; // right ankle

    if (!ls || !rs || !lh || !rh || !lk || !rk || !la || !ra) return repStateRef.current.lastCount;

    let isDown = false;
    const shoulderY = (ls.y + rs.y) / 2;
    const hipY = (lh.y + rh.y) / 2;
    const kneeY = (lk.y + rk.y) / 2;
    const ankleY = (la.y + ra.y) / 2;

    switch (ex) {
       case 'squat': {
         const hipKneeAngle = Math.atan2(lk.y - lh.y, lk.x - lh.x) - 
                             Math.atan2(la.y - lk.y, la.x - lk.x);
         const angleDeg = Math.abs(hipKneeAngle * 180 / Math.PI);
         isDown = angleDeg < 70;
         break;
       }
      case 'pushup': {
        if (!le || !ls) break;
        const shoulderElbow = Math.sqrt(Math.pow(le.x - ls.x, 2) + Math.pow(le.y - ls.y, 2));
        isDown = shoulderElbow < 0.15 && lh.y > 0.7;
        break;
      }
      case 'bicep_curl': {
        if (!le || !lw || !ls) break;
        const armLength = Math.sqrt(Math.pow(ls.x - lw.x, 2) + Math.pow(ls.y - lw.y, 2));
        isDown = armLength < 0.15;
        break;
      }
      case 'lunge': {
        isDown = (lk.y > lh.y + 0.1 && Math.abs(la.y - lk.y) > 0.25) || 
                 (rk.y > rh.y + 0.1 && Math.abs(ra.y - rk.y) > 0.25);
        break;
      }
      case 'situp': {
        isDown = shoulderY < hipY - 0.1;
        break;
      }
      case 'dumbbell_shoulder_press': {
        if (!le || !lw || !ls) break;
        const armUp = lw.y < ls.y - 0.15;
        const armDown = lw.y > ls.y;
        isDown = armUp;
        break;
      }
      case 'dumbbell_rows': {
        if (!le || !ls) break;
        const elbowBehind = le.x < ls.x - 0.15;
        isDown = elbowBehind && lh.y > shoulderY + 0.1;
        break;
      }
      case 'lateral_shoulder_raises': {
        if (!le || !ls || !lw) break;
        const armOut = Math.abs(le.x - ls.x) > 0.2;
        const armUp = lw.y < ls.y - 0.1;
        isDown = armOut && armUp;
        break;
      }
      case 'jumping_jacks': {
        const legsWide = Math.abs(la.x - ra.x) > 0.4;
        isDown = legsWide;
        break;
      }
      case 'tricep_extensions': {
        if (!le || !lw || !ls) break;
        const armUp = lw.y < ls.y - 0.15;
        const elbowBent = le.y > ls.y + 0.1;
        isDown = armUp && elbowBent;
        break;
      }
      default:
        return repStateRef.current.lastCount;
    }

    const state = repStateRef.current;
    if (state.phase === 'up' && isDown) {
      state.phase = 'down';
    } else if (state.phase === 'down' && !isDown) {
      state.phase = 'up';
      state.lastCount += 1;
    }

    return state.lastCount;
  };

  return (
    <div className="fullbody-tracker">
      <div className="mb-4 text-center text-sm text-slate-500">
        Full Body Tracking | Show your full body to camera
      </div>

      <div className="relative mx-auto" style={{ width: '640px' }}>
        {isAIInitialized && currentPose && (
          <div className="absolute top-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-xs font-mono z-10" style={{ color: currentPose ? '#00FF00' : '#FF9800' }}>
            {currentPose ? 'STATUS: TRACKING ACTIVE' : 'STATUS: SCANNING...'}
          </div>
        )}
        {showPostureAnalysis && postureAnalysis && (
          <div className="absolute top-12 right-2 bg-black/80 px-4 py-2 rounded text-white text-sm z-10 min-w-[180px]" style={{ 
            background: postureAnalysis.rating === 'good' ? 'rgba(0,200,0,0.85)' : 
                        postureAnalysis.rating === 'acceptable' ? 'rgba(255,165,0,0.85)' : 'rgba(255,0,0,0.85)'
          }}>
            <div className="font-bold text-base mb-1">
              {(detectedExercise || exercise || 'NO EXERCISE').replace(/_/g, ' ').toUpperCase()}
            </div>
            <div className="text-xl font-bold mb-1">
              {repCount} REPS
            </div>
            <div className="text-sm mb-2">
              {Math.round(postureAnalysis.score * 100)}% {postureAnalysis.rating.toUpperCase()}
            </div>
            {postureAnalysis.score < 0.45 && (
              <div className="text-xs bg-red-600 text-white px-2 py-1 rounded mb-2">
                INJURY RISK - STOP!
              </div>
            )}
            {postureAnalysis.matchingPose && (
              <div className="text-xs opacity-90 mb-1 italic">
                Pose: {postureAnalysis.matchingPose.replace(/_/g, ' ')}
              </div>
            )}
            {postureAnalysis.feedback && postureAnalysis.feedback.length > 0 && (
              <div className="text-xs mt-2 opacity-95">
                {postureAnalysis.feedback.map((fb: string, i: number) => (
                  <div key={i} className="mt-1">• {fb}</div>
                ))}
              </div>
            )}
          </div>
        )}
        <video
          ref={videoRef}
          width={640}
          height={480}
          className="block border-2 border-slate-300 rounded-lg"
          style={{ transform: 'scaleX(-1)' }}
          playsInline
        />
        <FullBodySkeleton
          landmarks={currentPose?.landmarks || []}
          canvasWidth={640}
          canvasHeight={480}
          isCameraRunning={isCameraRunning}
          showOverlay={showOverlay}
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
          {isAIInitialized ? '✓ Detection Active' : 'Start Full Body Detection'}
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
        
        {postureAnalysis && (
          <div className="mt-4 p-3 rounded border" style={{ 
            background: postureAnalysis.rating === 'good' ? 'rgba(0,200,0,0.1)' : 
                        postureAnalysis.rating === 'acceptable' ? 'rgba(255,165,0,0.1)' : 'rgba(255,0,0,0.1)',
            borderColor: postureAnalysis.rating === 'good' ? '#00C853' : 
                                  postureAnalysis.rating === 'acceptable' ? '#FFA000' : '#D32F2F'
          }}>
            <div className="font-bold">
              Posture Score: {Math.round(postureAnalysis.score * 100)}% 
              <span className="ml-2" style={{ 
                color: postureAnalysis.rating === 'good' ? '#00C853' : 
                       postureAnalysis.rating === 'acceptable' ? '#FFA000' : '#D32F2F'
              }}>
                ({postureAnalysis.rating.toUpperCase()})
              </span>
            </div>
            {postureAnalysis.matchingPose && (
              <div className="text-xs text-slate-500 mt-1">
                Closest match: {postureAnalysis.matchingPose.replace(/_/g, ' ')}
              </div>
            )}
            {postureAnalysis.feedback && postureAnalysis.feedback.length > 0 && (
              <div className="text-xs text-red-600 mt-1">
                {postureAnalysis.feedback.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}