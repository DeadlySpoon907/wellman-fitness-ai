
import React, { useState, useEffect, useCallback } from 'react';
import { User } from './types';
import { findUser, registerUser, logWeight, recordActivity, getUser, loginUser } from './services/DB';
import Dashboard from './views/Dashboard';
import Nutritionist from './views/Nutritionist';
import BodyScanner from './views/BodyScanner';
import PostureChecker from './views/PostureChecker';
import FitnessPlanDesigner from './views/FitnessPlanDesigner';
import FitnessPlanTracker from './views/FitnessPlanTracker';
import AdminDashboard from './views/AdminDashboard';
import Profile from './views/Profile';
import { Login } from './views/Login';
import NutriBot from './views/NutriBot';
import Settings from './views/Settings';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(() => !!localStorage.getItem('wellman_user_id'));
  const [activeTab, setActiveTab] = useState<'dashboard' | 'nutrition' | 'bmi' | 'posture' | 'designer' | 'profile' | 'nutribot' | 'settings'>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [route, setRoute] = useState<string>(window.location.hash || '#/');
  
  // API Key Management
  const [customApiKey, setCustomApiKey] = useState<string>(localStorage.getItem('gemini_api_key') || '');
  const apiKey = customApiKey || import.meta.env.VITE_API_KEY || '';

  const handleSaveApiKey = (key: string) => {
    setCustomApiKey(key);
    if (key) {
      localStorage.setItem('gemini_api_key', key);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
  };

  // Session Restoration
  useEffect(() => {
    const restoreSession = async () => {
      const storedId = localStorage.getItem('wellman_user_id');
      if (storedId) {
        try {
          const restoredUser = await getUser(storedId);
          if (restoredUser) {
            setUser(restoredUser);
          } else {
            localStorage.removeItem('wellman_user_id');
          }
        } catch (error) {
          console.error("Failed to restore session:", error);
          localStorage.removeItem('wellman_user_id');
        }
      }
      setIsSessionLoading(false);
    };
    restoreSession();
  }, []);

  // Simple Hash Router
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(window.location.hash || '#/');
      setUser(null); // Force re-login when switching context for security
      localStorage.removeItem('wellman_user_id');
      setAuthError(null);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isAdminRoute = route === '#/admin' || route.startsWith('#/admin/');

  // Sync with DB - Stabilized to prevent infinite loops
  const syncUser = useCallback(async () => {
    if (!user?.id) return;
    try {
      const freshUser = await getUser(user.id);
      if (freshUser) {
        // Use functional update to merge new data with existing state.
        // This preserves fields that the API might not return on a GET request, like the password.
        setUser(currentUser => {
          if (!currentUser) return freshUser;
          
          // Preserve password if API returns null/empty (security masking)
          const password = freshUser.password || currentUser.password;
          const updatedUser = { ...currentUser, ...freshUser, password };
          
          // Prevent re-render loops by checking for actual changes.
          const hasChanged = JSON.stringify(updatedUser) !== JSON.stringify(currentUser);
          return hasChanged ? updatedUser : currentUser;
        });
      }
    } catch (error) {
      console.error("Failed to sync user data:", error);
    }
  }, [user?.id]);

  // Record daily activity whenever user logs in or switches
  useEffect(() => {
    if (user?.id) {
      const updateActivity = async () => {
        try {
          await recordActivity(user.id);
        } catch (err) {
          console.error("Failed to record activity:", err);
        } finally {
          syncUser();
        }
      };
      updateActivity();
    }
  }, [user?.id, syncUser]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('wellman_user_id');
  };

  const handleLogin = async (username: string, password: string, isSignUp: boolean, email?: string) => {
    setAuthError(null);

    try {
      if (isAdminRoute) {
        // For admin, we verify the user exists and has the correct role
        // We assume loginUser handles password verification
        const adminUser = await loginUser(username, password);
        if (adminUser.role !== 'admin') {
          setAuthError("Unauthorized: Access restricted to administrators.");
          return;
        }
        setUser({ ...adminUser, password });
        localStorage.setItem('wellman_user_id', adminUser.id);
        return;
      }

      if (isSignUp) {
        const existing = await findUser(username);
        if (existing) {
          setAuthError("Username already exists.");
          return;
        }
        const newUser = await registerUser(username, password, email);
        // Store password in memory to satisfy backend requirements for updates
        setUser({ ...newUser, password });
        localStorage.setItem('wellman_user_id', newUser.id);
      } else {
        const loggedInUser = await loginUser(username, password);
        // Store password in memory to satisfy backend requirements for updates
        setUser({ ...loggedInUser, password });
        localStorage.setItem('wellman_user_id', loggedInUser.id);
      }
    } catch (err) {
      setAuthError((err as Error).message || "Authentication failed");
    }
  };

  const handleWeightLog = async (weight: number) => {
    if (user) {
      await logWeight(user.id, weight);
      await syncUser();
    }
  };

  // Loading Screen
  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  // Login Screen
  if (!user) {
    return <Login onLogin={handleLogin} error={authError} isAdminView={isAdminRoute} />;
  }

  // Admin View
  if (isAdminRoute) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-red-500/20">A</div>
              <div>
                <h1 className="text-xl font-black tracking-tight">Wellman <span className="text-red-600">Admin</span></h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">by J&A Fitness Co</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
                {isDarkMode ? '🌙' : '☀️'}
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-6">
          <AdminDashboard user={user} />
        </main>
      </div>
    );
  }

  // Standard User View
  const isMember = user.role === 'admin' || user.role === 'member' || new Date(user.membershipExpires) > new Date();

  return (
    <div className="min-h-screen pb-24 lg:pb-0 lg:pl-64 transition-colors">
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center border-2 border-slate-100 dark:border-slate-700 shadow-xl">
            <span className="text-2xl font-black transform rotate-45 inline-block text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-violet-600">≠</span>
          </div>
          <div className="flex flex-col"><h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Wellman</h1><span className="text-[10px] font-medium text-slate-400">by J&A Fitness Co</span></div>
        </div>

        <nav className="flex-1 space-y-2">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon="📊" label="Dashboard" />
          <NavButton active={activeTab === 'designer'} onClick={() => setActiveTab('designer')} icon="🏋️" label="Fitness Plan" />
          <NavButton active={activeTab === 'nutrition'} onClick={() => setActiveTab('nutrition')} icon="🥗" label="Nutritionist" />
          <NavButton active={activeTab === 'nutribot'} onClick={() => setActiveTab('nutribot')} icon="🤖" label="NutriBot" />
          <NavButton active={activeTab === 'bmi'} onClick={() => setActiveTab('bmi')} icon="📏" label="Body Scanner" />
          <NavButton active={activeTab === 'posture'} onClick={() => setActiveTab('posture')} icon="🧍" label="Posture" />
          <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon="👤" label="Profile" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon="⚙️" label="Settings" />
        </nav>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between px-4">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Dark Mode</span>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? 'bg-primary-600' : 'bg-slate-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isDarkMode ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
            <div className="text-sm font-bold truncate text-slate-800 dark:text-slate-100">{user.displayName || user.username}</div>
            <div className="text-[10px] text-primary-600 dark:text-primary-400 font-black uppercase tracking-widest mt-1">
              {isMember ? 'Wellman Member' : 'Trial User'}
            </div>
          </div>
          
        </div>
      </aside>

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        <header className="flex lg:hidden items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center border-2 border-slate-50 dark:border-slate-700 shadow-md">
              <span className="text-lg font-black transform rotate-45 inline-block text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-violet-600">≠</span>
            </div>
            <div className="flex flex-col"><h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Wellman</h1><span className="text-[10px] font-medium text-slate-400">by J&A Fitness Co</span></div>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors">
              {isDarkMode ? '🌙' : '☀️'}
            </button>
            <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden border border-slate-300 dark:border-slate-600 shadow-sm cursor-pointer" onClick={() => setActiveTab('profile')}>
              <img src={user.avatarUrl || `https://picsum.photos/seed/${user.avatarSeed || user.id}/100`} alt="Avatar" />
            </div>
          </div>
        </header>

        {activeTab === 'dashboard' && <Dashboard user={user} onLogWeight={handleWeightLog} onDesignPlan={() => setActiveTab('designer')} />}
        {activeTab === 'designer' && <FitnessPlanTracker user={user} onPlanUpdated={syncUser} onStartWorkout={() => setActiveTab('posture')} apiKey={apiKey} />}
        {activeTab === 'nutrition' && <Nutritionist user={user} apiKey={apiKey} />}
        {activeTab === 'nutribot' && <NutriBot apiKey={apiKey} />}
        {activeTab === 'bmi' && <BodyScanner user={user} onUpdateProfile={syncUser} apiKey={apiKey} />}
        {activeTab === 'posture' && <PostureChecker user={user} apiKey={apiKey} />}
        {activeTab === 'profile' && <Profile user={user} onUpdate={syncUser} />}
        {activeTab === 'settings' && <Settings user={user} currentApiKey={customApiKey} onSave={handleSaveApiKey} onUpdate={() => {}} onLogout={handleLogout} />}
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-around p-2 z-50">
        <MobileNavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon="📊" />
        <MobileNavButton active={activeTab === 'designer'} onClick={() => setActiveTab('designer')} icon="🏋️" />
        <MobileNavButton active={activeTab === 'nutrition'} onClick={() => setActiveTab('nutrition')} icon="🥗" />
        <MobileNavButton active={activeTab === 'nutribot'} onClick={() => setActiveTab('nutribot')} icon="🤖" />
        <MobileNavButton active={activeTab === 'bmi'} onClick={() => setActiveTab('bmi')} icon="📏" />
        <MobileNavButton active={activeTab === 'posture'} onClick={() => setActiveTab('posture')} icon="🧍" />
        <MobileNavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon="👤" />
        <MobileNavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon="⚙️" />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 font-bold shadow-sm' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
    }`}
  >
    <span className="text-xl">{icon}</span>
    <span className="text-sm font-bold">{label}</span>
  </button>
);

const MobileNavButton: React.FC<{ active: boolean; onClick: () => void; icon: string }> = ({ active, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`p-3 rounded-2xl transition-all ${
      active ? 'text-primary-600 bg-primary-50 dark:bg-primary-950/30' : 'text-slate-400'
    }`}
  >
    <span className="text-2xl">{icon}</span>
  </button>
);

export default App;
