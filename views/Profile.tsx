
import React, { useState, ChangeEvent, useEffect } from 'react';
import { User } from '../types';
import { saveUser } from '../services/DB';
import { sanitizeUserForSave } from '../utils/userHelpers';

interface ProfileProps {
  user: User;
  onUpdate: () => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate }) => {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatarSeed, setAvatarSeed] = useState(user.avatarSeed || user.id);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when user prop updates (e.g. after save)
  useEffect(() => {
    setDisplayName(user.displayName || '');
    setBio(user.bio || '');
    setAvatarSeed(user.avatarSeed || user.id);
    setAvatarUrl(user.avatarUrl || '');
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedUser: User = {
        ...user,
        displayName,
        bio,
        avatarSeed,
        avatarUrl,
      };

      await saveUser(updatedUser);
      onUpdate();
      alert('Profile updated successfully!');
    } catch (error) {
      console.error(error);
      alert(`Failed to save profile: ${(error as Error).message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRandomizeAvatar = () => {
    setAvatarUrl(''); // Clear custom avatar
    setAvatarSeed(Math.random().toString(36).substring(7));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Reset input value to allow re-uploading the same file if needed
      e.target.value = '';
    }
  };

  const displayAvatarUrl = avatarUrl || `https://picsum.photos/seed/${avatarSeed}/200`;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <section>
        <h2 className="text-3xl font-black mb-1">Customize Profile</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your public identity on J&A Gym.</p>
      </section>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm p-8">
        <div className="flex flex-col md:flex-row gap-10">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4 md:w-48 flex-shrink-0">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary-100 dark:border-primary-950/50 shadow-xl transition-transform group-hover:scale-105">
                <img src={displayAvatarUrl} alt="Profile Avatar" className="w-full h-full object-cover" />
              </div>
              <button 
                onClick={handleRandomizeAvatar}
                className="absolute bottom-0 right-0 p-2 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors"
                title="Randomize Avatar"
              >
                🔄
              </button>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Avatar Preview</p>
            <label htmlFor="avatar-upload" className="cursor-pointer w-full text-center px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm">
              Upload Picture
            </label>
            <input id="avatar-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>

          {/* Form Section */}
          <div className="flex-1 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Display Name</label>
                <input 
                  type="text" 
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your preferred name"
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-primary-500 rounded-2xl outline-none transition-all font-medium text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Bio</label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about your fitness journey..."
                  rows={4}
                  className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-primary-500 rounded-2xl outline-none transition-all font-medium text-slate-800 dark:text-slate-100 resize-none"
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full md:w-auto px-10 py-4 bg-primary-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-primary-500/20 hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-3xl border border-transparent">
          <h4 className="font-bold mb-2">Account Info</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Username</span>
              <span className="font-mono">{user.username}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Joined</span>
              <span>{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Status</span>
              <span className="text-primary-600 font-bold uppercase text-[10px]">
                {user.role === 'admin' ? 'Administrator' : user.role === 'member' ? 'Premium Member' : 'Basic User'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
