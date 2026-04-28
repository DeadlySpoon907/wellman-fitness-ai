import React, { useState, useEffect } from 'react';
import { User, FitnessProfile, FitnessPlan } from '../types';
import { AuthGuard } from '../components/AuthGuard';
import { GoogleGenAI } from "@google/genai";
import { saveUser } from '../services/DB';
import { FullBodyTracker } from '../components/FullBodyTracker';
import { getBodyTypeDescription, getBodyTypeIcon, BodyType } from '../utils/bodyAnalysis';
import type { ExerciseType } from '../types';

type DesignerMode = 'plan' | 'live';

const FITNESS_TITLE_MAP: Record<string, string> = {
  'weight-loss': 'Fat Burn Blast',
  'muscle-gain': 'Muscle Builder',
  'endurance': 'Endurance Boost',
  'flexibility': 'Flexibility Focus',
  'general-fitness': 'Full Body Fitness'
};

const DEFAULT_MOTIVATIONS = [
  "Consistency is key!",
  "Progress, not perfection.",
  "Every workout counts.",
  "Stay focused, stay strong.",
  "One day at a time.",
  "Your body can do it, your mind needs to believe.",
  "Sweat is just fat crying.",
  "The only bad workout is the one that didn't happen."
];

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Predefined workout templates for fallback generation
const FALLBACK_WORKOUTS: Record<string, Array<{ name: string; duration: string; exercises: string[] }>> = {
  'weight-loss': [
    { name: 'HIIT Cardio', duration: '25 mins', exercises: ['Jumping Jacks', 'Squat', 'Push-up', 'Lunge'] },
    { name: 'Full Body Circuit', duration: '30 mins', exercises: ['Squat', 'Push-up', 'Bicep Curl', 'Sit-up', 'Jumping Jacks'] },
    { name: 'Core & Cardio', duration: '20 mins', exercises: ['Sit-up', 'Jumping Jacks', 'Lunge'] },
    { name: 'Strength & Burn', duration: '35 mins', exercises: ['Squat', 'Dumbbell Shoulder Press', 'Dumbbell Rows', 'Tricep Extensions'] },
    { name: 'Active Recovery', duration: '15 mins', exercises: ['Sit-up', 'Lateral Shoulder Raises'] },
    { name: 'Full Body Blast', duration: '30 mins', exercises: ['Push-up', 'Squat', 'Lunge', 'Bicep Curl'] },
    { name: 'Rest Day', duration: '0 mins', exercises: [] }
  ],
  'muscle-gain': [
    { name: 'Upper Body Strength', duration: '45 mins', exercises: ['Push-up', 'Dumbbell Shoulder Press', 'Dumbbell Rows', 'Bicep Curl', 'Tricep Extensions'] },
    { name: 'Lower Body Power', duration: '40 mins', exercises: ['Squat', 'Lunge', 'Jumping Jacks'] },
    { name: 'Full Body Hypertrophy', duration: '50 mins', exercises: ['Push-up', 'Squat', 'Dumbbell Rows', 'Lunge'] },
    { name: ' Arms & Core', duration: '35 mins', exercises: ['Bicep Curl', 'Tricep Extensions', 'Dumbbell Shoulder Press', 'Sit-up'] },
    { name: 'Chest & Back', duration: '45 mins', exercises: ['Push-up', 'Dumbbell Rows', 'Dumbbell Shoulder Press'] },
    { name: 'Legs Day', duration: '40 mins', exercises: ['Squat', 'Lunge', 'Jumping Jacks'] },
    { name: 'Rest Day', duration: '0 mins', exercises: [] }
  ],
  'endurance': [
    { name: 'Cardio Endurance', duration: '30 mins', exercises: ['Jumping Jacks', 'Sit-up'] },
    { name: 'Circuit Training', duration: '45 mins', exercises: ['Squat', 'Push-up', 'Lunge', 'Bicep Curl'] },
    { name: 'HIIT Stamina', duration: '25 mins', exercises: ['Jumping Jacks', 'Squat', 'Push-up', 'Lunge'] },
    { name: 'Full Body Endurance', duration: '50 mins', exercises: ['Squat', 'Push-up', 'Dumbbell Shoulder Press', 'Dumbbell Rows', 'Sit-up'] },
    { name: 'Active Recovery', duration: '20 mins', exercises: ['Sit-up', 'Lateral Shoulder Raises'] },
    { name: 'Mixed Circuit', duration: '40 mins', exercises: ['Squat', 'Push-up', 'Bicep Curl', 'Tricep Extensions', 'Jumping Jacks'] },
    { name: 'Rest Day', duration: '0 mins', exercises: [] }
  ],
  'flexibility': [
    { name: 'Flexibility Flow', duration: '20 mins', exercises: ['Sit-up', 'Lateral Shoulder Raises'] },
    { name: 'Mobility Session', duration: '25 mins', exercises: ['Sit-up', 'Lunge'] },
    { name: 'Stretch & Recovery', duration: '15 mins', exercises: ['Sit-up'] },
    { name: 'Yoga-Inspired', duration: '30 mins', exercises: ['Squat', 'Lunge', 'Sit-up'] },
    { name: 'Full Body Mobility', duration: '35 mins', exercises: ['Squat', 'Push-up', 'Lunge', 'Sit-up'] },
    { name: 'Gentle Flow', duration: '20 mins', exercises: ['Sit-up', 'Lateral Shoulder Raises', 'Jumping Jacks'] },
    { name: 'Rest Day', duration: '0 mins', exercises: [] }
  ]
};

const FALLBACK_MEAL_TEMPLATES = [
  {
    name: "High Protein Breakfast",
    foods: ["Egg white omelette", "Whole grain toast", "Greek yogurt"],
    calories: 450,
    protein: 35,
    carbs: 40,
    fats: 15
  },
  {
    name: "Balanced Lunch",
    foods: ["Grilled chicken breast", "Brown rice", "Steamed vegetables"],
    calories: 550,
    protein: 40,
    carbs: 55,
    fats: 18
  },
  {
    name: "Protein-rich Dinner",
    foods: ["Salmon fillet", "Quinoa", "Mixed salad"],
    calories: 600,
    protein: 45,
    carbs: 45,
    fats: 25
  },
  {
    name: "Healthy Snack Pack",
    foods: ["Almonds", "Apple", "Protein bar"],
    calories: 300,
    protein: 15,
    carbs: 35,
    fats: 12
  }
];

const FITNESS_PROFILE_DEFAULTS: FitnessProfile = {
  goal: 'weight-loss',
  intensity: 'beginner',
  location: 'home',
  focusAreas: ['Core']
};

const FitnessPlanDesigner: React.FC<{ 
  user: User; 
  onPlanGenerated: () => void; 
  onNavigateToScan?: () => void;
  apiKey?: string 
}> = ({ user, onPlanGenerated, onNavigateToScan, apiKey }) => {
    const [mode, setMode] = useState<DesignerMode>('plan');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('squat');
    const [durationSeconds, setDurationSeconds] = useState(0);
    const [liveStats, setLiveStats] = useState({ reps: 0 });
    const [isLiveActive, setIsLiveActive] = useState(false);
    const [autoDetect, setAutoDetect] = useState(false);
    const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

    // Cleanup timer interval on unmount or when leaving live mode
    useEffect(() => {
      return () => {
        if (timerInterval) {
          clearInterval(timerInterval);
        }
      };
    }, [timerInterval]);

  const bodyType = user.estimatedBodyType as BodyType | undefined;

  // Use user's existing fitness profile or defaults
  const profile: FitnessProfile = user.fitnessProfile || FITNESS_PROFILE_DEFAULTS;

  const handleDeletePlan = async () => {
    if (!confirm('Are you sure you want to delete your current plan? This cannot be undone.')) return;
    try {
      const updatedUser = { ...user, activePlan: null };
      await saveUser(updatedUser);
      onPlanGenerated();
      setShowDeleteConfirm(false);
      alert('Plan deleted successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Failed to delete plan:", err);
      alert(`Failed to delete plan: ${message}`);
    }
  };

  if (!user) return <div className="p-12 text-center text-slate-400 font-medium">Loading user profile...</div>;

  // Generate a fallback plan when Gemini is not responding
  const generateFallbackPlan = (): FitnessPlan => {
    const motivation = DEFAULT_MOTIVATIONS[Math.floor(Math.random() * DEFAULT_MOTIVATIONS.length)];
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today.getTime() + 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const workouts = FALLBACK_WORKOUTS[profile.goal] || FALLBACK_WORKOUTS['weight-loss'];
    const dailyWorkouts = workouts.map((w, i) => ({
      name: w.name,
      duration: w.duration,
      exercises: w.exercises
    }));

    // Generate detailed sessions for progress tracking (Dashboard/FitnessPlanTracker)
    const sessions = dailyWorkouts.map((dw, idx) => {
      const week = Math.floor(idx / 7) + 1;
      return {
        id: crypto.randomUUID(),
        day: idx + 1,
        week,
        dayOfWeek: DAY_NAMES[idx % 7],
        title: dw.name,
        focus: dw.name.split(' ')[0],
        exercises: dw.exercises.map(ex => ({ name: ex, sets: 3, reps: 12, restSeconds: 60 })),
        duration: dw.duration,
        completed: false,
        completedAt: undefined
      };
    });

    // Generate nutrition plan
    const baseMultiplier = profile.intensity === 'advanced' ? 1.2 : profile.intensity === 'intermediate' ? 1.1 : 1.0;
    const protein = profile.goal === 'muscle-gain' ? Math.round(180 * baseMultiplier) : profile.goal === 'weight-loss' ? Math.round(140 * baseMultiplier) : Math.round(160 * baseMultiplier);
    const carbs = profile.goal === 'muscle-gain' ? Math.round(280 * baseMultiplier) : profile.goal === 'weight-loss' ? Math.round(220 * baseMultiplier) : Math.round(250 * baseMultiplier);
    const fats = profile.goal === 'muscle-gain' ? Math.round(70 * baseMultiplier) : profile.goal === 'weight-loss' ? Math.round(60 * baseMultiplier) : Math.round(65 * baseMultiplier);

    return {
      motivation,
      generatedAt: today.toISOString(),
      startDate,
      endDate,
      dailyWorkouts,
      sessions,
      nutrition: {
        protein: `${protein}g`,
        carbs: `${carbs}g`,
        fats: `${fats}g`
      },
      dietPlan: {
        meals: FALLBACK_MEAL_TEMPLATES,
        hydration: `${Math.floor(2.5 + baseMultiplier * 0.5)} liters`,
        notes: `Auto-generated ${profile.goal.replace('-', ' ')} plan for ${profile.intensity} level. ${profile.location === 'gym' ? 'Use gym equipment where available.' : profile.location === 'outdoors' ? 'Outdoor-friendly exercises included.' : 'All exercises can be done at home.'}`
      }
    };
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
      let plan: FitnessPlan;
      try {
        const parsed = JSON.parse(jsonString) as any;
        // Build dailyWorkouts from AI response
        const dailyWorkouts = parsed.dailyWorkouts || [];
        
        // Build sessions for tracking from dailyWorkouts
        const sessions = dailyWorkouts.map((dw: any, idx: number) => ({
          id: crypto.randomUUID(),
          day: idx + 1,
          week: Math.floor(idx / 7) + 1,
          dayOfWeek: DAY_NAMES[idx % 7],
          title: dw.name,
          focus: dw.name.split(' ')[0],
          exercises: (dw.exercises || []).map((ex: string) => ({ name: ex, sets: 3, reps: 12, restSeconds: 60 })),
          duration: dw.duration,
          completed: false,
          completedAt: undefined
        }));
        
        plan = {
          motivation: parsed.motivation || DEFAULT_MOTIVATIONS[0],
          generatedAt: new Date().toISOString(),
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          dailyWorkouts,
          sessions,
          nutrition: parsed.nutrition,
          dietPlan: parsed.dietPlan
        };
      } catch (parseErr) {
        console.error("Failed to parse AI response:", text);
        throw new Error(`Invalid JSON from AI: ${parseErr instanceof Error ? parseErr.message : 'Parse error'}`);
      }

      const completePlan = { ...plan, id: crypto.randomUUID() };

      const updatedUser = {
        ...user,
        fitnessProfile: profile,
        activePlan: completePlan
      };
      console.log("[PlanGen] Saving user with activePlan:", !!completePlan);
      await saveUser(updatedUser);
      console.log("[PlanGen] Saved, calling onPlanGenerated");
      onPlanGenerated();
      alert("Success! Your personalized plan is ready on your dashboard.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Plan generation failed:", err);
      // Fallback: generate a rule-based plan
      console.log("[PlanGen] Using fallback plan generator due to error:", message);
      try {
        const fallbackPlan = generateFallbackPlan();
        const completePlan = { ...fallbackPlan, id: crypto.randomUUID() };

        const updatedUser = {
          ...user,
          fitnessProfile: profile,
          activePlan: completePlan
        };
        await saveUser(updatedUser);
        onPlanGenerated();
        alert("AI service is currently unavailable. A personalized fallback plan has been generated based on your profile.");
      } catch (fallbackErr) {
        console.error("Fallback plan generation also failed:", fallbackErr);
        alert(`Failed to generate plan: ${message}. Please try again later.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const activePlan = user.activePlan;

  // Redirect to body scanner if no active plan in plan mode
  useEffect(() => {
    if (mode === 'plan' && !activePlan) {
      if (onNavigateToScan) {
        onNavigateToScan();
      } else {
        // Fallback to hash if callback not provided (legacy)
        window.location.hash = '#/bmi';
      }
    }
  }, [mode, activePlan, onNavigateToScan]);

  // Show loading state while redirecting
  if (mode === 'plan' && !activePlan) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
        <section>
          <div>
            <h2 className="text-3xl font-black mb-1 text-primary-600 dark:text-primary-400">Plan Designer</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">AI-powered fitness planning based on your body type.</p>
          </div>
        </section>
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
          <div className="text-6xl mb-4">📏</div>
          <h3 className="text-xl font-bold mb-2">Body Scan Required</h3>
          <p className="text-slate-500 mb-6 max-w-xs mx-auto">
            To create your personalized fitness plan, we need to analyze your body type first.
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/40 rounded-full animate-pulse flex items-center justify-center text-primary-600 font-bold">1</div>
            <div className="h-1 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 font-bold">2</div>
            <div className="h-1 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 font-bold">3</div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Redirecting to Body Scanner...</p>
        </div>
      </div>
    );
  }

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

            {/* Profile Summary & Generate Button */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold mb-2">Your Fitness Profile</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-bold capitalize">
                      {profile.goal.replace('-', ' ')}
                    </span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold capitalize">
                      {profile.intensity}
                    </span>
                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold capitalize">
                      {profile.location}
                    </span>
                    {profile.focusAreas?.map(area => (
                      <span key={area} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    // Always go to body scanner first to ensure fresh body analysis
                    if (onNavigateToScan) {
                      onNavigateToScan();
                    } else {
                      window.location.hash = '#/bmi';
                    }
                  }}
                  disabled={isGenerating}
                  className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${
                    isGenerating 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' 
                      : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95'
                  }`}
                >
                  {isGenerating ? 'GENERATING...' : '🔁 Start New Plan'}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Creating a new plan requires a fresh body scan to personalize your workouts.
              </p>
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
                 onRepCountChange={(reps) => {
                   setLiveStats(prev => ({ ...prev, reps }));
                 }}
                 onLandmarksUpdate={(landmarks) => {
                   // Start timer when pose detection is active
                   if (landmarks.length > 0 && !isLiveActive) {
                     setIsLiveActive(true);
                     // Start timer interval
                     const interval = setInterval(() => {
                       setDurationSeconds(prev => prev + 1);
                     }, 1000);
                     setTimerInterval(interval);
                   }
                   // Reset rep count when no pose detected (camera stops or no detection)
                   if (landmarks.length === 0 && isLiveActive) {
                     setIsLiveActive(false);
                     setLiveStats(prev => ({ ...prev, reps: 0 }));
                     setDurationSeconds(0);
                     // Clear timer interval
                     if (timerInterval) {
                       clearInterval(timerInterval);
                       setTimerInterval(null);
                     }
                   }
                 }}
               />
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                 <div className="text-4xl font-black text-primary-600">{liveStats.reps}</div>
                 <div className="text-sm font-bold text-slate-500 mt-1">Total Reps</div>
               </div>
               <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
                 <div className="text-4xl font-black text-emerald-600">
                   {Math.floor(durationSeconds / 60)}:{String(durationSeconds % 60).padStart(2, '0')}
                 </div>
                 <div className="text-sm font-bold text-slate-500 mt-1">Duration</div>
               </div>
             </div>
          </div>
        )}
      </AuthGuard>
    </div>
  );
};

export default FitnessPlanDesigner;