
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { getAllUsers, saveUser, deleteUser } from '../services/DB';
import { sanitizeUserForSave } from '/utils/userHelpers';

const AdminDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [rawJson, setRawJson] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    getAllUsers().then(setUsers);
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      await deleteUser(id);
      setUsers(await getAllUsers());
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      await saveUser(editingUser);
      setUsers(await getAllUsers());
      setEditingUser(null);
    }
  };

  const handleRawSave = async () => {
    try {
      const updated = JSON.parse(rawJson);
      if (updated.id !== inspectingUser?.id) {
        setJsonError("Cannot modify User ID directly.");
        return;
      }
      await saveUser(updated);
      setUsers(await getAllUsers());
      setInspectingUser(null);
    } catch (err) {
      setJsonError((err as Error).message);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.displayName && u.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    total: users.length,
    premium: users.filter(u => u.role === 'member' || u.role === 'admin' || new Date(u.membershipExpires) > new Date()).length,
    basic: users.filter(u => u.role === 'user' && new Date(u.membershipExpires) <= new Date()).length
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 relative">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="bg-red-100 dark:bg-red-900/40 text-red-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter">Admin Portal</span>
            <h2 className="text-3xl font-black">Platform Overview</h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Monitoring system activity and membership distributions.</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm w-full md:w-auto">
          <span className="pl-2 text-xl">🔍</span>
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none text-sm font-bold placeholder:font-medium w-full md:w-64"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Registered" value={stats.total} icon="👥" color="bg-primary-500" />
        <StatCard label="Active Premium" value={stats.premium} icon="💎" color="bg-indigo-500" />
        <StatCard label="Free Tier" value={stats.basic} icon="🍃" color="bg-emerald-500" />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold">User Directory</h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filteredUsers.length} Users Found</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-4">User</th>
                <th className="px-8 py-4">Role</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4 text-right">Expiration</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((u) => {
                const isExpired = new Date(u.membershipExpires) <= new Date();
                const isActivePremium = u.role === 'admin' || u.role === 'member' || !isExpired;
                
                return (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <img src={u.avatarUrl || `https://picsum.photos/seed/${u.avatarSeed || u.id}/40`} alt="" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-100">{u.username}</div>
                          {u.displayName && <div className="text-[10px] text-slate-400 font-bold">{u.displayName}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter ${
                        u.role === 'admin' ? 'bg-red-100 dark:bg-red-950 text-red-600' :
                        u.role === 'member' ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isActivePremium ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-sm font-medium">{isActivePremium ? 'Premium' : 'Free'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right font-mono text-xs text-slate-500">
                      {new Date(u.membershipExpires).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setInspectingUser(u);
                            setRawJson(JSON.stringify(u, null, 2));
                            setJsonError(null);
                          }}
                          className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Inspect Data"
                        >
                          👁️
                        </button>
                        <button 
                          onClick={() => setEditingUser({...u})}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-primary-600 transition-colors"
                          title="Edit User"
                        >
                          ✏️
                        </button>
                        {u.id !== user.id && (
                          <button 
                            onClick={() => handleDelete(u.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete User"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black mb-6">Edit User</h3>
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Username</label>
                <input 
                  type="text" 
                  value={editingUser.username}
                  disabled
                  className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-xl font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Role</label>
                <select 
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value as any})}
                  className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-primary-500 rounded-xl outline-none font-bold appearance-none"
                >
                  <option value="user">User</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Membership Expiration</label>
                <input 
                  type="date" 
                  value={new Date(editingUser.membershipExpires).toISOString().split('T')[0]}
                  onChange={(e) => setEditingUser({...editingUser, membershipExpires: new Date(e.target.value).toISOString()})}
                  className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-transparent focus:border-primary-500 rounded-xl outline-none font-bold"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Modal */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black">Data Inspector</h3>
                <p className="text-slate-500 text-sm font-medium">Raw JSON configuration for {inspectingUser.username}</p>
              </div>
              <button onClick={() => setInspectingUser(null)} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
            </div>
            
            {jsonError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">
                ⚠️ {jsonError}
              </div>
            )}

            <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950">
              <textarea 
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                className="w-full h-full p-4 bg-transparent outline-none font-mono text-xs text-slate-600 dark:text-slate-300 resize-none"
                spellCheck={false}
              />
            </div>

            <div className="flex gap-3 pt-6">
              <button 
                onClick={handleRawSave}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; icon: string; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
    <div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</div>
      <div className="text-3xl font-black">{value}</div>
    </div>
    <div className={`w-12 h-12 ${color} text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-black/5`}>
      {icon}
    </div>
  </div>
);

export default AdminDashboard;
