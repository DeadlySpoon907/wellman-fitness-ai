import React, { useState } from 'react';
import { User } from '../types';
import { AuthGuard } from '../components/AuthGuard';
import { FullBodyTracker } from '../components/FullBodyTracker';
import type { ExerciseType } from '../types';

const PostureChecker: React.FC<{ user: User; apiKey?: string }> = ({ user }) => {
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('bicep_curl');
  const [freedomMode, setFreedomMode] = useState(false);

  if (!user) return <div className="p-12 text-center text-slate-400 font-medium">Loading user profile...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <section>
        <h2 className="text-3xl font-black mb-1">Posture & Workout Tracker</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Track your exercises, monitor form, and count reps.</p>
      </section>

      <AuthGuard user={user} requireMember>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-4">
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
                    checked={freedomMode}
                    onChange={(e) => setFreedomMode(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                    Auto-Detect Exercise
                  </span>
                </label>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {freedomMode 
                ? "The system will automatically detect which exercise you're performing"
                : "Select an exercise to track your form and count reps"
              }
            </p>
          </div>
          <FullBodyTracker 
            exercise={freedomMode ? null : selectedExercise} 
            freedomMode={freedomMode}
          />
        </div>
      </AuthGuard>
    </div>
  );
};

export default PostureChecker;
