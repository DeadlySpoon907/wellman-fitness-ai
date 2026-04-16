import React, { useState, useMemo } from 'react';
import { User, FitnessProfile } from '../types';
import { AuthGuard } from '../components/AuthGuard';
import { GoogleGenAI } from "@google/genai";
import { saveUser } from '../services/DB';
import { FullBodyTracker } from '../components/FullBodyTracker';
import { getBodyTypeDescription, getBodyTypeIcon, BodyType } from '../utils/bodyAnalysis';
import type { ExerciseType } from '../types';

type DesignerMode = 'plan' | 'live';

const FitnessPlanDesigner: React.FC<{ user: User; onPlanGenerated: () => void; apiKey?: string }> = ({ user, onPlanGenerated, apiKey }) => {
  const [mode, setMode] = useState<DesignerMode>('plan');
  const [profile, setProfile] = useState<FitnessProfile>(() => ({
    goal: 'weight-loss',
    intensity: 'beginner',
    location: 'home',
    ...(user?.fitnessProfile || {}),
    focusAreas: user?.fitnessProfile?.focusAreas || ['Core']
  }));
  const [isGenerating, setIsGenerating] = useState(false);

  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('squat');
  const [liveStats, setLiveStats] = useState({ reps: 0, duration: 0, calories: 0 });
  const [isLiveActive, setIsLiveActive] = useState(false);

  const bodyType = user.estimatedBodyType as BodyType | undefined;

  if (!user) return <div className="p-12 text-center text-slate-400 font-medium">Loading user profile...</div>;

  const handleFocusToggle = (area: string) => {
    setProfile(prev => {
      const currentAreas = prev.focusAreas || [];
      return {
        ...prev,
        focusAreas: currentAreas.includes(area) 
          ? currentAreas.filter(a => a !== area)
          : [...currentAreas, area]
      };
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const currentWeight = user.weightLogs.length > 0 
        ? user.weightLogs[user.weightLogs.length - 1].weight 
        : 70;
      
      const key = apiKey || (import.meta as any).env.VITE_API_KEY;
      if (!key) throw new Error("API Key is missing");

      const ai = new GoogleGenAI({ apiKey: key });

      let bodyTypeContext = '';
      if (bodyType) {
        const bodyDesc = getBodyTypeDescription(bodyType);
        bodyTypeContext = `
Body Type: ${bodyType} - ${bodyDesc}
This body type influences:
- Ectomorph: Faster metabolism, harder to gain muscle, responds well to strength training
- Mesomorph: Gains muscle easily, responds to varied training
- Endomorph: Tends to store fat, benefits from cardio and higher protein`;
      }

      const prompt = `Generate a daily fitness and diet plan for a user with:
Weight: ${currentWeight}kg
Height: ${user.heightCm}cm
Goal: ${profile.goal}
Level: ${profile.intensity}
Location: ${profile.location}
Focus: ${profile.focusAreas.join(', ')}
${bodyTypeContext}

IMPORTANT: Only include exercises from this list that the AI pose detection system can track:
- Squat
- Push-up
- Lunge

Return a JSON object with:
- motivation: string (short quote)
- dailyWorkouts: array of objects { name: string, duration: string, exercises: string[] } - only use exercises from the list above
- dietPlan: object { meals: array of { name: string, foods: string[], calories: number, protein: number, carbs: number, fats: number }[], hydration: string, notes: string }
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
      } else {
        throw new Error("Unable to parse AI response");
      }
      
      const jsonString = text.replace(/```json|```/g, '').trim();
      const plan = JSON.parse(jsonString);
      const completePlan = { ...plan, generatedAt: new Date().toISOString() };
      const updatedUser = { ...user, fitnessProfile: profile, activePlan: completePlan };
      await saveUser(updatedUser);
      onPlanGenerated();
      alert("Success! Your personalized plan is ready on your dashboard.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Plan generation failed:", err);
      alert(`Failed to generate plan: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const activePlan = user.activePlan;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black mb-1 text-primary-600 dark:text-primary-400">Plan Designer</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">AI-powered fitness planning based on your body type.</p>
          </div>
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setMode('plan')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                mode === 'plan' 
                  ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              📋 Plan
            </button>
            <button
              onClick={() => setMode('live')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                mode === 'live' 
                  ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              🔥 Live Workout
            </button>
          </div>
        </div>
      </section>

      {bodyType && (
        <div className="bg-gradient-to-r from-violet-500/10 to-primary-500/10 dark:from-violet-900/20 dark:to-primary-900/20 p-6 rounded-3xl border border-violet-200 dark:border-violet-800">
          <div className="flex items-center gap-4">
            <div className="text-4xl">{getBodyTypeIcon(bodyType)}</div>
            <div>
              <div className="text-xs font-bold text-violet-600 uppercase tracking-widest">Body Type Profile</div>
              <div className="text-xl font-black capitalize">{bodyType}</div>
              <div className="text-sm text-slate-500">{getBodyTypeDescription(bodyType)}</div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Your plan is customized based on your locked body type profile from the Body Analyzer.
          </p>
        </div>
      )}

      {!bodyType && (
        <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-3xl border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-bold text-orange-800 dark:text-orange-200">Body Type Not Detected</div>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Scan your body in the BMI Estimator to get personalized fitness plans based on your body type.
              </p>
            </div>
          </div>
        </div>
      )}

      <AuthGuard user={user} requireMember>
        {mode === 'plan' && (
          <>
            {activePlan && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-primary-200 dark:border-primary-800 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/40 rounded-xl flex items-center justify-center text-2xl">🎯</div>
                  <div>
                    <h3 className="text-lg font-black">Your Active Plan</h3>
                    <p className="text-xs text-slate-500">Generated {new Date(activePlan.generatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {activePlan.motivation && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl mb-4">
                    <p className="text-sm italic text-slate-600 dark:text-slate-300">"{activePlan.motivation}"</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {activePlan.dailyWorkouts?.map((workout: any, idx: number) => (
                    <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <div className="font-bold text-sm mb-2">{workout.name}</div>
                      <div className="text-xs text-slate-500 mb-2">{workout.duration}</div>
                      <div className="flex flex-wrap gap-1">
                        {workout.exercises?.slice(0, 3).map((ex: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-white dark:bg-slate-700 rounded text-[10px] font-medium">
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {activePlan.nutrition && (
                  <div className="mt-4 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                    <div className="text-xs font-bold text-violet-600 uppercase mb-2">Nutrition Guidelines</div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div><span className="font-bold">Protein:</span> {activePlan.nutrition.protein}</div>
                      <div><span className="font-bold">Carbs:</span> {activePlan.nutrition.carbs}</div>
                      <div><span className="font-bold">Fats:</span> {activePlan.nutrition.fats}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-10">
              
              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span className="text-primary-500">01</span> Primary Goal
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['weight-loss', 'muscle-gain', 'endurance', 'flexibility'] as const).map(goal => (
                    <button
                      key={goal}
                      onClick={() => setProfile(p => ({ ...p, goal }))}
                      className={`p-4 rounded-2xl border-2 transition-all text-sm font-bold capitalize ${
                        profile.goal === goal 
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/30 text-primary-600' 
                          : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                      }`}
                    >
                      {goal.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <span className="text-primary-500">02</span> Experience Level
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['beginner', 'intermediate', 'advanced'] as const).map(level => (
                    <button
                      key={level}
                      onClick={() => setProfile(p => ({ ...p, intensity: level }))}
                      className={`p-4 rounded-2xl border-2 transition-all text-sm font-bold capitalize ${
                        profile.intensity === level 
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/30 text-primary-600' 
                          : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <span className="text-primary-500">03</span> Location
                  </h3>
                  <div className="flex flex-col gap-2">
                    {(['home', 'gym', 'outdoors'] as const).map(loc => (
                      <button
                        key={loc}
                        onClick={() => setProfile(p => ({ ...p, location: loc }))}
                        className={`p-4 text-left rounded-2xl border-2 transition-all text-sm font-bold capitalize ${
                          profile.location === loc 
                            ? 'border-primary-600 bg-primary-50 dark:bg-primary-950/30 text-primary-600' 
                            : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                        }`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <span className="text-primary-500">04</span> Focus Areas
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {['Core', 'Legs', 'Upper Body', 'Cardio', 'Mobility', 'Back'].map(area => (
                      <button
                        key={area}
                        onClick={() => handleFocusToggle(area)}
                        className={`px-4 py-2 rounded-full border-2 transition-all text-xs font-bold ${
                          profile.focusAreas?.includes(area)
                            ? 'bg-primary-600 border-primary-600 text-white'
                            : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200'
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className={`w-full py-5 rounded-3xl font-black text-xl transition-all shadow-xl shadow-primary-500/20 ${
                    isGenerating 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' 
                      : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95'
                  }`}
                >
                  {isGenerating ? 'GENERATING PLAN...' : 'GENERATE PERSONALIZED PLAN'}
                </button>
                <p className="text-center text-xs text-slate-400 mt-4 font-medium uppercase tracking-widest">
                  {bodyType 
                    ? 'AI uses your body type profile for personalized recommendations' 
                    : 'Scan your body type for personalized recommendations'}
                </p>
              </div>
            </div>
          </>
        )}

        {mode === 'live' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Select Exercise
                  </label>
                  <select
                    value={selectedExercise}
                    onChange={(e) => setSelectedExercise(e.target.value as ExerciseType)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-sm"
                  >
                    <option value="bicep_curl">Bicep Curl</option>
                    <option value="squat">Squat</option>
                    <option value="pushup">Push-up</option>
                    <option value="lunge">Lunge</option>
                    <option value="situp">Sit-up</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => {}}
                      className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      disabled
                    />
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      Auto-Detect (Pro)
                    </span>
                  </label>
                </div>
              </div>

              <FullBodyTracker 
                exercise={selectedExercise}
                freedomMode={false}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                <div className="text-4xl font-black text-primary-600">0</div>
                <div className="text-sm font-bold text-slate-500 mt-1">Total Reps</div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                <div className="text-4xl font-black text-emerald-600">0:00</div>
                <div className="text-sm font-bold text-slate-500 mt-1">Duration</div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                <div className="text-4xl font-black text-orange-500">0</div>
                <div className="text-sm font-bold text-slate-500 mt-1">Est. Calories</div>
              </div>
            </div>
          </div>
        )}
      </AuthGuard>
    </div>
  );
};

export default FitnessPlanDesigner;