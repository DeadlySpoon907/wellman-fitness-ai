import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../types';
import { AuthGuard } from '../components/AuthGuard';
import { GoogleGenAI } from "@google/genai";
import { saveUser } from '../services/DB';
import { FullBodyTracker } from '../components/FullBodyTracker';
import { analyzeBodyType, BodyAnalysis, getBodyTypeDescription, getBodyTypeIcon, BodyType } from '../utils/bodyAnalysis';
import type { NormalizedLandmark } from '../types';

type ScanState = 'idle' | 'scanning' | 'analyzing' | 'ready' | 'locked';

interface LockedBodyProfile {
  bodyType: BodyType;
  lockedAt: string;
  measurements: {
    heightCm: number;
    weightKg: number;
    bmi: number;
  };
  confidence: number;
}

const BodyScanner: React.FC<{ user: User, onUpdateProfile: () => void; apiKey?: string }> = ({ user, onUpdateProfile, apiKey }) => {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [bodyAnalysis, setBodyAnalysis] = useState<BodyAnalysis | null>(null);
  const [lockedProfile, setLockedProfile] = useState<LockedBodyProfile | null>(null);
  const [liveLandmarks, setLiveLandmarks] = useState<NormalizedLandmark[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanDuration, setScanDuration] = useState(0);
  const [bodyScans, setBodyScans] = useState<BodyAnalysis[]>([]);
  const [positionStatus, setPositionStatus] = useState<'idle' | 'checking' | 'ready' | 'invalid'>('idle');
  const [positionMessage, setPositionMessage] = useState('');
  const scanProgressRef = useRef(0);
  const scanStartTimeRef = useRef(0);
  const bodyScansRef = useRef<BodyAnalysis[]>([]);

  const currentWeight = user.weightLogs.length > 0 
    ? user.weightLogs[user.weightLogs.length - 1].weight 
    : 70;
  const currentHeight = user.heightCm || 170;
  const calculatedBmi = currentWeight / Math.pow(currentHeight / 100, 2);

  useEffect(() => {
    if (user.estimatedBodyType && user.heightCm) {
      setLockedProfile({
        bodyType: user.estimatedBodyType as BodyType,
        lockedAt: new Date().toISOString(),
        measurements: {
          heightCm: user.heightCm,
          weightKg: currentWeight,
          bmi: calculatedBmi
        },
        confidence: 0.8
      });
    }
  }, [user.estimatedBodyType, user.heightCm]);

  const checkPosition = (landmarks: NormalizedLandmark[]): { valid: boolean; message: string } => {
    if (!landmarks || landmarks.length < 33) {
      return { valid: false, message: 'No person detected. Please stand in frame.' };
    }

    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    const nose = landmarks[0];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
      return { valid: true, message: 'Body detected - continuing scan' };
    }

    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    const hipWidth = Math.abs(rightHip.x - leftHip.x);
    const bodyWidth = (shoulderWidth + hipWidth) / 2;

    if (bodyWidth < 0.12) {
      return { valid: true, message: 'Too far - scanning anyway' };
    }
    if (bodyWidth > 0.5) {
      return { valid: true, message: 'Close to camera - scanning anyway' };
    }

    const verticalSpan = Math.max(
      Math.abs((nose?.y || 0) - (leftAnkle?.y || 0)),
      Math.abs((nose?.y || 0) - (rightAnkle?.y || 0))
    );
    if (verticalSpan < 0.65) {
      return { valid: true, message: 'Showing most of body - scanning' };
    }

    return { valid: true, message: 'Position OK! Scanning...' };
  };

  const handleLiveBodyAnalysis = useCallback((landmarks: NormalizedLandmark[]) => {
    if (scanState === 'scanning' && landmarks.length > 0) {
      setLiveLandmarks(landmarks);
      
      const position = checkPosition(landmarks);
      setPositionStatus(position.valid ? 'ready' : 'invalid');
      setPositionMessage(position.message);
      
      if (!position.valid) {
        return;
      }

      const elapsed = Date.now() - scanStartTimeRef.current;
      setScanDuration(elapsed);
      
      if (elapsed < 10000) {
        const analysis = analyzeBodyType(landmarks, calculatedBmi, currentHeight, currentWeight);
        bodyScansRef.current = [...bodyScansRef.current, analysis];
        setBodyScans(bodyScansRef.current);
        setScanProgress(Math.min(Math.floor((elapsed / 10000) * 100), 95));
      } else {
        if (bodyScansRef.current.length > 0) {
          const avgConfidence = bodyScansRef.current.reduce((sum, s) => sum + s.confidence, 0) / bodyScansRef.current.length;
          const typeCounts = bodyScansRef.current.reduce((acc, s) => {
            acc[s.bodyType] = (acc[s.bodyType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0][0];
          
          const finalAnalysis: BodyAnalysis = {
            ...bodyScansRef.current[0],
            bodyType: dominantType as BodyType,
            confidence: Math.min(avgConfidence + 0.1, 0.9)
          };
          setBodyAnalysis(finalAnalysis);
        }
        setScanProgress(100);
        setScanState('ready');
        setPositionStatus('idle');
      }
    }
  }, [scanState, calculatedBmi, currentHeight, currentWeight]);

  const startLiveScan = () => {
    setScanState('scanning');
    setLiveLandmarks([]);
    setBodyAnalysis(null);
    bodyScansRef.current = [];
    setBodyScans([]);
    setScanProgress(0);
    setScanDuration(0);
    setPositionStatus('checking');
    setPositionMessage('Checking position...');
    scanProgressRef.current = 0;
    scanStartTimeRef.current = Date.now();
  };

  const lockBodyProfile = async () => {
    if (!bodyAnalysis || !user) return;

    const profile: LockedBodyProfile = {
      bodyType: bodyAnalysis.bodyType,
      lockedAt: new Date().toISOString(),
      measurements: {
        heightCm: currentHeight,
        weightKg: currentWeight,
        bmi: calculatedBmi
      },
      confidence: bodyAnalysis.confidence
    };

    setLockedProfile(profile);

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    let monthlyPlan = null;

    const key = apiKey || (import.meta as any).env.VITE_API_KEY;
    if (key) {
      try {
        const ai = new GoogleGenAI({ apiKey: key });
        const prompt = `Generate a 30-day fitness plan for a user with:
        Body Type: ${bodyAnalysis.bodyType}
        BMI: ${calculatedBmi.toFixed(1)}
        Weight: ${currentWeight}kg
        Height: ${currentHeight}cm
        
        Return a JSON object with:
        - motivation: string (short quote)
        - sessions: array of objects { day: number (1-30), week: number (1-4), dayOfWeek: string, title: string, focus: string, exercises: array of { name: string, sets: number, reps: number, restSeconds: number }, duration: string }
        - nutrition: object { protein: string, carbs: string, fats: string }
        
        Create 4 weeks of workouts, 5-6 sessions per week. Alternate between strength, cardio, and rest days.
        Include variety: strength training, HIIT, cardio, flexibility, and active recovery.
        Return ONLY valid JSON, no markdown.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });

        let text = '';
        if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
          text = response.candidates[0].content.parts[0].text;
        } else if (typeof (response as any).text === 'function') {
          text = (response as any).text();
        } else if ((response as any).text) {
          text = (response as any).text;
        }

        const jsonString = text.replace(/```json|```/g, '').trim();
        monthlyPlan = JSON.parse(jsonString);
        monthlyPlan.generatedAt = new Date().toISOString();
        monthlyPlan.startDate = startDate.toISOString();
        monthlyPlan.endDate = endDate.toISOString();
        
        monthlyPlan.sessions = monthlyPlan.sessions.map((s: any, idx: number) => ({
          ...s,
          id: `session-${idx + 1}`,
          completed: false
        }));
      } catch (err) {
        console.error("Failed to generate plan:", err);
      }
    }

    const updatedUser = { 
      ...user, 
      heightCm: profile.measurements.heightCm,
      estimatedBodyType: profile.bodyType,
      weightLogs: [...(user.weightLogs || []), { 
        date: new Date().toISOString(), 
        weight: profile.measurements.weightKg 
      }],
      activePlan: monthlyPlan
    };
    await saveUser(updatedUser);
    onUpdateProfile();
    
    setScanState('locked');
    const planMsg = monthlyPlan ? `\n\nA 30-day personalized plan has been created with ${monthlyPlan.sessions.length} sessions!` : '';
    alert(`Body type locked: ${bodyAnalysis.bodyType.toUpperCase()}\n\nYour fitness plan will now be customized based on this body type.${planMsg}`);
  };

  const resetScan = () => {
    setScanState('idle');
    setBodyAnalysis(null);
    setLiveLandmarks([]);
    bodyScansRef.current = [];
    setBodyScans([]);
    setScanProgress(0);
    setScanDuration(0);
    setPositionStatus('idle');
    setPositionMessage('');
    scanProgressRef.current = 0;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <section>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-primary-100 dark:bg-primary-900/40 text-primary-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter">AI Body Scan</span>
            <h2 className="text-3xl font-black">Body Scanner</h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Scan, detect, and lock your body type for personalized fitness.</p>
        </div>
      </section>

      {lockedProfile && (
        <div className="bg-gradient-to-r from-primary-500/10 to-violet-500/10 dark:from-primary-900/20 dark:to-violet-900/20 p-6 rounded-3xl border border-primary-200 dark:border-primary-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{getBodyTypeIcon(lockedProfile.bodyType)}</div>
              <div>
                <div className="text-xs font-bold text-primary-600 uppercase tracking-widest">Locked Body Type</div>
                <div className="text-2xl font-black capitalize">{lockedProfile.bodyType}</div>
                <div className="text-xs text-slate-500">Locked on {new Date(lockedProfile.lockedAt).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black">{lockedProfile.measurements.bmi.toFixed(1)}</div>
              <div className="text-xs text-slate-500">BMI</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            {getBodyTypeDescription(lockedProfile.bodyType)}
          </div>
          <button 
            onClick={resetScan}
            className="mt-4 text-xs font-bold text-primary-600 hover:underline"
          >
            Rescan Body Type
          </button>
        </div>
      )}

      <AuthGuard user={user} requireMember>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="mb-4 p-4 bg-primary-50 dark:bg-primary-950/20 rounded-2xl text-sm text-primary-800 dark:text-primary-200 leading-relaxed border border-primary-100 dark:border-primary-900/30">
            <h4 className="font-black mb-1 flex items-center gap-2 uppercase text-xs tracking-widest">
              <span className="text-lg">📹</span> Live Body Scan
            </h4>
            <p>Stand in front of your camera with full body visible. The AI will analyze your proportions in real-time to detect your body type.</p>
          </div>

          {scanState === 'scanning' ? (
            <div>
              <FullBodyTracker 
                exercise={null}
                freedomMode={false}
                onLandmarksUpdate={handleLiveBodyAnalysis}
                showOverlay={true}
                showPostureAnalysis={false}
                smoothFactor={0.25}
              />
              <div className={`mt-4 p-3 rounded-xl ${positionStatus === 'invalid' ? 'bg-red-600' : positionStatus === 'ready' ? 'bg-green-600' : 'bg-black/70'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-bold text-sm">
                    {positionStatus === 'checking' ? 'CHECKING POSITION...' : 
                     positionStatus === 'ready' ? 'SCANNING BODY...' : 
                     'POSITION CHECK'}
                  </span>
                  {positionStatus === 'ready' && (
                    <span className="text-white font-black">{scanProgress}%</span>
                  )}
                </div>
                {positionStatus === 'ready' ? (
                  <>
                    <div className="w-full h-2 bg-slate-600 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary-500 to-violet-500 transition-all duration-300"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                    <p className="text-slate-300 text-xs mt-2">Stand still - analyzing body type</p>
                  </>
                ) : (
                  <p className="text-white text-xs mt-1">{positionMessage}</p>
                )}
              </div>
            </div>
          ) : scanState === 'ready' && bodyAnalysis ? (
            <div className="space-y-6">
              <div className="p-6 bg-primary-50 dark:bg-primary-950/20 rounded-3xl flex flex-col items-center text-center border border-primary-100">
                <div className="text-4xl mb-2">{getBodyTypeIcon(bodyAnalysis.bodyType)}</div>
                <div className="text-xs font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-2">Detected Body Type</div>
                <div className="text-3xl font-black text-primary-700 dark:text-primary-300 capitalize">{bodyAnalysis.bodyType}</div>
                <div className="px-4 py-1 bg-primary-200 dark:bg-primary-800 text-primary-800 dark:text-primary-100 rounded-full text-xs font-bold mt-2">
                  {Math.round(bodyAnalysis.confidence * 100)}% Confidence
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">Weight</div>
                  <div className="text-xl font-black">{currentWeight} kg</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">Height</div>
                  <div className="text-xl font-black">{currentHeight} cm</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">BMI</div>
                  <div className="text-xl font-black">{calculatedBmi.toFixed(1)}</div>
                </div>
              </div>

              {bodyAnalysis.recommendations && bodyAnalysis.recommendations.length > 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800">
                  <h4 className="font-bold mb-2 text-green-800 dark:text-green-200">Personalized Recommendations</h4>
                  <ul className="space-y-1">
                    {bodyAnalysis.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-green-700 dark:text-green-300">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button 
                onClick={lockBodyProfile}
                className="w-full bg-gradient-to-r from-primary-600 to-violet-600 text-white py-4 rounded-2xl font-black hover:opacity-90 transition-opacity shadow-lg"
              >
                🔒 LOCK BODY TYPE
              </button>
              <button 
                onClick={() => setScanState('idle')}
                className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
              >
                Rescan
              </button>
            </div>
          ) : scanState === 'locked' ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-black mb-2">Body Type Locked</h3>
              <p className="text-slate-500">Your body profile has been saved.</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">👤</div>
              <p className="text-slate-500 mb-4">Stand in front of your camera to scan your body</p>
              <button 
                onClick={startLiveScan}
                className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-black hover:bg-primary-700 transition-all"
              >
                START BODY SCAN
              </button>
            </div>
          )}
        </div>
      </AuthGuard>
    </div>
  );
};

export default BodyScanner;