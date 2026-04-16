import React, { useState } from 'react';
import { User, PlanSession } from '../types';
import { AuthGuard } from '../components/AuthGuard';
import { saveUser } from '../services/DB';
import { FullBodyTracker } from '../components/FullBodyTracker';
import type { ExerciseType } from '../types';

const FitnessPlanTracker: React.FC<{ user: User; onPlanUpdated: () => void; onStartWorkout?: () => void; apiKey?: string }> = ({ user, onPlanUpdated, onStartWorkout }) => {
  const plan = user.activePlan;
  const [selectedSession, setSelectedSession] = useState<PlanSession | null>(null);
  const [activeExercise, setActiveExercise] = useState<ExerciseType>('squat');
  const [showTracker, setShowTracker] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  if (!plan || !plan.sessions) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
        <section>
          <h2 className="text-3xl font-black mb-1">Fitness Plan</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Track your monthly workout progress.</p>
        </section>
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold mb-2">No Active Plan</h3>
          <p className="text-slate-500">Scan your body in the Body Scanner to generate a personalized 30-day plan.</p>
        </div>
      </div>
    );
  }

  const completedCount = plan.sessions.filter(s => s.completed).length;
  const totalCount = plan.sessions.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const filteredSessions = plan.sessions.filter(s => {
    if (filter === 'pending') return !s.completed;
    if (filter === 'completed') return s.completed;
    return true;
  });

  const currentWeek = plan.sessions.filter(s => !s.completed).slice(0, 7);

  const toggleSessionComplete = async (session: PlanSession) => {
    const updatedSessions = plan.sessions.map(s => 
      s.id === session.id 
        ? { ...s, completed: !s.completed, completedAt: !s.completed ? new Date().toISOString() : undefined }
        : s
    );
    
    const updatedUser = { ...user, activePlan: { ...plan, sessions: updatedSessions } };
    await saveUser(updatedUser);
    onPlanUpdated();
    
    if (selectedSession?.id === session.id) {
      setSelectedSession(!session.completed ? session : null);
    }
  };

  const getWeekLabel = (week: number) => {
    const startDate = new Date(plan.startDate);
    startDate.setDate(startDate.getDate() + (week - 1) * 7);
    return `Week ${week} (${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <section>
        <h2 className="text-3xl font-black mb-1">Fitness Plan</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">30-day personalized workout plan</p>
      </section>

      <div className="bg-gradient-to-r from-primary-500/10 to-violet-500/10 dark:from-primary-900/20 dark:to-violet-900/20 p-6 rounded-3xl border border-primary-200 dark:border-primary-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-bold text-primary-600 uppercase tracking-widest">Progress</div>
            <div className="text-3xl font-black">{completedCount} / {totalCount} sessions</div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black text-primary-600">{progressPercent}%</div>
          </div>
        </div>
        <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary-500 to-violet-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {plan.motivation && (
          <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded-xl">
            <p className="text-sm italic text-slate-700 dark:text-slate-300">"{plan.motivation}"</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            filter === 'all' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            filter === 'pending' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
            filter === 'completed' ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Completed
        </button>
      </div>

      <AuthGuard user={user} requireMember>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Sessions</h3>
            {[1, 2, 3, 4].map(week => {
              const weekSessions = filteredSessions.filter(s => s.week === week);
              if (weekSessions.length === 0) return null;
              
              return (
                <div key={week} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="text-sm font-bold text-slate-500 mb-3">{getWeekLabel(week)}</div>
                  <div className="space-y-2">
                    {weekSessions.map(session => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedSession(session)}
                        className={`w-full p-3 rounded-xl text-left transition-all ${
                          selectedSession?.id === session.id
                            ? 'bg-primary-50 dark:bg-primary-950/30 border-2 border-primary-500'
                            : session.completed
                              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                              : 'bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-sm">{session.title}</div>
                            <div className="text-xs text-slate-500">{session.dayOfWeek} • {session.duration} • {session.focus}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {session.completed && <span className="text-green-500 text-lg">✓</span>}
                            <span className="text-xs text-slate-400">{session.exercises.length} ex</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            {selectedSession ? (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-black">{selectedSession.title}</h3>
                    <p className="text-sm text-slate-500">{selectedSession.dayOfWeek} • {selectedSession.duration} • {selectedSession.focus}</p>
                  </div>
                  <button
                    onClick={() => toggleSessionComplete(selectedSession)}
                    className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                      selectedSession.completed
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {selectedSession.completed ? 'Completed ✓' : 'Mark Complete'}
                  </button>
                </div>

                <div className="space-y-3 mb-6">
                  {selectedSession.exercises.map((ex, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm">{ex.name}</div>
                          <div className="text-xs text-slate-500">{ex.sets} sets × {ex.reps} reps • {ex.restSeconds}s rest</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (onStartWorkout) {
                      onStartWorkout();
                    } else {
                      setShowTracker(!showTracker);
                    }
                  }}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
                >
                  {showTracker ? 'Hide Tracker' : 'Start Workout'}
                </button>

                {showTracker && (
                  <div className="mt-4">
                    <div className="mb-4">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Track Exercise
                      </label>
                      <select
                        value={activeExercise}
                        onChange={(e) => setActiveExercise(e.target.value as ExerciseType)}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-sm"
                      >
                        <option value="bicep_curl">Bicep Curl</option>
                        <option value="squat">Squat</option>
                        <option value="pushup">Push-up</option>
                        <option value="lunge">Lunge</option>
                        <option value="situp">Sit-up</option>
                      </select>
                    </div>
                    <FullBodyTracker exercise={activeExercise} freedomMode={false} />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-100 dark:border-slate-800 text-center opacity-50">
                <div className="text-6xl mb-4">👆</div>
                <p className="font-bold">Select a session to view details</p>
              </div>
            )}
          </div>
        </div>
      </AuthGuard>
    </div>
  );
};

export default FitnessPlanTracker;