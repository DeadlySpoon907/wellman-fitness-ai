import React, { useState, useMemo, useEffect } from 'react';
import { User } from '../types';
import { AuthGuard } from '../components/AuthGuard';
import { getUserGymLogs, logWorkout } from '../services/DB';
import { FullBodyTracker } from '../components/FullBodyTracker';
import type { ExerciseType } from '../types';

const PostureChecker: React.FC<{ user: User; apiKey?: string }> = ({ user }) => {
  const [gymLogs, setGymLogs] = useState<any[]>([]);
  const [showManualWorkout, setShowManualWorkout] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutDuration, setWorkoutDuration] = useState('');
  const [workoutExercises, setWorkoutExercises] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('bicep_curl');
  const [freedomMode, setFreedomMode] = useState(false);

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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <section>
        <h2 className="text-3xl font-black mb-1">Posture & Workout Tracker</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Track your exercises, monitor form, and log workouts.</p>
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
    </div>
  );
};

export default PostureChecker;