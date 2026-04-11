import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { getAllUsers, saveUser, deleteUser } from '../services/DB';

type TabType = 'users' | 'analytics' | 'health' | 'settings';

const AdminDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setLoading(false);
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
    const withFitnessProfile = users.filter(u => u.fitnessProfile).length;
    const withActivePlan = users.filter(u => u.activePlan).length;

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
      withFitnessProfile,
      withActivePlan
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
          {(['users', 'analytics', 'health', 'settings'] as TabType[]).map((tab) => (
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

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard label="Total Users" value={stats.total} icon="👥" color="bg-primary-500" />
        <StatCard label="Admins" value={stats.admins} icon="👑" color="bg-red-500" />
        <StatCard label="Members" value={stats.members} icon="💎" color="bg-indigo-500" />
        <StatCard label="Basic Users" value={stats.basic} icon="🍃" color="bg-emerald-500" />
        <StatCard label="New (30d)" value={stats.active30Days} icon="🆕" color="bg-amber-500" />
        <StatCard label="With Data" value={stats.withFitnessProfile} icon="📊" color="bg-cyan-500" />
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
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((u) => {
                const isExpired = u.membershipExpires && new Date(u.membershipExpires) <= new Date();
                const isActive = u.role === 'admin' || u.role === 'member' || !isExpired;
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
      { label: 'Weight Logs', value: stats.withWeightLogs, percent: stats.total > 0 ? Math.round(stats.withWeightLogs / stats.total * 100) : 0 },
      { label: 'Activity Logs', value: stats.withActivityLogs, percent: stats.total > 0 ? Math.round(stats.withActivityLogs / stats.total * 100) : 0 },
      { label: 'Meal Logs', value: stats.withMealLogs, percent: stats.total > 0 ? Math.round(stats.withMealLogs / stats.total * 100) : 0 },
      { label: 'Fitness Profile', value: stats.withFitnessProfile, percent: stats.total > 0 ? Math.round(stats.withFitnessProfile / stats.total * 100) : 0 },
      { label: 'Active Plan', value: stats.withActivePlan, percent: stats.total > 0 ? Math.round(stats.withActivePlan / stats.total * 100) : 0 }
    ];
  }, [stats]);

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

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 lg:col-span-2">
          <h3 className="text-lg font-bold mb-4">Engagement Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {engagementData.map(e => (
              <div key={e.label} className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <div className="text-3xl font-black text-primary-600">{e.percent}%</div>
                <div className="text-xs font-bold text-slate-400 uppercase mt-1">{e.label}</div>
                <div className="text-xs text-slate-500">{e.value} users</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const HealthMetricsTab: React.FC<{ users: User[] }> = ({ users }) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const usersWithData = useMemo(() => {
    return users.filter(u => 
      (u.weightLogs && u.weightLogs.length > 0) ||
      (u.activityLogs && u.activityLogs.length > 0) ||
      (u.mealLogs && u.mealLogs.length > 0) ||
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

  return (
    <div className="space-y-6">
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
          <div className="text-xs font-bold text-slate-400 uppercase">Activities Logged</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
          <div className="text-3xl font-black text-amber-600">{totalMeals}</div>
          <div className="text-xs font-bold text-slate-400 uppercase">Meals Logged</div>
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
                <th className="px-6 py-3">Weight Logs</th>
                <th className="px-6 py-3">Activity</th>
                <th className="px-6 py-3">Meals</th>
                <th className="px-6 py-3">Profile</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usersWithData.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-bold">{u.username}</td>
                  <td className="px-6 py-4">{u.weightLogs?.length || 0}</td>
                  <td className="px-6 py-4">{u.activityLogs?.length || 0}</td>
                  <td className="px-6 py-4">{u.mealLogs?.length || 0}</td>
                  <td className="px-6 py-4">
                    {u.fitnessProfile ? (
                      <span className="text-xs font-bold text-indigo-600">{u.fitnessProfile.goal}</span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {u.activePlan ? (
                      <span className="text-xs font-bold text-emerald-600">{u.activePlan.dailyWorkouts?.length || 0} workouts</span>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black">{selectedUser.username}</h3>
                <p className="text-slate-500">Health Data Details</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-2xl">×</button>
            </div>

            {selectedUser.fitnessProfile && (
              <div className="mb-6">
                <h4 className="text-sm font-black uppercase text-slate-400 mb-2">Fitness Profile</h4>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-xs text-slate-400">Goal:</span> <span className="font-bold">{selectedUser.fitnessProfile.goal}</span></div>
                    <div><span className="text-xs text-slate-400">Intensity:</span> <span className="font-bold">{selectedUser.fitnessProfile.intensity}</span></div>
                    <div><span className="text-xs text-slate-400">Location:</span> <span className="font-bold">{selectedUser.fitnessProfile.location}</span></div>
                    <div><span className="text-xs text-slate-400">Focus:</span> <span className="font-bold">{selectedUser.fitnessProfile.focusAreas?.join(', ')}</span></div>
                  </div>
                </div>
              </div>
            )}

            {selectedUser.activePlan && (
              <div className="mb-6">
                <h4 className="text-sm font-black uppercase text-slate-400 mb-2">Active Plan</h4>
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl space-y-2">
                  <div className="font-bold">{selectedUser.activePlan.motivation}</div>
                  {selectedUser.activePlan.dailyWorkouts?.map((w, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-bold">{w.name}</span> ({w.duration}) - {w.exercises?.join(', ')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-black uppercase text-slate-400 mb-2">Recent Weight Logs</h4>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl max-h-40 overflow-y-auto">
                {selectedUser.weightLogs?.length ? (
                  <div className="space-y-1">
                    {selectedUser.weightLogs.slice(-10).map((w, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-400">{new Date(w.date).toLocaleDateString()}</span>
                        <span className="font-bold">{w.weight}kg</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">No weight logs</p>
                )}
              </div>
            </div>
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

export default AdminDashboard;