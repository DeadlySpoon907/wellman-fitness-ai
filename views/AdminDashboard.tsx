import React, { useState, useEffect, useMemo } from 'react';
import { User, GymLog } from '../types';
import { getAllUsers, saveUser, deleteUser, getAllGymLogs, timeInUser, timeOutUser, getActiveGymLogs, getGymLogsDbStatus } from '../services/DB';

type TabType = 'users' | 'analytics' | 'health' | 'settings' | 'logbook';

const AdminDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    loadDbStatus();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
  };

  const loadDbStatus = async () => {
    setDbLoading(true);
    setDbError(null);
    try {
      const status = await getGymLogsDbStatus();
      setDbStatus(status);
    } catch (err: any) {
      setDbError(err?.message || String(err));
    } finally {
      setDbLoading(false);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const total = users.length;
    const admins = users.filter(u => u.role === 'admin').length;
    const members = users.filter(u => u.role === 'member').length;
    const basic = users.filter(u => u.role === 'user').length;
    const premium = admins + members;
    const active30Days = users.filter(u => {
      const created = new Date(u.createdAt);
      const diff = now.getTime() - created.getTime();
      return diff <= 30 * 24 * 60 * 60 * 1000;
    }).length;
    const withWeightLogs = users.filter(u => u.weightLogs && u.weightLogs.length > 0).length;
    const withActivityLogs = users.filter(u => u.activityLogs && u.activityLogs.length > 0).length;
    const withMealLogs = users.filter(u => u.mealLogs && u.mealLogs.length > 0).length;
    const withPostureLogs = users.filter(u => u.postureLogs && u.postureLogs.length > 0).length;
    const withFitnessProfile = users.filter(u => u.fitnessProfile).length;
    const withActivePlan = users.filter(u => u.activePlan).length;
    const withCompletedSessions = users.filter(u => 
      u.activePlan?.dailyWorkouts?.some(w => w.completed)
    ).length;

    // Calculate aggregated health metrics
    const totalWeightLogs = users.reduce((acc, u) => acc + (u.weightLogs?.length || 0), 0);
    const totalActivities = users.reduce((acc, u) => acc + (u.activityLogs?.length || 0), 0);
    const totalMeals = users.reduce((acc, u) => acc + (u.mealLogs?.length || 0), 0);
    const totalPostureChecks = users.reduce((acc, u) => acc + (u.postureLogs?.length || 0), 0);

    // Nutrition totals
    const totalCaloriesLogged = users.reduce((acc, u) => 
      acc + (u.mealLogs?.reduce((sum, meal) => sum + (meal.calories || 0), 0) || 0), 0
    );
    const avgDailyProtein = totalMeals > 0 ? 
      Math.round(users.reduce((acc, u) => 
        acc + (u.mealLogs?.reduce((sum, meal) => sum + (meal.protein || 0), 0) || 0), 0
      ) / totalMeals) : 0;

    // Average BMI (only for users with weight logs and height)
    const usersWithBmi = users.filter(u => 
      u.weightLogs && u.weightLogs.length > 0 && u.heightCm
    );
    const avgBmi = usersWithBmi.length > 0 ? 
      (usersWithBmi.reduce((acc, u) => {
        const latestWeight = u.weightLogs[u.weightLogs.length - 1]?.weight || 0;
        const heightM = (u.heightCm || 0) / 100;
        return acc + (heightM > 0 ? latestWeight / (heightM * heightM) : 0);
      }, 0) / usersWithBmi.length).toFixed(1) : 0;

    return {
      total,
      admins,
      members,
      basic,
      premium,
      active30Days,
      withWeightLogs,
      withActivityLogs,
      withMealLogs,
      withPostureLogs,
      withFitnessProfile,
      withActivePlan,
      withCompletedSessions,
      totalWeightLogs,
      totalActivities,
      totalMeals,
      totalPostureChecks,
      totalCaloriesLogged,
      avgDailyProtein,
      avgBmi
    };
  }, [users]);

  const renderTab = () => {
    switch (activeTab) {
      case 'users':
        return <UsersTab users={users} onRefresh={loadUsers} stats={stats} />;
      case 'analytics':
        return <AnalyticsTab users={users} stats={stats} />;
      case 'health':
        return <HealthMetricsTab users={users} />;
      case 'settings':
        return <SettingsTab user={user} />;
      case 'logbook':
        return <LogbookTab users={users} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="bg-red-100 dark:bg-red-900/40 text-red-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter">Admin Portal</span>
            <h2 className="text-3xl font-black">Dashboard</h2>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your platform and monitor activity.</p>
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800">
          {(['users', 'analytics', 'health', 'settings', 'logbook'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeTab === tab
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-4">
        <div className="p-3 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800 text-sm">
          {dbLoading ? (
            <div>Checking gym logs DB status…</div>
          ) : dbError ? (
            <div className="text-rose-600">DB check error: {dbError}</div>
          ) : dbStatus ? (
            <div>
              <strong>GymLog table:</strong> {dbStatus.gym_log_table_exists ? 'present' : 'missing'} — <strong>Count:</strong> {dbStatus.gym_log_count}
            </div>
          ) : (
            <div>DB status not available</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard label="Total Users" value={stats.total} icon="👥" color="bg-primary-500" />
        <StatCard label="Admins" value={stats.admins} icon="👑" color="bg-red-500" />
        <StatCard label="Members" value={stats.members} icon="💎" color="bg-indigo-500" />
        <StatCard label="Basic" value={stats.basic} icon="🍃" color="bg-emerald-500" />
        <StatCard label="New (30d)" value={stats.active30Days} icon="🆕" color="bg-amber-500" />
        <StatCard label="With Profile" value={stats.withFitnessProfile} icon="📊" color="bg-cyan-500" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <StatCard label="Weight Logs" value={stats.totalWeightLogs} icon="⚖️" color="bg-orange-500" />
        <StatCard label="Activities" value={stats.totalActivities} icon="🏃" color="bg-lime-500" />
        <StatCard label="Meals" value={stats.totalMeals} icon="🍽️" color="bg-rose-500" />
        <StatCard label="Posture Checks" value={stats.totalPostureChecks} icon="🧘" color="bg-teal-500" />
        <StatCard label="Active Plans" value={stats.withActivePlan} icon="📋" color="bg-violet-500" />
        <StatCard label="Completed Sessions" value={stats.withCompletedSessions} icon="✅" color="bg-emerald-600" />
        <StatCard label="Calories Logged" value={stats.totalCaloriesLogged.toLocaleString()} icon="🔥" color="bg-orange-600" />
        <StatCard label="Avg Protein" value={`${stats.avgDailyProtein}g`} icon="💪" color="bg-blue-500" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin text-4xl">⏳</div>
        </div>
      ) : (
        renderTab()
      )}
    </div>
  );
};

const UsersTab: React.FC<{ users: User[]; onRefresh: () => void; stats: ReturnType<typeof useMemo<any>> }> = ({ users, onRefresh, stats }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);
  const [bulkRole, setBulkRole] = useState<string>('');
  const [showExport, setShowExport] = useState(false);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.displayName && u.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await deleteUser(id);
      onRefresh();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;
    if (window.confirm(`Delete ${selectedUsers.size} users? This cannot be undone.`)) {
      for (const id of selectedUsers) {
        await deleteUser(id);
      }
      setSelectedUsers(new Set());
      onRefresh();
    }
  };

  const handleBulkRoleChange = async () => {
    if (selectedUsers.size === 0 || !bulkRole) return;
    for (const id of selectedUsers) {
      const user = users.find(u => u.id === id);
      if (user) {
        await saveUser({ ...user, role: bulkRole as any });
      }
    }
    setSelectedUsers(new Set());
    setBulkRole('');
    onRefresh();
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedUsers(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const exportToCSV = () => {
    const headers = ['Username', 'Role', 'Email', 'Created', 'Membership Expires', 'Weight Logs', 'Activity Logs', 'Meal Logs', 'Has Fitness Profile', 'Has Active Plan'];
    const rows = filteredUsers.map(u => [
      u.username,
      u.role,
      u.email || '',
      new Date(u.createdAt).toLocaleDateString(),
      u.membershipExpires ? new Date(u.membershipExpires).toLocaleDateString() : 'N/A',
      u.weightLogs?.length || 0,
      u.activityLogs?.length || 0,
      u.mealLogs?.length || 0,
      u.fitnessProfile ? 'Yes' : 'No',
      u.activePlan ? 'Yes' : 'No'
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wellman-users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportToJSON = () => {
    const json = JSON.stringify(filteredUsers, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wellman-users-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      await saveUser(editingUser);
      onRefresh();
      setEditingUser(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
          <span className="pl-2 text-xl">🔍</span>
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent outline-none text-sm font-bold w-full lg:w-48"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="user">User</option>
        </select>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExport(!showExport)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            📤 Export
          </button>
        </div>
      </div>

      {showExport && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex gap-4">
          <button onClick={exportToCSV} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700">
            📊 Export CSV
          </button>
          <button onClick={exportToJSON} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">
            📋 Export JSON
          </button>
        </div>
      )}

      {selectedUsers.size > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 flex flex-wrap items-center gap-4">
          <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedUsers.size} selected</span>
          <select
            value={bulkRole}
            onChange={(e) => setBulkRole(e.target.value)}
            className="px-3 py-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 rounded-lg font-bold text-sm"
          >
            <option value="">Change Role...</option>
            <option value="user">User</option>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          {bulkRole && (
            <button onClick={handleBulkRoleChange} className="px-4 py-1 bg-indigo-600 text-white rounded-lg font-bold text-sm">
              Apply
            </button>
          )}
          <button onClick={handleBulkDelete} className="px-4 py-1 bg-red-600 text-white rounded-lg font-bold text-sm ml-auto">
            🗑️ Delete All
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold">User Directory</h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{filteredUsers.length} Users</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Membership</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((u) => {
                const isExpired = u.membershipExpires && new Date(u.membershipExpires) <= new Date();
                const isActive = u.role === 'admin' || u.role === 'member' || !isExpired;
                const daysLeft = u.membershipExpires ? Math.max(0, Math.ceil((new Date(u.membershipExpires).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
                return (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <img src={u.avatarUrl || `https://picsum.photos/seed/${u.avatarSeed || u.id}/40`} alt="" />
                        </div>
                        <div>
                          <div className="font-bold">{u.username}</div>
                          {u.displayName && <div className="text-xs text-slate-400">{u.displayName}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-black px-2 py-1 rounded ${
                        u.role === 'admin' ? 'bg-red-100 dark:bg-red-950 text-red-600' :
                        u.role === 'member' ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-sm">{isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {daysLeft !== null ? (
                        <span className={`text-sm font-bold ${daysLeft > 0 ? (daysLeft <= 7 ? 'text-amber-600' : 'text-emerald-600') : 'text-red-500'}`}>
                          {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => { setInspectingUser(u); }}
                          className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg text-slate-400 hover:text-indigo-600"
                          title="Inspect"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => setEditingUser({...u})}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-primary-600"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-slate-400 hover:text-red-600"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8">
            <h3 className="text-2xl font-black mb-6">Edit User</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Username</label>
                <input
                  type="text"
                  value={editingUser.username}
                  disabled
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value as any})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold"
                >
                  <option value="user">User</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Display Name</label>
                <input
                  type="text"
                  value={editingUser.displayName || ''}
                  onChange={(e) => setEditingUser({...editingUser, displayName: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Membership Expiry</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={editingUser.membershipExpires ? new Date(editingUser.membershipExpires).toISOString().split('T')[0] : ''}
                    onChange={(e) => setEditingUser({...editingUser, membershipExpires: e.target.value ? new Date(e.target.value).toISOString() : null})}
                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newDate = new Date();
                      newDate.setDate(newDate.getDate() + 30);
                      setEditingUser({...editingUser, membershipExpires: newDate.toISOString()});
                    }}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm"
                    title="Add 30 days"
                  >
                    +30d
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newDate = new Date();
                      newDate.setDate(newDate.getDate() + 90);
                      setEditingUser({...editingUser, membershipExpires: newDate.toISOString()});
                    }}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm"
                    title="Add 90 days"
                  >
                    +90d
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newDate = new Date();
                      newDate.setFullYear(newDate.getFullYear() + 1);
                      setEditingUser({...editingUser, membershipExpires: newDate.toISOString()});
                    }}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm"
                    title="Add 1 year"
                  >
                    +1yr
                  </button>
                </div>
                {editingUser.membershipExpires && (
                  <div className="mt-2 text-sm font-bold text-emerald-600">
                    {Math.ceil((new Date(editingUser.membershipExpires).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Trial Ends</label>
                <input
                  type="date"
                  value={editingUser.trialEndsAt ? new Date(editingUser.trialEndsAt).toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditingUser({...editingUser, trialEndsAt: e.target.value ? new Date(e.target.value).toISOString() : null})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Bio</label>
                <textarea
                  value={editingUser.bio || ''}
                  onChange={(e) => setEditingUser({...editingUser, bio: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl font-bold h-24"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {inspectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black">Data: {inspectingUser.username}</h3>
              <button onClick={() => setInspectingUser(null)} className="text-2xl">×</button>
            </div>
            <pre className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl text-xs overflow-x-auto">
              {JSON.stringify(inspectingUser, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

const AnalyticsTab: React.FC<{ users: User[]; stats: any }> = ({ users, stats }) => {
  const [timeRange, setTimeRange] = useState('30');

  const chartData = useMemo(() => {
    const days = parseInt(timeRange);
    const data = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = users.filter(u => {
        const created = new Date(u.createdAt).toISOString().split('T')[0];
        return created === dateStr;
      }).length;
      data.push({ date: dateStr, count });
    }
    return data;
  }, [users, timeRange]);

  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  const roleDistribution = useMemo(() => {
    return [
      { role: 'Admin', count: stats.admins, color: 'bg-red-500' },
      { role: 'Member', count: stats.members, color: 'bg-indigo-500' },
      { role: 'User', count: stats.basic, color: 'bg-emerald-500' }
    ];
  }, [stats]);

  const engagementData = useMemo(() => {
    return [
      { label: 'With Weight Logs', value: stats.withWeightLogs, percent: stats.total > 0 ? Math.round(stats.withWeightLogs / stats.total * 100) : 0 },
      { label: 'With Activity', value: stats.withActivityLogs, percent: stats.total > 0 ? Math.round(stats.withActivityLogs / stats.total * 100) : 0 },
      { label: 'With Meals', value: stats.withMealLogs, percent: stats.total > 0 ? Math.round(stats.withMealLogs / stats.total * 100) : 0 },
      { label: 'With Posture', value: stats.withPostureLogs, percent: stats.total > 0 ? Math.round(stats.withPostureLogs / stats.total * 100) : 0 },
      { label: 'With Profile', value: stats.withFitnessProfile, percent: stats.total > 0 ? Math.round(stats.withFitnessProfile / stats.total * 100) : 0 },
      { label: 'With Active Plan', value: stats.withActivePlan, percent: stats.total > 0 ? Math.round(stats.withActivePlan / stats.total * 100) : 0 },
      { label: 'Sessions Completed', value: stats.withCompletedSessions, percent: stats.total > 0 ? Math.round(stats.withCompletedSessions / stats.total * 100) : 0 }
    ];
  }, [stats]);

  const nutritionData = useMemo(() => {
    const usersWithMeals = users.filter(u => u.mealLogs && u.mealLogs.length > 0);
    const totalCalories = stats.totalCaloriesLogged;
    const avgCaloriesPerUser = usersWithMeals.length > 0 ? Math.round(totalCalories / usersWithMeals.length) : 0;
    return {
      usersTrackingMeals: stats.withMealLogs,
      totalCalories,
      avgCaloriesPerUser,
      avgProtein: stats.avgDailyProtein
    };
  }, [users, stats]);

  const workoutStats = useMemo(() => {
    const usersWithPlans = users.filter(u => u.activePlan);
    const totalSessions = usersWithPlans.reduce((acc, u) => 
      acc + (u.activePlan?.dailyWorkouts?.length || 0), 0
    );
    const completedSessions = usersWithPlans.reduce((acc, u) => 
      acc + (u.activePlan?.dailyWorkouts?.filter(w => w.completed).length || 0), 0
    );
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
    return { totalSessions, completedSessions, completionRate, usersWithPlans: stats.withActivePlan };
  }, [users, stats]);

  const postureStats = useMemo(() => {
    const usersWithPosture = users.filter(u => u.postureLogs && u.postureLogs.length > 0);
    const avgScore = usersWithPosture.length > 0 ?
      (usersWithPosture.reduce((acc, u) => 
        acc + (u.postureLogs?.reduce((sum, p) => sum + (p.score || 0), 0) || 0), 0) /
      usersWithPosture.reduce((acc, u) => acc + (u.postureLogs?.length || 0), 0)).toFixed(1) : 0;
    return {
      usersWithPosture: stats.withPostureLogs,
      totalChecks: stats.totalPostureChecks,
      avgScore
    };
  }, [users, stats]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="font-bold">Time Range:</span>
        <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Signups */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-4">User Signups</h3>
          <div className="h-48 flex items-end gap-1">
            {chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary-500 rounded-t hover:bg-primary-600 transition-colors"
                  style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                  title={`${d.date}: ${d.count} users`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Role Distribution */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-4">Role Distribution</h3>
          <div className="space-y-4">
            {roleDistribution.map(r => (
              <div key={r.role} className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span>{r.role}</span>
                  <span>{r.count} ({stats.total > 0 ? Math.round(r.count / stats.total * 100) : 0}%)</span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${r.color} rounded-full`} style={{ width: `${stats.total > 0 ? r.count / stats.total * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 lg:col-span-2">
          <h3 className="text-lg font-bold mb-4">Feature Adoption</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {engagementData.slice(0, 7).map(e => (
              <div key={e.label} className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div className="text-2xl font-black text-primary-600">{e.percent}%</div>
                <div className="text-xs font-bold text-slate-400 uppercase mt-1">{e.label}</div>
                <div className="text-xs text-slate-500">{e.value} users</div>
              </div>
            ))}
          </div>
        </div>

        {/* Nutrition Overview */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-4">Nutrition Tracking</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center">
              <div className="text-2xl font-black text-rose-600">{nutritionData.usersTrackingMeals}</div>
              <div className="text-xs font-bold text-slate-400 uppercase">Users Tracking Meals</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center">
              <div className="text-2xl font-black text-orange-600">{nutritionData.totalCalories.toLocaleString()}</div>
              <div className="text-xs font-bold text-slate-400 uppercase">Total Calories</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center">
              <div className="text-2xl font-black text-amber-600">{nutritionData.avgCaloriesPerUser}</div>
              <div className="text-xs font-bold text-slate-400 uppercase">Avg Calories/User</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center">
              <div className="text-2xl font-black text-blue-600">{nutritionData.avgProtein}g</div>
              <div className="text-xs font-bold text-slate-400 uppercase">Avg Protein/Day</div>
            </div>
          </div>
        </div>

        {/* Workout Progress */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold mb-4">Workout Progress</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <span className="text-sm font-bold">Active Plans</span>
              <span className="text-xl font-black text-indigo-600">{workoutStats.usersWithPlans}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <span className="text-sm font-bold">Total Sessions</span>
              <span className="text-xl font-black text-primary-600">{workoutStats.totalSessions}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <span className="text-sm font-bold">Completed</span>
              <span className="text-xl font-black text-emerald-600">{workoutStats.completedSessions}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <span className="text-sm font-bold">Completion Rate</span>
              <span className="text-xl font-black text-amber-600">{workoutStats.completionRate}%</span>
            </div>
          </div>
        </div>

        {/* Posture Analysis Stats */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 lg:col-span-2">
          <h3 className="text-lg font-bold mb-4">Posture Analysis</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <div className="text-2xl font-black text-teal-600">{postureStats.usersWithPosture}</div>
              <div className="text-xs font-bold text-slate-400 uppercase">Users Analyzed</div>
            </div>
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <div className="text-2xl font-black text-cyan-600">{postureStats.totalChecks}</div>
              <div className="text-xs font-bold text-slate-400 uppercase">Total Checks</div>
            </div>
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <div className="text-2xl font-black text-blue-600">{postureStats.avgScore}</div>
              <div className="text-xs font-bold text-slate-400 uppercase">Avg Score</div>
            </div>
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
              <div className="text-2xl font-black text-emerald-600">{stats.avgBmi}</div>
              <div className="text-xs font-bold text-slate-400 uppercase">Avg BMI</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HealthMetricsTab: React.FC<{ users: User[] }> = ({ users }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'posture' | 'nutrition'>('overview');

  const usersWithData = useMemo(() => {
    return users.filter(u => 
      (u.weightLogs && u.weightLogs.length > 0) ||
      (u.activityLogs && u.activityLogs.length > 0) ||
      (u.mealLogs && u.mealLogs.length > 0) ||
      (u.postureLogs && u.postureLogs.length > 0) ||
      (u.fitnessProfile) ||
      (u.activePlan)
    );
  }, [users]);

  const avgWeight = useMemo(() => {
    const weights = usersWithData.flatMap(u => u.weightLogs || []).map(w => w.weight);
    if (weights.length === 0) return 0;
    return (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1);
  }, [usersWithData]);

  const totalActivities = useMemo(() => {
    return usersWithData.reduce((acc, u) => acc + (u.activityLogs?.length || 0), 0);
  }, [usersWithData]);

  const totalMeals = useMemo(() => {
    return usersWithData.reduce((acc, u) => acc + (u.mealLogs?.length || 0), 0);
  }, [usersWithData]);

  const totalPostureChecks = useMemo(() => {
    return usersWithData.reduce((acc, u) => acc + (u.postureLogs?.length || 0), 0);
  }, [usersWithData]);

  const avgBmi = useMemo(() => {
    const usersWithBmi = usersWithData.filter(u => u.heightCm && u.weightLogs?.length);
    if (usersWithBmi.length === 0) return 'N/A';
    const bmis = usersWithBmi.map(u => {
      const latestWeight = u.weightLogs[u.weightLogs.length - 1]?.weight || 0;
      const heightM = u.heightCm / 100;
      return heightM > 0 ? latestWeight / (heightM * heightM) : 0;
    });
    return (bmis.reduce((a, b) => a + b, 0) / bmis.length).toFixed(1);
  }, [usersWithData]);

  const postureScoreDistribution = useMemo(() => {
    const scores = users.flatMap(u => u.postureLogs || []).map(p => p.score);
    if (scores.length === 0) return { excellent: 0, good: 0, fair: 0, poor: 0 };
    return {
      excellent: scores.filter(s => s >= 80).length,
      good: scores.filter(s => s >= 60 && s < 80).length,
      fair: scores.filter(s => s >= 40 && s < 60).length,
      poor: scores.filter(s => s < 40).length
    };
  }, [users]);

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800">
        {(['overview', 'posture', 'nutrition'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              activeSection === section
                ? 'bg-primary-600 text-white'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)}
          </button>
        ))}
      </div>

      {activeSection === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-3xl font-black text-primary-600">{usersWithData.length}</div>
              <div className="text-xs font-bold text-slate-400 uppercase">Users with Data</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-3xl font-black text-indigo-600">{avgWeight}kg</div>
              <div className="text-xs font-bold text-slate-400 uppercase">Avg Weight</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-3xl font-black text-emerald-600">{totalActivities}</div>
              <div className="text-xs font-bold text-slate-400 uppercase">Activities</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-3xl font-black text-amber-600">{totalMeals}</div>
              <div className="text-xs font-bold text-slate-400 uppercase">Meals</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold">User Health Data</h3>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-[10px] font-black text-slate-400 uppercase">
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Height</th>
                    <th className="px-6 py-3">Latest Wt</th>
                    <th className="px-6 py-3">BMI</th>
                    <th className="px-6 py-3">Activity</th>
                    <th className="px-6 py-3">Goal</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {usersWithData.map(u => {
                    const latestWeight = u.weightLogs?.[u.weightLogs.length - 1]?.weight || 'N/A';
                    const bmi = u.heightCm && latestWeight !== 'N/A' ? 
                      (latestWeight / ((u.heightCm / 100) ** 2)).toFixed(1) : 'N/A';
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-4 font-bold">{u.username}</td>
                        <td className="px-6 py-4">{u.heightCm ? `${u.heightCm}cm` : '-'}</td>
                        <td className="px-6 py-4">{latestWeight !== 'N/A' ? `${latestWeight}kg` : '-'}</td>
                        <td className="px-6 py-4">{bmi !== 'N/A' ? bmi : '-'}</td>
                        <td className="px-6 py-4">{u.activityLogs?.length || 0}</td>
                        <td className="px-6 py-4">
                          {u.fitnessProfile ? (
                            <span className="text-xs font-bold text-indigo-600">{u.fitnessProfile.goal}</span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedUser(u)}
                            className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeSection === 'posture' && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-bold">Posture Analysis Summary</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div className="text-3xl font-black text-teal-600">{totalPostureChecks}</div>
                <div className="text-xs font-bold text-slate-400 uppercase">Total Checks</div>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div className="text-3xl font-black text-cyan-600">{users.filter(u => u.postureLogs?.length).length}</div>
                <div className="text-xs font-bold text-slate-400 uppercase">Users Analyzed</div>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div className="text-3xl font-black text-blue-600">{postureScoreDistribution.excellent + postureScoreDistribution.good}</div>
                <div className="text-xs font-bold text-slate-400 uppercase">Good/Excellent Scores</div>
              </div>
              <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div className="text-3xl font-black text-amber-600">{postureScoreDistribution.fair + postureScoreDistribution.poor}</div>
                <div className="text-xs font-bold text-slate-400 uppercase">Needs Improvement</div>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="text-sm font-black uppercase text-slate-400 mb-4">Score Distribution</h4>
              <div className="space-y-3">
                {[
                  { label: 'Excellent (80+)', count: postureScoreDistribution.excellent, color: 'bg-emerald-500' },
                  { label: 'Good (60-79)', count: postureScoreDistribution.good, color: 'bg-lime-500' },
                  { label: 'Fair (40-59)', count: postureScoreDistribution.fair, color: 'bg-amber-500' },
                  { label: 'Poor (<40)', count: postureScoreDistribution.poor, color: 'bg-rose-500' }
                ].map(d => {
                  const total = Object.values(postureScoreDistribution).reduce((a, b) => a + b, 0);
                  const percent = total > 0 ? (d.count / total * 100).toFixed(1) : 0;
                  return (
                    <div key={d.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{d.label}</span>
                        <span>{d.count} ({percent}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full ${d.color} rounded-full`} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-black uppercase text-slate-400 mb-4">Latest Posture Checks</h4>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50">
                    <tr className="text-[10px] font-black text-slate-400 uppercase">
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Findings</th>
                      <th className="px-4 py-3">Recommendations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.flatMap(u => 
                      (u.postureLogs || []).slice(-3).map(log => ({ ...log, username: u.username }))
                    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20).map((log, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-bold">{log.username}</td>
                        <td className="px-4 py-3 text-sm">{new Date(log.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-bold px-2 py-1 rounded ${
                            log.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            log.score >= 60 ? 'bg-lime-100 text-lime-700' :
                            log.score >= 40 ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {log.score}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs max-w-xs truncate" title={log.findings?.join(', ')}>
                          {log.findings?.join(', ') || 'None'}
                        </td>
                        <td className="px-4 py-3 text-xs max-w-xs truncate" title={log.recommendations?.join(', ')}>
                          {log.recommendations?.join(', ') || 'None'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'nutrition' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-3xl font-black text-rose-600">{stats.withMealLogs}</div>
              <div className="text-xs font-bold text-slate-400 uppercase">Users Tracking Meals</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-3xl font-black text-orange-600">{stats.totalCaloriesLogged.toLocaleString()}</div>
              <div className="text-xs font-bold text-slate-400 uppercase">Total Calories</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-3xl font-black text-blue-600">{stats.avgDailyProtein}g</div>
              <div className="text-xs font-bold text-slate-400 uppercase">Avg Protein/Day</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
              <div className="text-3xl font-black text-emerald-600">{stats.totalMeals}</div>
              <div className="text-xs font-bold text-slate-400 uppercase">Total Meals</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-bold">Meal Log Details</h3>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50">
                  <tr className="text-[10px] font-black text-slate-400 uppercase">
                    <th className="px-6 py-3">User</th>
                    <th className="px-6 py-3">Meal</th>
                    <th className="px-6 py-3">Calories</th>
                    <th className="px-6 py-3">Protein</th>
                    <th className="px-6 py-3">Carbs</th>
                    <th className="px-6 py-3">Fat</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {users.flatMap(u => 
                    (u.mealLogs || []).slice(-5).map(log => ({ ...log, username: u.username }))
                  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20).map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4 font-bold">{log.username}</td>
                      <td className="px-6 py-4 text-sm">{log.mealName}</td>
                      <td className="px-6 py-4">{log.calories}</td>
                      <td className="px-6 py-4 text-emerald-600">{log.protein}g</td>
                      <td className="px-6 py-4 text-orange-600">{log.carbs}g</td>
                      <td className="px-6 py-4 text-rose-600">{log.fat}g</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(log.date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black">{selectedUser.username}</h3>
                <p className="text-slate-500">Comprehensive Health & Activity Profile</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-2xl">×</button>
            </div>

            {/* Body Metrics */}
            <div className="mb-6">
              <h4 className="text-sm font-black uppercase text-slate-400 mb-3">Body Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Height</div>
                  <div className="text-lg font-bold">{selectedUser.heightCm ? `${selectedUser.heightCm}cm` : 'Not set'}</div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Current Weight</div>
                  <div className="text-lg font-bold">
                    {selectedUser.weightLogs?.[selectedUser.weightLogs.length - 1]?.weight || 'N/A'}kg
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">BMI</div>
                  <div className="text-lg font-bold">
                    {selectedUser.heightCm && selectedUser.weightLogs?.length ? 
                      (selectedUser.weightLogs[selectedUser.weightLogs.length - 1].weight / ((selectedUser.heightCm / 100) ** 2)).toFixed(1) : 
                      'N/A'}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="text-xs text-slate-400">Body Type</div>
                  <div className="text-lg font-bold">{selectedUser.estimatedBodyType || 'Not estimated'}</div>
                </div>
              </div>
            </div>

            {/* Fitness Profile */}
            {selectedUser.fitnessProfile && (
              <div className="mb-6">
                <h4 className="text-sm font-black uppercase text-slate-400 mb-3">Fitness Profile</h4>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-slate-400">Goal</div>
                      <div className="font-bold">{selectedUser.fitnessProfile.goal}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Intensity</div>
                      <div className="font-bold">{selectedUser.fitnessProfile.intensity}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Location</div>
                      <div className="font-bold">{selectedUser.fitnessProfile.location}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Focus Areas</div>
                      <div className="font-bold text-sm">{selectedUser.fitnessProfile.focusAreas?.join(', ')}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Active Plan with Progress */}
            {selectedUser.activePlan && (
              <div className="mb-6">
                <h4 className="text-sm font-black uppercase text-slate-400 mb-3">Active Fitness Plan</h4>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                  <div className="font-bold mb-2">{selectedUser.activePlan.motivation}</div>
                  <div className="text-xs text-slate-400 mb-3">
                    Generated: {new Date(selectedUser.activePlan.generatedAt).toLocaleDateString()}
                  </div>

                  {selectedUser.activePlan.dailyWorkouts && selectedUser.activePlan.dailyWorkouts.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-bold">
                        <span>Daily Workouts</span>
                        <span>
                          {selectedUser.activePlan.dailyWorkouts.filter(w => w.completed).length} / {selectedUser.activePlan.dailyWorkouts.length} completed
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ 
                            width: `${(selectedUser.activePlan.dailyWorkouts.filter(w => w.completed).length / selectedUser.activePlan.dailyWorkouts.length) * 100}%` 
                          }}
                        />
                      </div>
                      <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                        {selectedUser.activePlan.dailyWorkouts.map((w, i) => (
                          <div 
                            key={i} 
                            className={`p-3 rounded-lg text-sm ${
                              w.completed 
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800' 
                                : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold">{w.name}</span>
                              {w.completed && <span className="text-xs text-emerald-600 font-bold">✓ Completed</span>}
                            </div>
                            <div className="text-xs text-slate-500">{w.duration} • {w.exercises?.join(', ')}</div>
                            {w.completedAt && (
                              <div className="text-xs text-slate-400 mt-1">
                                Completed: {new Date(w.completedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Posture Logs */}
            {selectedUser.postureLogs && selectedUser.postureLogs.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-black uppercase text-slate-400 mb-3">Posture Analysis History</h4>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-2 bg-white dark:bg-slate-700 rounded-lg">
                      <div className="text-xl font-bold text-teal-600">{selectedUser.postureLogs.length}</div>
                      <div className="text-xs text-slate-400">Total Checks</div>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-slate-700 rounded-lg">
                      <div className="text-xl font-bold text-cyan-600">
                        {Math.round(selectedUser.postureLogs.reduce((a, b) => a + b.score, 0) / selectedUser.postureLogs.length)}
                      </div>
                      <div className="text-xs text-slate-400">Avg Score</div>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-slate-700 rounded-lg">
                      <div className="text-xl font-bold text-blue-600">
                        {selectedUser.postureLogs[selectedUser.postureLogs.length - 1]?.score}
                      </div>
                      <div className="text-xs text-slate-400">Latest</div>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedUser.postureLogs.slice().reverse().slice(0, 10).map((log, i) => (
                      <div key={i} className="p-3 bg-white dark:bg-slate-700 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold">{new Date(log.date).toLocaleDateString()}</span>
                          <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                            log.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            log.score >= 60 ? 'bg-lime-100 text-lime-700' :
                            log.score >= 40 ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {log.score}
                          </span>
                        </div>
                        {log.findings?.length > 0 && (
                          <div className="text-xs text-slate-500">
                            <strong>Findings:</strong> {log.findings.join(', ')}
                          </div>
                        )}
                        {log.recommendations?.length > 0 && (
                          <div className="text-xs text-slate-500 mt-1">
                            <strong>Tips:</strong> {log.recommendations.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Nutrition Summary */}
            {selectedUser.mealLogs && selectedUser.mealLogs.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-black uppercase text-slate-400 mb-3">Nutrition Summary</h4>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center p-2 bg-white dark:bg-slate-700 rounded-lg">
                      <div className="text-xl font-bold text-rose-600">{selectedUser.mealLogs.length}</div>
                      <div className="text-xs text-slate-400">Total Meals</div>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-slate-700 rounded-lg">
                      <div className="text-xl font-bold text-orange-600">
                        {selectedUser.mealLogs.reduce((sum, m) => sum + m.calories, 0)}
                      </div>
                      <div className="text-xs text-slate-400">Total Calories</div>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-slate-700 rounded-lg">
                      <div className="text-xl font-bold text-blue-600">
                        {Math.round(selectedUser.mealLogs.reduce((sum, m) => sum + m.protein, 0))}g
                      </div>
                      <div className="text-xs text-slate-400">Total Protein</div>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-slate-700 rounded-lg">
                      <div className="text-xl font-bold text-emerald-600">
                        {Math.round(selectedUser.mealLogs.reduce((sum, m) => sum + m.carbs, 0))}g
                      </div>
                      <div className="text-xs text-slate-400">Total Carbs</div>
                    </div>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedUser.mealLogs.slice().reverse().slice(0, 10).map((log, i) => (
                      <div key={i} className="flex justify-between items-center p-2 bg-white dark:bg-slate-700 rounded text-sm">
                        <div>
                          <span className="font-bold">{log.mealName}</span>
                          <span className="text-xs text-slate-400 ml-2">{new Date(log.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex gap-3 text-xs">
                          <span className="text-rose-600">{log.calories} cal</span>
                          <span className="text-blue-600">{log.protein}g P</span>
                          <span className="text-orange-600">{log.carbs}g C</span>
                          <span className="text-emerald-600">{log.fat}g F</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Weight History */}
            {selectedUser.weightLogs && selectedUser.weightLogs.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-black uppercase text-slate-400 mb-2">Weight History</h4>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl max-h-40 overflow-y-auto">
                  <div className="space-y-1">
                    {selectedUser.weightLogs.slice(-10).map((w, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-400">{new Date(w.date).toLocaleDateString()}</span>
                        <span className="font-bold">{w.weight}kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsTab: React.FC<{ user: User }> = ({ user }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
        <h3 className="text-xl font-bold mb-6">Admin Profile</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-400 uppercase">Username</label>
            <div className="text-lg font-bold">{user.username}</div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase">Role</label>
            <div className="text-lg font-bold text-red-600">{user.role}</div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase">Member Since</label>
            <div className="text-lg font-bold">{new Date(user.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
        <h3 className="text-xl font-bold mb-6">Platform Information</h3>
        <div className="space-y-4 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Backend</span>
            <span className="font-bold">Railway (wellman-backend-production)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Database</span>
            <span className="font-bold">Railway PostgreSQL</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Frontend</span>
            <span className="font-bold">Vercel</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; icon: string; color: string }> = ({ label, value, icon, color }) => (
  <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
    <div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-black">{value}</div>
    </div>
    <div className={`w-10 h-10 ${color} text-white rounded-2xl flex items-center justify-center text-lg`}>
      {icon}
    </div>
  </div>
);

const LogbookTab: React.FC<{ users: User[] }> = ({ users }) => {
  const [gymLogs, setGymLogs] = useState<GymLog[]>([]);
  const [activeLogs, setActiveLogs] = useState<GymLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const all = await getAllGymLogs();
    const active = await getActiveGymLogs();
    setGymLogs(all);
    setActiveLogs(active);
    setLoading(false);
  };

  const filteredGymLogs = useMemo(() => {
    if (!searchTerm.trim()) return gymLogs.slice().reverse().slice(0, 50);
    const term = searchTerm.toLowerCase();
    return gymLogs
      .filter(log => {
        const logUsername = (log.username || '').toLowerCase();
        const user = users.find(u => u.id === log.user);
        const userUsername = (user?.username || '').toLowerCase();
        return logUsername.includes(term) || userUsername.includes(term);
      })
      .reverse()
      .slice(0, 50);
  }, [gymLogs, users, searchTerm]);

  const filteredActiveLogs = useMemo(() => {
    if (!searchTerm.trim()) return activeLogs;
    const term = searchTerm.toLowerCase();
    return activeLogs.filter(log => {
      const logUsername = (log.username || '').toLowerCase();
      const user = users.find(u => u.id === log.user);
      const userUsername = (user?.username || '').toLowerCase();
      return logUsername.includes(term) || userUsername.includes(term);
    });
  }, [activeLogs, users, searchTerm]);

  const handleTimeIn = async (user: User) => {
    try {
      await timeInUser(user.id, user.username);
      await loadLogs();
      setSelectedUser(null);
      setShowUserSelect(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to time in');
    }
  };

  const handleTimeOut = async (userId: string) => {
    try {
      await timeOutUser(userId);
      await loadLogs();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to time out');
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const activeUsers = useMemo(() => {
    return users.filter(u => filteredActiveLogs.some(log => log.user === u.id));
  }, [users, filteredActiveLogs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Gym Logbook</h3>
          <p className="text-slate-500 text-sm">Track gym check-ins and check-outs</p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-bold text-sm"
          />
          <button
            onClick={() => setShowUserSelect(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700"
          >
            + Time In User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
          <div className="text-3xl font-black text-primary-600">{filteredActiveLogs.length}</div>
          <div className="text-xs font-bold text-slate-400 uppercase">Currently in Gym</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
          <div className="text-3xl font-black text-emerald-600">{filteredGymLogs.filter(l => l.time_out).length}</div>
          <div className="text-xs font-bold text-slate-400 uppercase">Check-outs Today</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
          <div className="text-3xl font-black text-indigo-600">{filteredGymLogs.length}</div>
          <div className="text-xs font-bold text-slate-400 uppercase">Total Records</div>
        </div>
      </div>

      {filteredActiveLogs.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xl font-bold">Currently in Gym</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-[10px] font-black text-slate-400 uppercase">
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Time In</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredActiveLogs.map(log => {
                  const duration = Math.round((Date.now() - new Date(log.time_in).getTime()) / 60000);
                  const user = users.find(u => u.id === log.user);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 font-bold">
                            {log.username?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="font-bold">{log.username || user?.username || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-primary-600">{formatTime(log.time_in)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm">{duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleTimeOut(log.user)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700"
                        >
                          Time Out
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xl font-bold">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/50">
              <tr className="text-[10px] font-black text-slate-400 uppercase">
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Time In</th>
                <th className="px-6 py-3">Time Out</th>
                <th className="px-6 py-3">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredGymLogs.map(log => {
                const timeIn = new Date(log.time_in).getTime();
                const timeOut = log.time_out ? new Date(log.time_out).getTime() : null;
                const duration = timeOut ? Math.round((timeOut - timeIn) / 60000) : null;
                const user = users.find(u => u.id === log.user);
                return (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4 font-bold">{log.username || user?.username || 'Unknown'}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(log.date)}</td>
                    <td className="px-6 py-4 text-sm font-bold text-primary-600">{formatTime(log.time_in)}</td>
                    <td className="px-6 py-4 text-sm">
                      {log.time_out ? (
                        <span className="text-emerald-600 font-bold">{formatTime(log.time_out)}</span>
                      ) : (
                        <span className="text-amber-600 font-bold">In Gym</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {duration !== null ? (
                        duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showUserSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black">Time In User</h3>
              <button onClick={() => setShowUserSelect(false)} className="text-2xl">×</button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {users.map(user => {
                const isActive = activeLogs.some(log => log.user === user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => !isActive && handleTimeIn(user)}
                    disabled={isActive}
                    className={`w-full p-4 rounded-xl flex items-center justify-between ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-50 dark:bg-slate-800 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <img src={user.avatarUrl || `https://picsum.photos/seed/${user.avatarSeed || user.id}/40`} alt="" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold">{user.username}</div>
                        <div className="text-xs text-slate-400">{user.role}</div>
                      </div>
                    </div>
                    {isActive ? (
                      <span className="text-xs font-bold text-amber-600">In Gym</span>
                    ) : (
                      <span className="text-sm font-bold text-primary-600">Time In</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;