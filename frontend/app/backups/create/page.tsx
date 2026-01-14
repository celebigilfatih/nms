'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useApi } from '@/hooks/useApi';

interface Device {
  id: number;
  name: string;
  ip_address: string;
  connection_status: string;
}

export default function CreateBackupPage() {
  const router = useRouter();
  const { call } = useApi();

  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);

  // Load devices from API on component mount
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const response = await call('/devices', { method: 'GET' });
        if (response.success && Array.isArray(response.data)) {
          setDevices(response.data);
        }
      } catch (error) {
        console.error('Failed to load devices:', error);
      } finally {
        setDevicesLoading(false);
      }
    };
    loadDevices();
  }, []);

  const [formData, setFormData] = useState({
    device_id: '',
    backup_type: 'running-config',
    backup_name: '',
    description: '',
    schedule: 'once',
    schedule_time: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.device_id) newErrors.device_id = 'Device is required';
    if (!formData.backup_name.trim()) newErrors.backup_name = 'Backup name is required';
    if (formData.schedule !== 'once' && !formData.schedule_time) {
      newErrors.schedule_time = 'Schedule time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setProgress(10);

    try {
      // Simulate backup creation with progress
      for (let i = 10; i < 90; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setProgress(i);
      }

      const response = await call('/backups', {
        method: 'POST',
        data: {
          device_id: parseInt(formData.device_id),
          backup_type: formData.backup_type,
          backup_name: formData.backup_name,
          description: formData.description,
          schedule: formData.schedule,
          schedule_time: formData.schedule_time || null,
        },
      });

      if (response.success) {
        setProgress(100);
        await new Promise(resolve => setTimeout(resolve, 500));
        router.push('/backups');
      } else {
        setErrors({ submit: response.error || 'Failed to create backup' });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setErrors({ submit: message });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white">Create Backup</h1>
          <p className="text-slate-400 mt-1">Create a new configuration backup for a device</p>
        </div>

        {/* Loading State */}
        {devicesLoading && (
          <div className="p-6 bg-slate-900/50 border border-slate-700 rounded-lg flex items-center gap-3">
            <i className="fas fa-spinner fa-spin text-lg text-orange-400" />
            <p className="text-slate-300">Loading devices...</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-8 space-y-6">
          {errors.submit && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Progress Bar */}
          {progress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <p className="text-sm text-slate-400">Creating backup...</p>
                <p className="text-sm text-orange-400">{progress}%</p>
              </div>
              <div className="w-full bg-slate-900/50 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Device Selection */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <i className="fas fa-server text-blue-400" />
              Select Device
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Device *
              </label>
              <select
                name="device_id"
                value={formData.device_id}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg bg-slate-900/50 border ${
                  errors.device_id ? 'border-red-500' : 'border-slate-700'
                } text-white focus:outline-none focus:border-orange-500 transition`}
              >
                <option value="">Choose a device...</option>
                {devices.map(device => (
                  <option key={device.id} value={String(device.id)}>
                    {device.name} ({device.ip_address}) - {device.connection_status}
                  </option>
                ))}
              </select>
              {errors.device_id && (
                <p className="text-red-400 text-xs mt-1">{errors.device_id}</p>
              )}
            </div>
          </div>

          {/* Backup Configuration */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <i className="fas fa-cogs text-green-400" />
              Backup Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Backup Type *
                </label>
                <select
                  name="backup_type"
                  value={formData.backup_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition"
                >
                  <option value="running-config">Running Config</option>
                  <option value="startup-config">Startup Config</option>
                  <option value="full-backup">Full Backup</option>
                  <option value="system-logs">System Logs</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Backup Name *
                </label>
                <input
                  type="text"
                  name="backup_name"
                  value={formData.backup_name}
                  onChange={handleChange}
                  placeholder="e.g., Router-01-20251226-backup"
                  className={`w-full px-4 py-2 rounded-lg bg-slate-900/50 border ${
                    errors.backup_name ? 'border-red-500' : 'border-slate-700'
                  } text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition`}
                />
                {errors.backup_name && (
                  <p className="text-red-400 text-xs mt-1">{errors.backup_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Add notes about this backup..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition resize-none"
                />
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <i className="fas fa-calendar text-yellow-400" />
              Schedule
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Schedule Type
                </label>
                <select
                  name="schedule"
                  value={formData.schedule}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition"
                >
                  <option value="once">Run Now</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {formData.schedule !== 'once' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Schedule Time
                  </label>
                  <input
                    type="time"
                    name="schedule_time"
                    value={formData.schedule_time}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg bg-slate-900/50 border ${
                      errors.schedule_time ? 'border-red-500' : 'border-slate-700'
                    } text-white focus:outline-none focus:border-orange-500 transition`}
                  />
                  {errors.schedule_time && (
                    <p className="text-red-400 text-xs mt-1">{errors.schedule_time}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
            <p className="text-sm text-blue-400 flex gap-2">
              <i className="fas fa-info-circle mt-0.5 flex-shrink-0" />
              <span>
                Backup will be encrypted and stored securely. You can restore it later or download it for archival.
              </span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t border-slate-700">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 btn-secondary py-2 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || devicesLoading}
              className="flex-1 btn-primary py-2 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <i className="fas fa-spinner fa-spin" />}
              {loading ? 'Creating...' : 'Create Backup'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
