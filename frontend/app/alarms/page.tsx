'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useApi } from '@/hooks/useApi';
import { useWebSocket } from '@/hooks/useWebSocket';
import { timeAgo } from '@/lib/utils';

interface Alarm {
  id: number;
  device_name: string;
  device_id?: number;
  message: string;
  severity: string;
  status: string;
  created_at: string;
  acknowledged_at?: string;
}

export default function AlarmsPage() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [filteredAlarms, setFilteredAlarms] = useState<Alarm[]>([]);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const { call } = useApi();
  const { isConnected, subscribe, lastMessage } = useWebSocket();

  useEffect(() => {
    loadAlarms();
    if (isConnected) {
      subscribe('alarms');
    }
  }, [isConnected]);

  useEffect(() => {
    if (lastMessage?.type === 'alarmCreated') {
      loadAlarms();
    }
  }, [lastMessage]);

  useEffect(() => {
    applyFilters();
  }, [severityFilter, statusFilter, alarms]);

  const loadAlarms = async () => {
    setLoading(true);
    try {
      const response = await call('/alarms');
      if (response.success) {
        setAlarms(response.data as Alarm[]);
      }
    } catch (error) {
      console.error('Failed to load alarms:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = alarms;

    if (severityFilter !== 'all') {
      filtered = filtered.filter(a => a.severity === severityFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    setFilteredAlarms(filtered);
  };

  const acknowledgeAlarm = async (alarmId: number) => {
    try {
      await call(`/alarms/${alarmId}/acknowledge`, { method: 'PATCH' });
      loadAlarms();
    } catch (error) {
      console.error('Failed to acknowledge alarm:', error);
    }
  };

  const deleteAlarm = async (alarmId: number) => {
    if (!window.confirm('Are you sure you want to delete this alarm?')) return;

    try {
      await call(`/alarms/${alarmId}`, { method: 'DELETE' });
      loadAlarms();
    } catch (error) {
      console.error('Failed to delete alarm:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      default:
        return 'text-slate-400';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 border-red-500/50';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/50';
      case 'info':
        return 'bg-blue-500/10 border-blue-500/50';
      default:
        return 'bg-slate-500/10 border-slate-500/50';
    }
  };

  const criticalCount = alarms.filter(a => a.severity === 'critical').length;
  const warningCount = alarms.filter(a => a.severity === 'warning').length;
  const acknowledgedCount = alarms.filter(a => a.status === 'acknowledged').length;
  const activeCount = alarms.filter(a => a.status === 'active').length;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white">Alarms</h1>
            <p className="text-slate-400 mt-1">Monitor network alerts and incidents</p>
          </div>
          <button
            onClick={loadAlarms}
            disabled={loading}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition font-medium"
          >
            <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Alarms</p>
                <p className="text-3xl font-bold text-white mt-1">{alarms.length}</p>
              </div>
              <i className="fas fa-bell text-3xl text-blue-400" />
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Critical</p>
                <p className="text-3xl font-bold text-red-400 mt-1">{criticalCount}</p>
              </div>
              <i className="fas fa-exclamation-circle text-3xl text-red-400" />
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Active</p>
                <p className="text-3xl font-bold text-orange-400 mt-1">{activeCount}</p>
              </div>
              <i className="fas fa-clock text-3xl text-orange-400" />
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Acknowledged</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{acknowledgedCount}</p>
              </div>
              <i className="fas fa-check-circle text-3xl text-green-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-purple-500 transition"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-purple-500 transition"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* Alarms List */}
        <div className="space-y-4">
          {filteredAlarms.map(alarm => (
            <div
              key={alarm.id}
              className={`card p-6 border-l-4 ${getSeverityBg(alarm.severity)} transition hover:border-l-2`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <i className={`fas fa-exclamation-circle ${getSeverityColor(alarm.severity)}`} />
                    <h3 className="text-lg font-bold text-white">{alarm.message}</h3>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        alarm.status === 'active'
                          ? 'bg-red-500/20 text-red-400'
                          : alarm.status === 'acknowledged'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {alarm.status.charAt(0).toUpperCase() + alarm.status.slice(1)}
                    </span>
                  </div>

                  <p className="text-slate-400 text-sm">
                    <strong>{alarm.device_name}</strong> • {timeAgo(alarm.created_at)}
                  </p>
                </div>

                <div className="flex gap-2 ml-4">
                  {alarm.status === 'active' && (
                    <button
                      onClick={() => acknowledgeAlarm(alarm.id)}
                      className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 px-3 py-1 rounded transition"
                    >
                      <i className="fas fa-check" />
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => deleteAlarm(alarm.id)}
                    className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1 rounded transition"
                  >
                    <i className="fas fa-trash" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredAlarms.length === 0 && !loading && (
            <div className="text-center py-12 card p-8">
              <i className="fas fa-check-circle text-4xl text-green-400 mb-4" />
              <p className="text-slate-400 text-lg">No alarms found</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
