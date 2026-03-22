
import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { WeightChart } from '../components/WeightChart';
import { AuthGuard } from '../components/AuthGuard';

interface DashboardProps {
  user: User;
  onLogWeight: (weight: number) => void;
  onDesignPlan: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogWeight, onDesignPlan }) => {
  const [newWeight, setNewWeight] = useState('');

  const isMember = user.role === 'admin' || user.role === 'member' || new Date(user.membershipExpires) > new Date();

  const fitnessPlan = user.activePlan;

  const sortedWeightLogs = useMemo(() => {
    return [...(user.weightLogs || [])]
      .filter(log => log.date && !isNaN(new Date(log.date).getTime()))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [user.weightLogs]);

  const currentWeight = (sortedWeightLogs.length > 0)
    ? sortedWeightLogs[sortedWeightLogs.length - 1].weight 
    : 0;

  const streakInfo = useMemo(() => {
    if (!user.activityLogs || user.activityLogs.length === 0) return { streak: 0, last7Days: getLast7Days([]) };
    
    // Normalize logs to handle potential ISO timestamps and deduplicate
    const normalizedLogs = Array.from(new Set(user.activityLogs.map((log: any) => {
      const dateStr = typeof log === 'string' ? log : log.date;
      return dateStr ? dateStr.split('T')[0] : '';
    }).filter(Boolean)));
    const sortedLogs = [...normalizedLogs].sort().reverse();
    
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];
    
    // Check if streak is still active
    if (!sortedLogs.includes(today) && !sortedLogs.includes(yesterday)) {
      return { streak: 0, last7Days: getLast7Days(normalizedLogs) };
    }

    let streak = 0;
    let curr = new Date();
    
    // If they haven't logged in today yet, check starting from yesterday
    if (!sortedLogs.includes(today)) {
      curr.setUTCDate(curr.getUTCDate() - 1);
    }

    while (true) {
      const dateStr = curr.toISOString().split('T')[0];
      if (normalizedLogs.includes(dateStr)) {
        streak++;
        curr.setUTCDate(curr.getUTCDate() - 1);
      } else {
        break;
      }
    }

    return { streak, last7Days: getLast7Days(normalizedLogs) };
  }, [user.activityLogs]);

  function getLast7Days(logs: string[]) {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' }),
        active: logs.includes(dateStr)
      });
    }
    return days;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="flex justify-between items-start">
        <div className="flex items-center gap-6">
          <div className="hidden sm:block w-20 h-20 rounded-[2rem] overflow-hidden border-2 border-primary-100 dark:border-primary-900 shadow-lg">
             <img src={user.avatarUrl || `https://picsum.photos/seed/${user.avatarSeed || user.id}/100`} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-3xl font-black mb-1">Hello, {user.displayName || user.username}!</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{user.bio || "Ready to smash your goals today?"}</p>
          </div>
        </div>
        <div className="hidden md:block text-right">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Current BMI</div>
          {user.heightCm && currentWeight ? (
            <div className="text-2xl font-black text-primary-600">
              {(currentWeight / Math.pow(user.heightCm / 100, 2)).toFixed(1)}
            </div>
          ) : (
            <div className="text-slate-300 font-bold">--</div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Consistency Metric */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg">🔥</span>
              Consistency
            </h3>
            <span className="text-2xl font-black text-orange-600">{streakInfo.streak} Days</span>
          </div>
          <div className="flex justify-between items-end gap-1 mt-auto">
            {streakInfo.last7Days.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                  day.active 
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  {day.active ? '✓' : ''}
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weight Management */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">⚖️</span>
              Weight
            </h3>
            <span className="text-2xl font-black text-primary-600">{currentWeight} kg</span>
          </div>

          <div className="flex gap-2">
            <input 
              type="number" 
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder="New weight..."
              className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 ring-primary-500 transition-all text-sm"
            />
            <button 
              onClick={() => {
                if (newWeight) {
                  onLogWeight(parseFloat(newWeight));
                  setNewWeight('');
                }
              }}
              className="bg-primary-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-primary-700 active:scale-95 transition-all text-sm"
            >
              Log
            </button>
          </div>
        </div>

        {/* Membership Card */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="inline-block px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">Member</div>
              <h3 className="text-xl font-black mb-1">
                {isMember ? 'Wellman Member' : '30-Day Trial'}
              </h3>
            </div>
            {!isMember && (
              <button className="mt-4 bg-white text-primary-600 py-2 rounded-xl font-black text-xs shadow-lg hover:bg-slate-50 transition-colors">
                UPGRADE
              </button>
            )}
            {isMember && (
              <div className="mt-4 text-[10px] font-bold opacity-80 uppercase tracking-widest">
                Expires: {new Date(user.membershipExpires).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="text-lg font-bold mb-4">Weight History</h3>
        <WeightChart data={sortedWeightLogs} />
      </div>

      {/* AI Fitness Plan */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Your Active Plan</h3>
          {isMember && (
            <button 
              onClick={onDesignPlan}
              className="text-sm font-bold text-primary-600 hover:underline"
            >
              Update Profile & Plan
            </button>
          )}
        </div>

        <AuthGuard user={user} requireMember>
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
            {fitnessPlan ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="bg-primary-50 dark:bg-primary-950/20 px-4 py-2 rounded-2xl border border-primary-100 dark:border-primary-900/50">
                    <p className="italic text-primary-800 dark:text-primary-200 text-sm">"{fitnessPlan.motivation}"</p>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Last Sync: {new Date(fitnessPlan.generatedAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fitnessPlan.dailyWorkouts?.map((workout, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-transparent hover:border-primary-200 transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-lg group-hover:text-primary-600 transition-colors">{workout.name}</h4>
                        <span className="text-xs font-bold bg-white dark:bg-slate-700 px-2 py-1 rounded-md text-slate-500">{workout.duration}</span>
                      </div>
                      <ul className="space-y-2">
                        {workout.exercises.map((ex, i) => (
                          <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-primary-500 rounded-full" />
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl mb-4">🏗️</div>
                <h4 className="text-lg font-bold mb-2">No Active Plan</h4>
                <p className="text-slate-500 text-sm mb-6 max-w-xs">Use our AI Designer to create a bespoke workout plan tailored to your body and goals.</p>
                <button 
                  onClick={onDesignPlan}
                  className="bg-primary-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary-500/20"
                >
                  Go to Designer
                </button>
              </div>
            )}
          </div>
        </AuthGuard>
      </section>
    </div>
  );
};

export default Dashboard;
