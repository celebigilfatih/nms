'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { timeAgo } from '@/lib/utils';

interface Settings {
  polling_interval: number;
  notification_email: string;
  alarm_threshold_cpu: number;
  alarm_threshold_memory: number;
  alarm_threshold_disk: number;
  retention_days: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  last_login?: string;
  created_at: string;
  two_factor_enabled: boolean;
}

interface AuthSettings {
  password_policy: Record<string, any>;
  session_policy: Record<string, any>;
  mfa_policy: Record<string, any>;
  login_policy: Record<string, any>;
  audit_settings: Record<string, any>;
}

type TabType = 'general' | 'users' | 'permissions' | 'authentication';

export default function SettingsPage() {
  const { user } = useAuth();
  const { call } = useApi();

  const [activeTab, setActiveTab] = useState<TabType>('general');

  // General Settings State
  const [settings, setSettings] = useState<Settings>({
    polling_interval: 60,
    notification_email: '',
    alarm_threshold_cpu: 80,
    alarm_threshold_memory: 85,
    alarm_threshold_disk: 90,
    retention_days: 30,
  });

  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingUserData, setEditingUserData] = useState<Partial<User> | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    full_name: '',
    role: 'viewer',
  });

  // Auth Settings State
  const [authSettings, setAuthSettings] = useState<AuthSettings | null>(null);

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSettings();
    loadUsers();
    loadAuthSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await call('/settings');
      if (response.success) {
        setSettings(response.data as Settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await call('/users');
      if (response.success) {
        setUsers(response.data as User[]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const loadAuthSettings = async () => {
    try {
      const response = await call('/auth/settings');
      if (response.success) {
        setAuthSettings(response.data as AuthSettings);
      }
    } catch (error) {
      console.error('Failed to load auth settings:', error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const newValue = type === 'number' ? parseInt(value, 10) : value;

    setSettings(prev => ({ ...prev, [name]: newValue }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateSettings = () => {
    const newErrors: Record<string, string> = {};

    if (settings.polling_interval < 10 || settings.polling_interval > 3600) {
      newErrors.polling_interval = 'Polling interval must be between 10 and 3600 seconds';
    }

    if (settings.alarm_threshold_cpu < 0 || settings.alarm_threshold_cpu > 100) {
      newErrors.alarm_threshold_cpu = 'CPU threshold must be between 0 and 100';
    }

    if (
      settings.alarm_threshold_memory < 0 ||
      settings.alarm_threshold_memory > 100
    ) {
      newErrors.alarm_threshold_memory = 'Memory threshold must be between 0 and 100';
    }

    if (settings.alarm_threshold_disk < 0 || settings.alarm_threshold_disk > 100) {
      newErrors.alarm_threshold_disk = 'Disk threshold must be between 0 and 100';
    }

    if (settings.retention_days < 1 || settings.retention_days > 365) {
      newErrors.retention_days = 'Retention days must be between 1 and 365';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateSettings()) return;

    setLoading(true);
    try {
      const response = await call('/settings', {
        method: 'PUT',
        data: settings,
      });

      if (response.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUser.username || !newUser.email) {
      setError('Username and email are required');
      return;
    }

    setLoading(true);
    try {
      const response = await call('/users', {
        method: 'POST',
        data: newUser,
      });

      if (response.success) {
        setUsers([...users, response.data]);
        setNewUser({ username: '', email: '', full_name: '', role: 'viewer' });
        setShowAddUserForm(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to add user:', error);
      setError('Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Delete this user?')) return;

    setLoading(true);
    try {
      const response = await call(`/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.success) {
        setUsers(users.filter(u => u.id !== userId));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      setError('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    setLoading(true);
    try {
      const response = await call(`/users/${userId}`, {
        method: 'PUT',
        data: { status: newStatus },
      });

      if (response.success) {
        setUsers(users.map(u => (u.id === userId ? response.data : u)));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      setError('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setEditingUserData({ ...user });
  };

  const handleSaveUserEdit = async () => {
    if (!editingUserData || !editingUserId) return;

    setLoading(true);
    try {
      const response = await call(`/users/${editingUserId}`, {
        method: 'PUT',
        data: {
          full_name: editingUserData.full_name,
          role: editingUserData.role,
          status: editingUserData.status,
        },
      });

      if (response.success) {
        setUsers(users.map(u => (u.id === editingUserId ? response.data : u)));
        setEditingUserId(null);
        setEditingUserData(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save user:', error);
      setError('Failed to save user changes');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingUserData(null);
  };

  const handleSaveAuthSettings = async () => {
    if (!authSettings) return;

    setLoading(true);
    try {
      const response = await call('/auth/settings', {
        method: 'PUT',
        data: authSettings,
      });

      if (response.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save auth settings:', error);
      setError('Failed to save authentication settings');
    } finally {
      setLoading(false);
    }
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-red-500/20 text-red-400',
    operator: 'bg-blue-500/20 text-blue-400',
    viewer: 'bg-green-500/20 text-green-400',
    guest: 'bg-slate-500/20 text-slate-400',
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400',
    inactive: 'bg-red-500/20 text-red-400',
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 mt-1">Configure application and user management</p>
        </div>

        {/* Alerts */}
        {saved && (
          <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm flex items-center gap-2">
            <i className="fas fa-check-circle" />
            Changes saved successfully!
          </div>
        )}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <i className="fas fa-exclamation-circle" />
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-700 flex-wrap">
          {(['general', 'users', 'permissions', 'authentication'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium transition border-b-2 ${
                activeTab === tab
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <i
                className={`fas ${
                  tab === 'general'
                    ? 'fa-cogs'
                    : tab === 'users'
                    ? 'fa-users'
                    : tab === 'permissions'
                    ? 'fa-lock'
                    : 'fa-shield-alt'
                } mr-2`}
              />
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* TAB: General Settings */}
        {activeTab === 'general' && (
          <form onSubmit={handleSubmitSettings} className="card p-8 space-y-8 max-w-2xl">
            {/* User Profile */}
            <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-user text-blue-400" />
                Your Profile
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-slate-400 text-sm">Email</p>
                  <p className="text-white font-semibold">{user?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Role</p>
                  <p className="text-white font-semibold">
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Polling Configuration */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-cogs text-green-400" />
                Polling Configuration
              </h2>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Polling Interval (seconds)
                </label>
                <input
                  type="number"
                  name="polling_interval"
                  value={settings.polling_interval}
                  onChange={handleChange}
                  min="10"
                  max="3600"
                  className={`w-full px-4 py-2 rounded-lg bg-slate-900/50 border ${
                    errors.polling_interval ? 'border-red-500' : 'border-slate-700'
                  } text-white focus:outline-none focus:border-orange-500 transition`}
                />
                {errors.polling_interval && (
                  <p className="text-red-400 text-xs mt-1">{errors.polling_interval}</p>
                )}
              </div>
            </div>

            {/* Alarm Thresholds */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-bell text-red-400" />
                Alarm Thresholds
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    CPU (%)
                  </label>
                  <input
                    type="number"
                    name="alarm_threshold_cpu"
                    value={settings.alarm_threshold_cpu}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Memory (%)
                  </label>
                  <input
                    type="number"
                    name="alarm_threshold_memory"
                    value={settings.alarm_threshold_memory}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Disk (%)
                  </label>
                  <input
                    type="number"
                    name="alarm_threshold_disk"
                    value={settings.alarm_threshold_disk}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Data Retention */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-database text-orange-400" />
                Data Retention
              </h2>
              <input
                type="number"
                name="retention_days"
                value={settings.retention_days}
                onChange={handleChange}
                min="1"
                max="365"
                className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white"
              />
            </div>

            {/* Notifications */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-envelope text-yellow-400" />
                Notifications
              </h2>
              <input
                type="email"
                name="notification_email"
                value={settings.notification_email}
                onChange={handleChange}
                placeholder="admin@example.com"
                className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-6 border-t border-slate-700">
              <button
                type="button"
                onClick={loadSettings}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition"
              >
                {loading && <i className="fas fa-spinner fa-spin" />}
                Save Settings
              </button>
            </div>
          </form>
        )}

        {/* TAB: User Management */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total Users</p>
                    <p className="text-3xl font-bold text-white mt-1">{users.length}</p>
                  </div>
                  <i className="fas fa-users text-3xl text-blue-400" />
                </div>
              </div>
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Active</p>
                    <p className="text-3xl font-bold text-green-400 mt-1">
                      {users.filter(u => u.status === 'active').length}
                    </p>
                  </div>
                  <i className="fas fa-check-circle text-3xl text-green-400" />
                </div>
              </div>
              <div className="card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Admins</p>
                    <p className="text-3xl font-bold text-red-400 mt-1">
                      {users.filter(u => u.role === 'admin').length}
                    </p>
                  </div>
                  <i className="fas fa-crown text-3xl text-red-400" />
                </div>
              </div>
            </div>

            {/* Add User Button */}
            {!showAddUserForm && (
              <button
                onClick={() => setShowAddUserForm(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
              >
                <i className="fas fa-plus" />
                Add New User
              </button>
            )}

            {/* Add User Form */}
            {showAddUserForm && (
              <div className="card p-6 space-y-4">
                <h3 className="text-lg font-bold text-white">Add New User</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Username"
                    value={newUser.username}
                    onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                    className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500"
                  />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newUser.full_name}
                    onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                    className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500"
                  />
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white"
                  >
                    <option value="admin">Admin</option>
                    <option value="operator">Operator</option>
                    <option value="viewer">Viewer</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handleAddUser}
                    disabled={loading}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition"
                  >
                    {loading ? 'Adding...' : 'Add User'}
                  </button>
                  <button
                    onClick={() => setShowAddUserForm(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Users List */}
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="card p-4 hover:border-orange-500/50 transition">
                  {editingUserId === u.id && editingUserData ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <h3 className="text-white font-semibold text-lg">Edit User</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                          <input
                            type="text"
                            value={editingUserData.full_name || ''}
                            onChange={e => setEditingUserData({ ...editingUserData, full_name: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                          <input
                            type="email"
                            value={editingUserData.email || ''}
                            disabled
                            className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-slate-400 opacity-50 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                          <select
                            value={editingUserData.role || 'viewer'}
                            onChange={e => setEditingUserData({ ...editingUserData, role: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white"
                          >
                            <option value="admin">Admin</option>
                            <option value="operator">Operator</option>
                            <option value="viewer">Viewer</option>
                            <option value="guest">Guest</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                          <select
                            value={editingUserData.status || 'active'}
                            onChange={e => setEditingUserData({ ...editingUserData, status: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <button
                          onClick={handleSaveUserEdit}
                          disabled={loading}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {loading && <i className="fas fa-spinner fa-spin" />}
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-white font-semibold">{u.full_name}</h3>
                          <p className="text-slate-400 text-sm">@{u.username}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${roleColors[u.role]}`}>
                            {u.role.toUpperCase()}
                          </span>
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColors[u.status]}`}>
                            {u.status}
                          </span>
                          {u.two_factor_enabled && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full">
                              <i className="fas fa-shield-alt mr-1" />
                              2FA
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                        <div>
                          <p className="text-slate-500">Email</p>
                          <p className="text-white">{u.email}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Created</p>
                          <p className="text-white">{timeAgo(u.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Last Login</p>
                          <p className="text-white">{u.last_login ? timeAgo(u.last_login) : 'Never'}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditUser(u)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded transition flex items-center justify-center gap-2"
                        >
                          <i className="fas fa-edit" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(u.id, u.status)}
                          className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded transition"
                          title={u.status === 'active' ? 'Deactivate user' : 'Activate user'}
                        >
                          <i className={`fas ${u.status === 'active' ? 'fa-ban' : 'fa-check'}`} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          disabled={u.role === 'admin'}
                          className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-2 rounded transition disabled:opacity-50"
                          title="Delete user"
                        >
                          <i className="fas fa-trash-alt" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: Permissions */}
        {activeTab === 'permissions' && (
          <div className="card p-8 space-y-6 max-w-3xl">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-lock text-orange-400" />
                Role-Based Permissions
              </h2>
              <p className="text-slate-400 mb-6">Define what each role can access and modify</p>

              <div className="space-y-6">
                {['admin', 'operator', 'viewer', 'guest'].map(role => (
                  <div key={role} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                    <h3 className="text-white font-semibold mb-3 capitalize">
                      {role === 'admin' && <i className="fas fa-crown text-red-400 mr-2" />}
                      {role === 'operator' && <i className="fas fa-user-tie text-blue-400 mr-2" />}
                      {role === 'viewer' && <i className="fas fa-eye text-green-400 mr-2" />}
                      {role === 'guest' && <i className="fas fa-user text-slate-400 mr-2" />}
                      {role}
                    </h3>
                    <p className="text-slate-400 text-sm mb-3">
                      {role === 'admin' && 'Full system access with all permissions'}
                      {role === 'operator' && 'Can manage devices and view monitoring data'}
                      {role === 'viewer' && 'Read-only access to dashboards and reports'}
                      {role === 'guest' && 'Limited access to public dashboards'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
                <p className="text-blue-400 text-sm flex items-start gap-2">
                  <i className="fas fa-info-circle mt-1 flex-shrink-0" />
                  <span>
                    Role permissions are automatically managed. Modify user roles on the Users tab to adjust permissions.
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Authentication Settings */}
        {activeTab === 'authentication' && authSettings && (
          <div className="space-y-6 max-w-3xl">
            {/* Password Policy */}
            <div className="card p-6 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fas fa-key text-yellow-400" />
                Password Policy
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Minimum Length
                  </label>
                  <input
                    type="number"
                    value={authSettings.password_policy.min_length}
                    onChange={e =>
                      setAuthSettings({
                        ...authSettings,
                        password_policy: {
                          ...authSettings.password_policy,
                          min_length: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Expiry (days)
                  </label>
                  <input
                    type="number"
                    value={authSettings.password_policy.expiry_days}
                    onChange={e =>
                      setAuthSettings({
                        ...authSettings,
                        password_policy: {
                          ...authSettings.password_policy,
                          expiry_days: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={authSettings.password_policy.require_uppercase}
                    onChange={e =>
                      setAuthSettings({
                        ...authSettings,
                        password_policy: {
                          ...authSettings.password_policy,
                          require_uppercase: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                  Require Uppercase Letters
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={authSettings.password_policy.require_numbers}
                    onChange={e =>
                      setAuthSettings({
                        ...authSettings,
                        password_policy: {
                          ...authSettings.password_policy,
                          require_numbers: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                  Require Numbers
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={authSettings.password_policy.require_special_chars}
                    onChange={e =>
                      setAuthSettings({
                        ...authSettings,
                        password_policy: {
                          ...authSettings.password_policy,
                          require_special_chars: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 rounded"
                  />
                  Require Special Characters
                </label>
              </div>
            </div>

            {/* Session Policy */}
            <div className="card p-6 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fas fa-clock text-blue-400" />
                Session Management
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    value={authSettings.session_policy.session_timeout_minutes}
                    onChange={e =>
                      setAuthSettings({
                        ...authSettings,
                        session_policy: {
                          ...authSettings.session_policy,
                          session_timeout_minutes: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Sessions Per User
                  </label>
                  <input
                    type="number"
                    value={authSettings.session_policy.max_sessions_per_user}
                    onChange={e =>
                      setAuthSettings({
                        ...authSettings,
                        session_policy: {
                          ...authSettings.session_policy,
                          max_sessions_per_user: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* MFA Policy */}
            <div className="card p-6 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fas fa-shield-alt text-green-400" />
                Multi-Factor Authentication
              </h2>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={authSettings.mfa_policy.mfa_required_for_admin}
                  onChange={e =>
                    setAuthSettings({
                      ...authSettings,
                      mfa_policy: {
                        ...authSettings.mfa_policy,
                        mfa_required_for_admin: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded"
                />
                Require MFA for Admin Users
              </label>
            </div>

            {/* Login Policy */}
            <div className="card p-6 space-y-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fas fa-sign-in-alt text-orange-400" />
                Login Policy
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Failed Attempts
                  </label>
                  <input
                    type="number"
                    value={authSettings.login_policy.max_failed_attempts}
                    onChange={e =>
                      setAuthSettings({
                        ...authSettings,
                        login_policy: {
                          ...authSettings.login_policy,
                          max_failed_attempts: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Lockout Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={authSettings.login_policy.lockout_duration_minutes}
                    onChange={e =>
                      setAuthSettings({
                        ...authSettings,
                        login_policy: {
                          ...authSettings.login_policy,
                          lockout_duration_minutes: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-4">
              <button
                onClick={loadAuthSettings}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Reset
              </button>
              <button
                onClick={handleSaveAuthSettings}
                disabled={loading}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition"
              >
                {loading && <i className="fas fa-spinner fa-spin" />}
                Save Authentication Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
