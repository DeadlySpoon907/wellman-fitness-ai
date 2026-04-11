
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (username: string, password: string, isSignUp: boolean, email?: string) => void;
  error?: string | null;
  isAdminView?: boolean;
}


export const Login: React.FC<LoginProps> = ({ onLogin, error, isAdminView = false }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    
    if (isSignUp) {
      // Validation for sign up
      if (!email) {
        setValidationError('Email is required');
        return;
      }
      if (password !== confirmPassword) {
        setValidationError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setValidationError('Password must be at least 6 characters');
        return;
      }
    }
    
    if (username && password) {
      onLogin(username, password, isAdminView ? false : isSignUp, email);
    }
  };

  const textHighlight = isAdminView ? 'text-red-600' : 'text-primary-600';
  const adminGradient = 'from-red-600 via-red-700 to-red-800';
  const adminGlow = 'shadow-red-500/30';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors relative overflow-hidden ${
      isAdminView 
        ? 'bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 dark:from-red-950 dark:via-red-900/30 dark:to-orange-950' 
        : 'bg-white dark:bg-slate-950'
    }`}>
      {isAdminView && (
        <>
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
            ⚠️ Admin Access
          </div>
        </>
      )}
      <div className={`absolute top-[-10%] right-[-10%] w-[40%] h-[40%] ${isAdminView ? 'bg-red-200 dark:bg-red-900/20' : 'bg-primary-100 dark:bg-primary-900/10'} rounded-full blur-[120px]`} />
      <div className={`absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] ${isAdminView ? 'bg-orange-200 dark:bg-orange-900/20' : 'bg-indigo-100 dark:bg-indigo-900/10'} rounded-full blur-[120px]`} />

      <div className="max-w-md w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white dark:border-slate-800 animate-in zoom-in duration-300 relative z-10">
        <div className="flex flex-col items-center mb-10">
          <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl mb-6 transition-transform hover:scale-110 border-4 ${
              isAdminView 
                ? 'bg-gradient-to-br from-red-600 via-red-700 to-red-800 border-red-400' 
                : 'bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700'
            }`}>
            {isAdminView ? (
              <span className="font-black text-4xl text-white">🛡️</span>
            ) : (
              <span className="text-5xl font-black transform rotate-45 inline-block text-transparent bg-clip-text bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500">W</span>
            )}
          </div>
          <h1 className={`text-3xl font-black mb-2 tracking-tight ${isAdminView ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
            {isAdminView ? '🛡️ Admin Portal' : 'Wellman'}
          </h1>
          <p className={`font-medium text-center text-sm ${
            isAdminView ? 'text-red-700 dark:text-red-400 font-bold' : 'text-slate-700 dark:text-slate-300'
          }`}>
            {isAdminView 
              ? '🔒 Restricted Access - Administrators Only' 
              : isSignUp ? 'Join Wellman for better health.' : 'Welcome back to Wellman.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {(error || validationError) && (
            <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-bold border border-red-100 dark:border-red-900/50 flex items-center gap-2 animate-in slide-in-from-top-2">
              <span className="text-lg">⚠️</span> {error || validationError}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1 ${isAdminView ? 'text-red-500' : 'text-slate-400'}`}>Username</label>
              <input 
                type="text" 
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isAdminView ? "Admin credentials" : "Enter your username"}
                className={`w-full px-5 py-4 rounded-2xl outline-none transition-all font-medium ${
                  isAdminView 
                    ? 'bg-white dark:bg-slate-800 border-2 border-red-200 dark:border-red-800 text-slate-800 dark:text-slate-100 focus:border-red-500' 
                    : 'bg-slate-50 dark:bg-slate-800/50 border border-transparent text-slate-800 dark:text-slate-100 focus:border-primary-500'
                }`}
                required
              />
            </div>

            {isSignUp && (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">Email</label>
                <input 
                  type="email" 
                  value={email}
                  autoComplete="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:border-opacity-50 focus:border-current rounded-2xl outline-none transition-all font-medium text-slate-900 dark:text-slate-100 ${textHighlight}`}
                />
              </div>
            )}

            <div>
              <label className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-2 px-1 ${isAdminView ? 'text-red-500' : 'text-slate-500'}`}>Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-5 py-4 rounded-2xl outline-none transition-all font-medium ${
                    isAdminView 
                      ? 'bg-white dark:bg-slate-800 border-2 border-red-200 dark:border-red-800 text-slate-800 dark:text-slate-100 focus:border-red-500' 
                      : 'bg-slate-50 dark:bg-slate-800/50 border border-transparent text-slate-900 dark:text-slate-100 focus:border-primary-500'
                  }`}
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

            {isSignUp && (
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-1">Confirm Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    autoComplete="new-password"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-transparent focus:border-opacity-50 focus:border-current rounded-2xl outline-none transition-all font-medium text-slate-900 dark:text-slate-100 ${textHighlight}`}
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit"
            className={`w-full py-4 text-white rounded-2xl font-black text-lg shadow-lg transition-all active:scale-95 ${
              isAdminView 
                ? 'bg-gradient-to-r from-red-600 via-red-700 to-red-800 hover:from-red-700 hover:via-red-800 hover:to-red-900 shadow-red-500/30 border-2 border-red-400' 
                : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/30'
            }`}
          >
            {isAdminView ? '🔐 AUTHORIZE' : (isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN')}
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
          <p className={`text-[10px] font-bold uppercase tracking-widest leading-relaxed ${
            isAdminView ? 'text-red-500 dark:text-red-400' : 'text-slate-400'
          }`}>
            {isAdminView 
              ? '🔴 Unauthorized access is prohibited and monitored.' 
              : 'A fitness app by J&A Fitness Co'}
          </p>
          {isAdminView && (
            <a href="/" className="mt-4 inline-block px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              ← Back to User Login
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
