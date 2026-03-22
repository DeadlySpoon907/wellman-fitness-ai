
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (username: string, password: string, isSignUp: boolean) => void;
  error?: string | null;
  isAdminView?: boolean;
}

export const Login: React.FC<LoginProps> = ({ onLogin, error, isAdminView = false }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      onLogin(username, password, isAdminView ? false : isSignUp);
    }
  };

  const textHighlight = isAdminView ? 'text-red-600' : 'text-primary-600';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors relative overflow-hidden">
      {/* Decorative Blobs */}
      <div className={`absolute top-[-10%] right-[-10%] w-[40%] h-[40%] ${isAdminView ? 'bg-red-100 dark:bg-red-900/10' : 'bg-primary-100 dark:bg-primary-900/10'} rounded-full blur-[120px]`} />
      <div className={`absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] ${isAdminView ? 'bg-orange-100 dark:bg-orange-900/10' : 'bg-indigo-100 dark:bg-indigo-900/10'} rounded-full blur-[120px]`} />

      <div className="max-w-md w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white dark:border-slate-800 animate-in zoom-in duration-300 relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className={`w-20 h-20 bg-white dark:bg-slate-800 rounded-[2rem] flex items-center justify-center shadow-2xl mb-6 transition-transform hover:scale-110 border-4 border-slate-50 dark:border-slate-700`}>
            {isAdminView ? (
              <span className="font-black text-4xl text-red-600">A</span>
            ) : (
              <span className="text-5xl font-black transform rotate-45 inline-block text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-violet-600">≠</span>
            )}
          </div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">
            {isAdminView ? 'Admin Portal' : 'J&A Gym'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-center text-sm">
            {isAdminView 
              ? 'Secure entry for platform administrators.' 
              : isSignUp ? 'Join J&A Gym for better health.' : 'Welcome back to J&A Gym.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-bold border border-red-100 dark:border-red-900/50 flex items-center gap-2 animate-in slide-in-from-top-2">
              <span className="text-lg">⚠️</span> {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Username</label>
              <input 
                type="text" 
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isAdminView ? "Admin credentials" : "Enter your username"}
                className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:border-opacity-50 focus:border-current rounded-2xl outline-none transition-all font-medium text-slate-800 dark:text-slate-100 ${textHighlight}`}
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:border-opacity-50 focus:border-current rounded-2xl outline-none transition-all font-medium text-slate-800 dark:text-slate-100 ${textHighlight}`}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-current transition-colors"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            className={`w-full py-4 text-white rounded-2xl font-black text-lg shadow-lg transition-all active:scale-95 ${
              isAdminView ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/30'
            }`}
          >
            {isAdminView ? 'AUTHORIZE' : (isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN')}
          </button>
        </form>

        {!isAdminView && (
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className={`${textHighlight} text-sm font-bold hover:underline`}
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
            {isAdminView 
              ? 'Authorized personnel only. Access is monitored.' 
              : 'New accounts receive 1 month of J&A Gym Premium automatically'}
          </p>
          {isAdminView && (
            <a href="#/" className="mt-4 inline-block text-[10px] font-black text-slate-400 hover:text-primary-600 transition-colors">
              BACK TO PUBLIC SITE
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
