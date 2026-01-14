'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useApi } from '@/hooks/useApi';
import { timeAgo } from '@/lib/utils';

interface BackupSchedule {
  id: string;
  device_id: number;
  device_name: string;
  backup_type: string;
  frequency: string;
  time: string;
  enabled: boolean;
  password_protected: boolean;
  last_run?: string;
  created_at: string;
}

export default function BackupSchedulesPage() {
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const { call } = useApi();

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const response = await call('/backups/schedule');
      if (response.success) {
        setSchedules(response.data as BackupSchedule[]);
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSchedule = async (scheduleId: string) => {
    // In production, call API to toggle
    setSchedules(prev =>
      prev.map(s =>
        s.id === scheduleId ? { ...s, enabled: !s.enabled } : s
      )
    );
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!window.confirm('Delete this backup schedule?')) return;
    
    setSchedules(prev => prev.filter(s => s.id !== scheduleId));
  };

  const frequencyEmoji = (freq: string) => {
    switch (freq) {
      case 'daily': return '📅';
      case 'weekly': return '📆';
      case 'monthly': return '📊';
      default: return '⏱️';
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white">Backup Schedules</h1>
            <p className="text-slate-400 mt-1">Automated backup scheduling with cron integration</p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Schedules</p>
                <p className="text-3xl font-bold text-white mt-1">{schedules.length}</p>
              </div>
              <i className="fas fa-calendar text-3xl text-blue-400" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Active</p>
                <p className="text-3xl font-bold text-green-400 mt-1">
                  {schedules.filter(s => s.enabled).length}
                </p>
              </div>
              <i className="fas fa-check-circle text-3xl text-green-400" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Protected</p>
                <p className="text-3xl font-bold text-orange-400 mt-1">
                  {schedules.filter(s => s.password_protected).length}
                </p>
              </div>
              <i className="fas fa-lock text-3xl text-orange-400" />
            </div>
          </div>
        </div>

        {/* Schedules List */}
        <div className="space-y-4">
          {schedules.length === 0 ? (
            <div className="text-center py-12 card p-8">
              <i className="fas fa-calendar text-4xl text-slate-500 mb-4" />
              <p className="text-slate-400 text-lg">No backup schedules configured</p>
            </div>
          ) : (
            schedules.map(schedule => (
              <div key={schedule.id} className="card p-6 hover:border-orange-500/50 transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{frequencyEmoji(schedule.frequency)}</span>
                      <h3 className="text-lg font-bold text-white">{schedule.device_name}</h3>
                      {schedule.password_protected && (
                        <i className="fas fa-lock text-yellow-400" title="Password protected" />
                      )}
                    </div>
                    <p className="text-slate-400 text-sm">
                      {schedule.backup_type} • Every {schedule.frequency} at {schedule.time}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 ml-4">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        schedule.enabled
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {schedule.enabled ? 'Enabled' : 'Disabled'}
                    </span>

                    <button
                      onClick={() => handleToggleSchedule(schedule.id)}
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded transition"
                    >
                      <i className={`fas ${schedule.enabled ? 'fa-pause' : 'fa-play'}`} />
                    </button>

                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1 rounded transition"
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Backup Type</p>
                    <p className="text-white">{schedule.backup_type}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Frequency</p>
                    <p className="text-white capitalize">{schedule.frequency}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Scheduled Time</p>
                    <p className="text-white">{schedule.time} UTC</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Last Run</p>
                    <p className="text-white">
                      {schedule.last_run ? timeAgo(schedule.last_run) : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg space-y-2">
          <p className="text-sm text-blue-400 flex gap-2">
            <i className="fas fa-info-circle mt-0.5 flex-shrink-0" />
            <strong>Scheduler Features:</strong>
          </p>
          <ul className="text-sm text-blue-300 ml-6 space-y-1 list-disc">
            <li>Automated backup creation based on cron schedule</li>
            <li>Daily, weekly, and monthly scheduling options</li>
            <li>Optional password encryption for sensitive backups</li>
            <li>Automatic encrypted storage on remote server</li>
            <li>Failed backup alerts and retry mechanisms</li>
            <li>Full backup lifecycle tracking and logging</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
