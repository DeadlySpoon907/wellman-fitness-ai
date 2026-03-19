
import React, { useState } from 'react';
import { User, FitnessProfile } from '../types';
import { AuthGuard } from '../components/AuthGuard';
import { GoogleGenAI } from "@google/genai";
import { saveUser } from '../services/DB';

const FitnessPlanDesigner: React.FC<{ user: User; onPlanGenerated: () => void; apiKey?: string }> = ({ user, onPlanGenerated, apiKey }) => {
  const [profile, setProfile] = useState<FitnessProfile>(() => ({
    goal: 'weight-loss',
    intensity: 'beginner',
    location: 'home',
    focusAreas: ['Core'],
    ...(user?.fitnessProfile || {}),
    focusAreas: user?.fitnessProfile?.focusAreas || ['Core']
  }));
  const [isGenerating, setIsGenerating] = useState(false);

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
      const prompt = `Generate a daily fitness plan for a user with:
      Weight: ${currentWeight}kg
      Height: ${user.heightCm}cm
      Goal: ${profile.goal}
      Level: ${profile.intensity}
      Location: ${profile.location}
      Focus: ${profile.focusAreas.join(', ')}
      
      Return a JSON object with:
      - motivation: string (short quote)
      - dailyWorkouts: array of objects { name: string, duration: string, exercises: string[] }
      Return ONLY valid JSON, no markdown.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const text = response.text();
      const jsonString = text.replace(/```json|```/g, '').trim();
      const plan = JSON.parse(jsonString);
      const completePlan = { ...plan, generatedAt: new Date().toISOString() };
      const updatedUser = { ...user, fitnessProfile: profile, activePlan: completePlan };
      await saveUser(updatedUser);
      onPlanGenerated();
      alert("Success! Your personalized plan is ready on your dashboard.");
    } catch (err) {
      console.error(err);
      alert("AI generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <section>
        <h2 className="text-3xl font-black mb-1 text-primary-600 dark:text-primary-400">Plan Designer</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Bespoke training architecture powered by Gemini AI.</p>
      </section>

      <AuthGuard user={user} requireMember>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-10">
          
          {/* Goal Selection */}
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

          {/* Intensity Selection */}
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

          {/* Location & Focus */}
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
              {isGenerating ? 'DESIGNING YOUR PLAN...' : 'GENERATE PERSONALIZED PLAN'}
            </button>
            <p className="text-center text-xs text-slate-400 mt-4 font-medium uppercase tracking-widest">
              AI considers your weight, height, and custom preferences
            </p>
          </div>
        </div>
      </AuthGuard>
    </div>
  );
};

export default FitnessPlanDesigner;
