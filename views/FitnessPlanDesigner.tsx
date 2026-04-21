import React, { useState, useMemo } from 'react';
import { User, FitnessProfile, FitnessPlan } from '../types';
import { AuthGuard } from '../components/AuthGuard';
import { GoogleGenAI } from "@google/genai";
import { saveUser, deletePlanFromHistory } from '../services/DB';
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('squat');
  const [liveStats, setLiveStats] = useState({ reps: 0, duration: 0, calories: 0 });
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [autoDetect, setAutoDetect] = useState(false);

  const bodyType = user.estimatedBodyType as BodyType | undefined;

  const handleDeletePlan = async () => {
    if (!confirm('Are you sure you want to delete your current plan? This cannot be undone.')) return;
    const updatedUser = { ...user, activePlan: null };
    await saveUser(updatedUser);
    onPlanGenerated();
    setShowDeleteConfirm(false);
  };

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
         const bmi = user.heightCm ? (currentWeight / Math.pow(user.heightCm / 100, 2)).toFixed(1) : 'N/A';
         bodyTypeContext = `USER BODY PROFILE:
- Body Type: ${bodyType}
- Description: ${bodyDesc}
- Weight: ${currentWeight}kg
- Height: ${user.heightCm}cm
- BMI: ${bmi}

BODY TYPE-SPECIFIC RECOMMENDATIONS by AI Coach:

=== ECTOMORPH (lean, fast metabolism, difficulty gaining) ===
Focus: Strength & muscle building.
Exercises: Heavy compound lifts (squats, deadlifts, bench press, rows).
Volume: 3-5 sets × 6-10 reps (heavier weights). Rest 60-90s.
Cardio: Limit to 2-3x/week (avoid excess).
Nutrition: Calorie surplus, higher carbs (45-55%), protein 25-30%.
Frequency: 4-5 days/week, allow full recovery.

=== MESOMORPH (athletic, muscular, responsive) ===
Focus: Balanced strength & hypertrophy.
Exercises: Mix compound & isolation, varied intensity.
Volume: Alternate heavy (4-6 reps) and hypertrophy (8-12 reps). Rest 45-75s.
Cardio: 2-3 moderate sessions.
Nutrition: Balanced - carbs 40-50%, protein 25-35%, fat 20-30%.
Frequency: 5 days (push/pull/legs or upper/lower split).

=== ENDOMORPH (solid build, stores fat easily) ===
Focus: Fat loss, metabolic conditioning.
Exercises: Full-body circuits, supersets, HIIT, compound movements.
Volume: 3-4 sets × 10-15 reps, shorter rest 30-45s.
Cardio: 4-6 sessions/week including 20-30min post-strength.
Nutrition: Calorie deficit, lower carbs (30-40%), higher protein (30-40%).
Frequency: 5-6 days/week with active recovery.

=== BALANCED ===
Focus: Overall fitness maintenance.
Exercises: Balanced strength, cardio, flexibility mix.
Volume: 3-4 sets × 8-12 reps, rest 60s.
Cardio: 3 sessions/week.
Nutrition: Carbs 45%, protein 30%, fat 25%.
Frequency: 4 days strength, 2 cardio, 1 active recovery.

ADDITIONAL TAILORING based on specific measurements (apply if applicable):
- Narrow shoulders (<0.9 shoulder-hip ratio): Overhead press, lateral raises, push-ups 2x/week
- Broad shoulders (>1.25): Emphasize back rows, pull-ups, squats for lower-body development
- Long limbs: Controlled tempo, full ROM; avoid max weight, focus on form
- Compact build: Handle heavier loads; progressive overload
- Slim waist: Core stability and oblique work
- Thick waist: Cardio focus and core definition exercises
- Long legs: Hip hinge and glute activation; proper squat form crucial
- Short legs: Quad-dominant movements (squats, leg press)

GOAL-BASED FOCUS:
- Weight loss: Increase cardio frequency, circuit training, shorter rest periods
- Muscle gain: Progressive overload, increased volume, calorie surplus focus
- Endurance: Higher rep ranges (12-20), circuit-style, shorter rest
- Flexibility: Include mobility drills, dynamic stretches, yoga poses

Create a 30-day progressive plan with 4 weekly phases. Each week should increase intensity or volume gradually.`;
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
- Sit-up
- Bicep Curl
- Dumbbell Shoulder Press
- Dumbbell Rows
- Tricep Extensions
- Lateral Shoulder Raises
- Jumping Jacks

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
      const completePlan = { ...plan, generatedAt: new Date().toISOString(), id: crypto.randomUUID() };

      // Move current active plan to history before saving new one
      const planHistory = user.planHistory || [];
      if (user.activePlan) {
        planHistory.push({
          ...user.activePlan,
          endedAt: new Date().toISOString()
        });
      }

      const updatedUser = { 
        ...user, 
        fitnessProfile: profile, 
        activePlan: completePlan,
        planHistory: planHistory
      };
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
                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-500 text-sm font-medium hover:text-red-700 flex items-center gap-1"
                  >
                    🗑️ Delete Plan
                  </button>
                </div>
              </div>
            )}

            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-sm mx-4">
                  <h3 className="text-lg font-bold mb-2">Delete Plan?</h3>
                  <p className="text-slate-500 text-sm mb-4">Are you sure you want to delete your current fitness plan? This action cannot be undone.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeletePlan}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Past Plans History */}
            {user.planHistory && user.planHistory.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-slate-500">📚</span> Past Plans
                </h3>
                <div className="space-y-3">
                  {user.planHistory.map((plan: FitnessPlan, idx: number) => (
                    <div key={plan.id || idx} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-sm">{plan.motivation || 'Plan'}</div>
                          <div className="text-xs text-slate-500">
                            Generated {new Date(plan.generatedAt).toLocaleDateString()}
                            {plan.endedAt && ` • Ended ${new Date(plan.endedAt).toLocaleDateString()}`}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {plan.dailyWorkouts?.length || 0} workouts • {plan.dailyWorkouts?.reduce((acc, w) => acc + (w.exercises?.length || 0), 0) || 0} total exercises
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            if (!plan.id) return;
                            if (!confirm('Delete this past plan?')) return;
                            await deletePlanFromHistory(user.id, plan.id);
                            onPlanGenerated(); // Refresh user data
                          }}
                          className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1 rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
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
                    <option value="dumbbell_shoulder_press">Dumbbell Shoulder Press</option>
                    <option value="dumbbell_rows">Dumbbell Rows</option>
                    <option value="tricep_extensions">Tricep Extensions</option>
                    <option value="lateral_shoulder_raises">Lateral Shoulder Raises</option>
                    <option value="jumping_jacks">Jumping Jacks</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoDetect}
                      onChange={() => setAutoDetect(!autoDetect)}
                      className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                      Auto-Detect
                    </span>
                  </label>
                </div>
              </div>

              <FullBodyTracker 
                exercise={selectedExercise}
                freedomMode={autoDetect}
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