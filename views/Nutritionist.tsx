
import React, { useState, useRef } from 'react';
import { User, MacroData } from '../types';
import { AuthGuard } from '../components/AuthGuard';
import { GoogleGenAI } from "@google/genai";
import { saveUser, logMeal } from '../services/DB';
import { CameraCapture } from '../components/CameraCapture';

const Nutritionist: React.FC<{ user: User; apiKey?: string; onMealLogged?: () => void }> = ({ user, apiKey }) => {
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MacroData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return <div className="p-12 text-center text-slate-400 font-medium">Loading user profile...</div>;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setImage(reader.result as string);
        runAnalysis(base64, file.type);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleCameraCapture = (capturedImage: string) => {
    const base64 = capturedImage.split(',')[1];
    const mimeType = capturedImage.split(';')[0].split(':')[1];
    setImage(capturedImage);
    runAnalysis(base64, mimeType);
  };

  const runAnalysis = async (base64: string, mimeType: string = "image/jpeg") => {
    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const key = apiKey || (import.meta as any).env.VITE_API_KEY;
      if (!key) throw new Error("API Key is missing");

      const ai = new GoogleGenAI({ apiKey: key });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            role: 'user',
            parts: [
              { text: "Analyze this meal. Return a JSON object with fields: mealName (string), calories (number), protein (number), carbs (number), fat (number). Return ONLY valid JSON, no markdown." },
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
      alert("Failed to analyze image. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (analysis && user) {
      const newLog = { ...analysis, date: new Date().toISOString() };
      const updatedUser = { 
        ...user, 
        mealLogs: [...(user.mealLogs || []), newLog] 
      };
      await saveUser(updatedUser);
      alert("Meal logged to your daily history!");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <section>
        <h2 className="text-3xl font-black mb-1">AI Nutritionist</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Snap a photo of your meal to track macros instantly.</p>
      </section>

      <AuthGuard user={user} requireMember>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Log Meal</h3>
          <button 
            onClick={() => setShowManualInput(!showManualInput)}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${showManualInput ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}
          >
            {showManualInput ? 'Use AI Analysis' : 'Manual Input'}
          </button>
        </div>

        {showManualInput ? (
          <ManualMealInput user={user} onMealLogged={() => { 
            window.location.reload();
          }} />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Analyze Meal</h3>
            <div 
              className={`aspect-video w-full rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center overflow-hidden relative ${image ? 'border-none' : ''}`}
            >
              {image ? (
                <img src={image} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <span className="text-4xl mb-2 block">🥗</span>
                  <p className="text-slate-400 font-medium">Provide a meal image</p>
                </div>
              )}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold flex-col">
                  <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mb-2" />
                  Calculating Macros...
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button 
                onClick={() => setShowCamera(true)}
                className="py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/10 flex items-center justify-center gap-2"
              >
                <span>📸</span> Live Cam
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <span>📁</span> Upload
              </button>
            </div>
            
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm min-h-[300px]">
            <h3 className="text-lg font-bold mb-6">Macro Report</h3>
            {analysis ? (
              <div className="space-y-6 animate-in zoom-in duration-300">
                <div className="text-center">
                  <h4 className="text-xl font-black text-primary-600">{analysis.mealName}</h4>
                  <p className="text-slate-500">Estimated Nutrition</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <MacroCard label="Calories" value={analysis.calories} unit="kcal" color="bg-orange-500" />
                  <MacroCard label="Protein" value={analysis.protein} unit="g" color="bg-blue-500" />
                  <MacroCard label="Carbs" value={analysis.carbs} unit="g" color="bg-green-500" />
                  <MacroCard label="Fat" value={analysis.fat} unit="g" color="bg-red-500" />
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={handleSave}
                    className="w-full bg-primary-600 text-white py-3 rounded-2xl font-bold hover:bg-primary-700 transition-all"
                  >
                    Log Meal to Daily Log
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                <div className="text-6xl mb-4">📋</div>
                <p className="font-medium text-slate-500">Provide a meal photo to see<br/>detailed nutritional breakdown</p>
              </div>
            )}
          </div>
        </div>
        )}

        {user.mealLogs && user.mealLogs.length > 0 && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Recent Meal History</h3>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{user.mealLogs.length} Meals Logged</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...user.mealLogs].reverse().slice(0, 6).map((log: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-primary-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-lg shadow-sm">
                      🍽️
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">{log.mealName}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {new Date(log.date).toLocaleDateString()} • {new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-800 dark:text-slate-200">{log.calories} <span className="text-xs font-bold text-slate-400">kcal</span></div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      P:{log.protein} C:{log.carbs} F:{log.fat}
                    </div>
                  </div>
                </div>
              ))}
            </div>
</div>
          )}
      </AuthGuard>

      {showCamera && (
        <CameraCapture 
          aspectRatio="video"
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

const MacroCard: React.FC<{ label: string; value: number; unit: string; color: string }> = ({ label, value, unit, color }) => (
  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-4">
    <div className={`w-2 h-10 rounded-full ${color}`} />
    <div>
      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</div>
      <div className="text-xl font-black">{value} <span className="text-sm font-medium opacity-50">{unit}</span></div>
    </div>
  </div>
);

const ManualMealInput: React.FC<{ user: User; onMealLogged: () => void }> = ({ user, onMealLogged }) => {
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!mealName || !calories) return;
    setIsSaving(true);
    try {
      await logMeal(user.id, mealName, parseInt(calories), parseInt(protein) || 0, parseInt(carbs) || 0, parseInt(fat) || 0);
      setMealName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      onMealLogged();
    } catch (err) {
      console.error(err);
      alert('Failed to log meal');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <h3 className="text-lg font-bold mb-6">Manually Enter Meal</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Meal Name</label>
          <input
            type="text"
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            placeholder="e.g., Breakfast, Lunch, Snack..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 ring-primary-500 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Calories (kcal)</label>
          <input
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="0"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 ring-primary-500 transition-all"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Protein (g)</label>
            <input
              type="number"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 ring-primary-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Carbs (g)</label>
            <input
              type="number"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 ring-primary-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Fat (g)</label>
            <input
              type="number"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 ring-primary-500 transition-all"
            />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || !mealName || !calories}
          className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Log Meal'}
        </button>
      </div>
    </div>
  );
};

export default Nutritionist;
