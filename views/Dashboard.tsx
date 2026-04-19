import React, { useState, useMemo, useEffect } from 'react';
import { User } from '../types';
import { WeightChart } from '../components/WeightChart';
import { getUserGymLogs } from '../services/DB';

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

interface DashboardProps {
  user: User;
  onLogWeight: (weight: number) => void;
  onDesignPlan: () => void;
  apiKey?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogWeight, onDesignPlan, apiKey }) => {
  const [newWeight, setNewWeight] = useState('');
  const [gymLogs, setGymLogs] = useState<any[]>([]);

  useEffect(() => {
    getUserGymLogs(user.id).then(setGymLogs).catch(console.error);
  }, [user.id]);

  const isMember = user.role === 'admin' || user.role === 'member' || (user.membershipExpires && new Date(user.membershipExpires) > new Date());

  const fitnessPlan = user.activePlan;

  const todaySession = useMemo(() => {
    if (!fitnessPlan?.sessions?.length || !fitnessPlan.startDate) return null;
    const startDate = new Date(fitnessPlan.startDate);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dayNum = diffDays + 1;
    return fitnessPlan.sessions.find(s => s.day === dayNum) || null;
  }, [fitnessPlan]);

  const planProgress = useMemo(() => {
    if (!fitnessPlan?.sessions?.length) return 0;
    const completed = fitnessPlan.sessions.filter(s => s.completed).length;
    return Math.round((completed / fitnessPlan.sessions.length) * 100);
  }, [fitnessPlan]);

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
    
    const normalizedLogs = Array.from(new Set(user.activityLogs.map((log: any) => {
      const dateStr = typeof log === 'string' ? log : log.date;
      return dateStr ? dateStr.split('T')[0] : '';
    }).filter(Boolean)));
    const sortedLogs = [...normalizedLogs].sort().reverse();
    
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];
    
    if (!sortedLogs.includes(today) && !sortedLogs.includes(yesterday)) {
      return { streak: 0, last7Days: getLast7Days(normalizedLogs) };
    }

    let streak = 0;
    let curr = new Date();
    
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

   const gymAttendance = useMemo(() => {
     if (!gymLogs || gymLogs.length === 0) return { total: 0, thisWeek: 0, last7Days: getLast7Days([]) };
     
     const normalizedLogs = gymLogs.map(log => log.date?.split('T')[0] || log.date).filter(Boolean);
     const uniqueDays = [...new Set(normalizedLogs)].sort();
     
     const today = new Date().toISOString().split('T')[0];
     const weekStart = new Date();
     weekStart.setUTCDate(weekStart.getUTCDate() - 7);
     const weekStartStr = weekStart.toISOString().split('T')[0];
     
     const thisWeek = uniqueDays.filter(d => d >= weekStartStr && d <= today).length;
     
     const last7Days = getLast7Days(normalizedLogs);
     
     return { total: uniqueDays.length, thisWeek, last7Days };
   }, [gymLogs]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <section className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[2rem] overflow-hidden border-2 border-primary-100 dark:border-primary-900 shadow-lg flex-shrink-0">
             <img src={user.avatarUrl || `https://picsum.photos/seed/${user.avatarSeed || user.id}/100`} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black mb-1">Hello, {user.displayName || user.username}!</h2>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium">{user.bio || "Ready to smash your goals today?"}</p>
          </div>
        </div>
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto px-4 py-3 sm:p-0 bg-slate-50 sm:bg-transparent dark:bg-slate-800/40 rounded-2xl sm:rounded-none border border-slate-100 sm:border-none">
          <div className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest sm:mb-1">Current BMI</div>
          {user.heightCm && currentWeight ? (
            <div className="text-xl sm:text-2xl font-black text-primary-600">
              {(currentWeight / Math.pow(user.heightCm / 100, 2)).toFixed(1)}
            </div>
          ) : (
            <div className="text-slate-300 font-bold">--</div>
          )}
        </div>
      </section>

      {/* Row 1: 2 cards (Consistency + Weight) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      </div>

      {/* Row 2: 2 cards (Membership + Gym Attendance) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                Expires: {user.membershipExpires ? new Date(user.membershipExpires).toLocaleDateString() : 'N/A'}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between min-h-[180px]">
          {isMember ? (
            <>
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
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-6 space-y-2 opacity-40 grayscale">
              <span className="text-3xl">🔒</span>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Attendance Locked</p>
              <p className="text-[10px] text-slate-500 font-bold">Member exclusive feature</p>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: 1 card (Weight History) */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="text-lg font-bold mb-4">Weight History</h3>
        <WeightChart data={sortedWeightLogs} />
      </div>

      {/* Row 4: 1 card (Active Plan) */}
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

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm min-h-[160px] flex flex-col justify-center">
          {isMember ? (
              fitnessPlan ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="bg-primary-50 dark:bg-primary-950/20 px-4 py-2 rounded-2xl border border-primary-100 dark:border-primary-900/50">
                      <p className="italic text-primary-800 dark:text-primary-200 text-sm">"{fitnessPlan.motivation}"</p>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {planProgress}% Complete
                    </span>
                  </div>
                  
                  {todaySession ? (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-primary-200 dark:border-primary-800">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">Today's Session</span>
                          <h4 className="font-bold text-lg">{todaySession.title}</h4>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${todaySession.completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {todaySession.completed ? '✓ Complete' : '○ Pending'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{todaySession.focus}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span>⏱️ {todaySession.duration}</span>
                        <span>•</span>
                        <span>Day {todaySession.day}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-500">
                      No session scheduled for today
                    </div>
                  )}

                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-500 to-violet-500 transition-all duration-500"
                      style={{ width: `${planProgress}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-slate-500">{fitnessPlan.sessions?.filter(s => s.completed).length || 0} of {fitnessPlan.sessions?.length || 0} sessions completed</p>
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
              )
            ) : (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Plan Locked</h4>
              </div>
            )}
          </div>
      </section>
    </div>
  );
};

export default Dashboard;