
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, PostureAnalysis } from '../types';
import { AuthGuard } from '../components/AuthGuard';
import { GoogleGenAI } from "@google/genai";
import { saveUser, getUserGymLogs, logWorkout } from '../services/DB';
import { CameraCapture } from '../components/CameraCapture';

const PostureChecker: React.FC<{ user: User; apiKey?: string }> = ({ user, apiKey }) => {
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PostureAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [gymLogs, setGymLogs] = useState<any[]>([]);
  const [showManualWorkout, setShowManualWorkout] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDuration, setWorkoutDuration] = useState('');
  const [workoutExercises, setWorkoutExercises] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getUserGymLogs(user.id).then(setGymLogs).catch(console.error);
  }, [user.id]);

  const gymAttendance = useMemo(() => {
    if (!gymLogs || gymLogs.length === 0) return { total: 0, thisWeek: 0, last7Days: [] };
    
    const normalizedLogs = gymLogs.map(log => log.date?.split('T')[0] || log.date).filter(Boolean);
    const uniqueDays = [...new Set(normalizedLogs)].sort();
    
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setUTCDate(weekStart.getUTCDate() - 7);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    const thisWeek = uniqueDays.filter(d => d >= weekStartStr && d <= today).length;
    
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      last7Days.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' }),
        active: normalizedLogs.includes(dateStr)
      });
    }
    
    return { total: uniqueDays.length, thisWeek, last7Days };
  }, [gymLogs]);

  if (!user) return <div className="p-12 text-center text-slate-400 font-medium">Loading user profile...</div>;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setImage(reader.result as string);
        runCheck(base64, file.type);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleCameraCapture = (capturedImage: string) => {
    const base64 = capturedImage.split(',')[1];
    const mimeType = capturedImage.split(';')[0].split(':')[1];
    setImage(capturedImage);
    runCheck(base64, mimeType);
  };

  const runCheck = async (base64: string, mimeType: string = "image/jpeg") => {
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const key = apiKey || (import.meta as any).env.VITE_API_KEY;
      if (!key) throw new Error("API Key is missing");

      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: "Analyze the posture in this image. Return a JSON object with: score (number 0-100), findings (array of strings), recommendations (array of strings). Focus on alignment. Return ONLY valid JSON, no markdown." },
              { inlineData: { mimeType, data: base64 } }
            ]
          }
        ]
      });

      const text = (response as any).text;
      const jsonString = text.replace(/```json|```/g, '').trim();
      const data = JSON.parse(jsonString);
      setAnalysis(data);
    } catch (err) {
      console.error(err);
      alert("Posture check failed. Make sure you are clearly visible.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (analysis && user) {
      const newLog = { ...analysis, date: new Date().toISOString() };
      const updatedUser = { 
        ...user, 
        postureLogs: [...(user.postureLogs || []), newLog] 
      };
      await saveUser(updatedUser);
      alert("Posture analysis saved to profile!");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <section>
        <h2 className="text-3xl font-black mb-1">Posture Analysis</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Identify alignment issues and get corrective exercises.</p>
      </section>

      <AuthGuard user={user} requireMember>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950 rounded-xl flex items-center justify-center text-xl">📐</div>
              <h3 className="text-lg font-bold">Input Photo</h3>
            </div>
            <div 
              className="aspect-square w-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center overflow-hidden relative"
            >
              {image ? (
                <img src={image} className="w-full h-full object-contain bg-slate-100 dark:bg-slate-800" />
              ) : (
                <div className="text-center p-8">
                  <p className="text-slate-500 mb-2 font-bold">Side-view photo required</p>
                  <p className="text-slate-400 text-xs">Stand against a plain background in fitted clothing for best results.</p>
                </div>
              )}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm flex items-center justify-center text-white flex-col">
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
                  <span className="font-bold">Analyzing Alignment...</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-3 mt-6">
              <button 
                onClick={() => setShowCamera(true)}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
              >
                <span>📸</span> START LIVE CAMERA
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-2xl font-bold hover:bg-slate-200 transition-colors"
              >
                CHOOSE FROM GALLERY
              </button>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>

          <div className="space-y-6">
            {analysis ? (
              <div className="animate-in slide-in-from-right duration-500 space-y-6">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
                  <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                      <circle 
                        cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                        strokeDasharray={364.4} 
                        strokeDashoffset={364.4 - (364.4 * analysis.score / 100)}
                        className="text-indigo-600 transition-all duration-1000 ease-out" 
                      />
                    </svg>
                    <span className="text-3xl font-black">{analysis.score}</span>
                  </div>
                  <h4 className="text-lg font-bold">Posture Score</h4>
                  <p className="text-slate-500 text-sm mt-1">{analysis.score > 80 ? 'Excellent' : analysis.score > 60 ? 'Good' : 'Needs Improvement'}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <span className="text-red-500">📍</span> Findings
                  </h4>
                  <ul className="space-y-3">
                    {analysis.findings.map((f, i) => (
                      <li key={i} className="text-sm p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300 border-l-4 border-red-500">
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <span className="text-green-500">✅</span> Recommended Exercises
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.recommendations.map((r, i) => (
                      <span key={i} className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs font-bold border border-green-100 dark:border-green-900/50">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                >
                  Save Analysis to Profile
                </button>
              </div>
            ) : (
              <div className="h-full bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-100 dark:border-slate-800 border-dashed flex flex-col items-center justify-center opacity-40">
                <div className="text-6xl mb-6">🦒</div>
                <h4 className="text-xl font-black mb-2">Posture Score Card</h4>
                <p className="text-center text-sm">Provide a side-view photo to get your posture analyzed by our AI system.</p>
              </div>
            )}
          </div>
        </div>
      </AuthGuard>

      <AuthGuard user={user} requireMember>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">🏋️</span>
              Gym Attendance
            </h3>
            <span className="text-2xl font-black text-emerald-600">{gymAttendance.total} Visits</span>
          </div>
          <div className="flex justify-between items-end gap-1 mt-auto">
            {gymAttendance.last7Days.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                  day.active 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  {day.active ? '✓' : ''}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{day.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs font-medium text-slate-500">
            This week: <span className="text-emerald-600 font-bold">{gymAttendance.thisWeek}</span> visits
          </div>
          <button 
            onClick={() => setShowManualWorkout(!showManualWorkout)}
            className="mt-4 text-xs font-bold text-primary-600 hover:underline"
          >
            + Log Manual Workout
          </button>
          {showManualWorkout && (
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3">
              <input
                type="text"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="Workout name..."
                className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 outline-none"
              />
              <input
                type="text"
                value={workoutDuration}
                onChange={(e) => setWorkoutDuration(e.target.value)}
                placeholder="Duration (e.g., 45 mins)..."
                className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 outline-none"
              />
              <input
                type="text"
                value={workoutExercises}
                onChange={(e) => setWorkoutExercises(e.target.value)}
                placeholder="Exercises (comma separated)..."
                className="w-full px-3 py-2 rounded-lg text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 outline-none"
              />
              <button
                onClick={async () => {
                  if (workoutName) {
                    const exercises = workoutExercises.split(',').map(e => e.trim()).filter(Boolean);
                    await logWorkout(user.id, workoutName, workoutDuration, exercises);
                    setWorkoutName('');
                    setWorkoutDuration('');
                    setWorkoutExercises('');
                    setShowManualWorkout(false);
                    window.location.reload();
                  }
                }}
                className="w-full bg-primary-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-primary-700"
              >
                Save Workout
              </button>
            </div>
          )}
        </div>
      </AuthGuard>

      {showCamera && (
        <CameraCapture 
          aspectRatio="square"
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

export default PostureChecker;
