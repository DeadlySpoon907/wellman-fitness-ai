import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { User } from '../types';
import { AuthGuard } from '../components/AuthGuard';
import { saveUser } from '../services/DB';

interface SettingsProps {
  user: User;
  currentApiKey: string;
  onSave: (key: string) => void;
  onUpdate: () => void;
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ user, currentApiKey, onSave, onUpdate, onLogout }) => {
  const [key, setKey] = useState(currentApiKey);
  const [isVisible, setIsVisible] = useState(false);

  // --- Password Change State ---
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    setKey(currentApiKey);
  }, [currentApiKey]);

  const handleSave = () => {
    onSave(key);
    alert('Settings saved successfully!');
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (passwords.new.length < 6) {
      setPasswordMessage("Password must be at least 6 characters.");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      setPasswordMessage("New passwords do not match.");
      return;
    }
    if (passwords.current !== user.password) {
      setPasswordMessage("Incorrect current password.");
      return;
    }
    saveUser({ ...user, password: passwords.new });
    setPasswordMessage("Password updated successfully!");
    setPasswords({ current: '', new: '', confirm: '' });
    onUpdate();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <section>
        <h2 className="text-3xl font-black mb-1 text-slate-800 dark:text-white">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your application preferences.</p>
      </section>

      <AuthGuard user={user}>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">

          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="text-primary-500">01</span> API Configuration
            </h3>
            <div className="p-6 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Gemini API Key
              </label>
              <p className="text-xs text-slate-500 mb-4">
                Leave blank to use the system default key. Providing your own key ensures you don't hit shared rate limits.
              </p>
              
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={isVisible ? "text" : "password"}
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-mono text-sm"
                  />
                  <button
                    onClick={() => setIsVisible(!isVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {isVisible ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Password Change Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="text-primary-500">02</span> Change Password
            </h3>
            <form onSubmit={handlePasswordSubmit} className="p-6 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Current Password</label>
                <input
                  type="password" name="current" value={passwords.current} onChange={handlePasswordChange} required
                  className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                  <input
                    type="password" name="new" value={passwords.new} onChange={handlePasswordChange} required
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Confirm New Password</label>
                  <input
                    type="password" name="confirm" value={passwords.confirm} onChange={handlePasswordChange} required
                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 outline-none transition-all font-mono text-sm"
                  />
                </div>
              </div>
              <button type="submit" className="px-6 py-3 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold hover:bg-slate-900 dark:hover:bg-slate-600 transition-colors text-sm">Update Password</button>
              {passwordMessage && <p className={`text-sm mt-2 ${passwordMessage.includes('success') ? 'text-green-500' : 'text-red-500'}`}>{passwordMessage}</p>}
            </form>
          </div>

          <div className="pt-4 flex gap-4">
            <button
              onClick={handleSave}
              className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20 active:scale-95"
            >
              Save Changes
            </button>
            <button
              onClick={onLogout}
              className="px-8 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 active:scale-95"
            >
              Logout
            </button>
          </div>

        </div>
      </AuthGuard>
    </div>
  );
};

export default Settings;