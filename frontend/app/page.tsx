'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useApi } from '@/hooks/useApi';
import { useWebSocket } from '@/hooks/useWebSocket';
import { timeAgo } from '@/lib/utils';

interface Device {
  id: number;
  name: string;
  ip_address: string;
  connection_status: string;
  cpu_usage?: number;
  memory_usage?: number;
  last_polled: string;
}

interface Alarm {
  id: number;
  device_name: string;
  message: string;
  severity: string;
  created_at: string;
}

interface Metric {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { call } = useApi();
  const { isConnected, lastMessage, subscribe } = useWebSocket();

  // Load initial data
  useEffect(() => {
    loadDashboardData();

    // Subscribe to WebSocket channels only if configured
    if (isConnected) {
      subscribe('dashboard');
      subscribe('devices');
      subscribe('alarms');
    }
  }, [isConnected]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage?.type === 'deviceUpdate') {
      console.log('Device update received:', lastMessage);
      loadDashboardData();
    } else if (lastMessage?.type === 'alarmCreated') {
      console.log('New alarm received:', lastMessage);
      loadAlarms();
    }
  }, [lastMessage]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [devicesRes, alarmsRes] = await Promise.all([
        call('/devices'),
        call('/alarms'),
      ]);

      if (devicesRes.success) {
        const deviceList = devicesRes.data as Device[];
        setDevices(deviceList);
        updateMetrics(deviceList, alarms);
      }

      if (alarmsRes.success) {
        const alarmList = (alarmsRes.data as Alarm[]).slice(0, 5);
        setAlarms(alarmList);
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAlarms = async () => {
    try {
      const response = await call('/alarms');
      if (response.success) {
        const alarmList = (response.data as Alarm[]).slice(0, 5);
        setAlarms(alarmList);
        updateMetrics(devices, alarmList);
      }
    } catch (error) {
      console.error('Failed to load alarms:', error);
    }
  };

  const updateMetrics = (deviceList: Device[], alarmList: Alarm[]) => {
    const onlineCount = deviceList.filter(d => d.connection_status === 'online').length;
    const offlineCount = deviceList.filter(d => d.connection_status === 'offline').length;
    const criticalAlarms = alarmList.filter(a => a.severity === 'critical').length;

    setMetrics([
      {
        title: 'Total Devices',
        value: deviceList.length,
        icon: 'fa-server',
        color: 'text-blue-400',
      },
      {
        title: 'Online',
        value: onlineCount,
        icon: 'fa-check-circle',
        color: 'text-green-400',
      },
      {
        title: 'Offline',
        value: offlineCount,
        icon: 'fa-times-circle',
        color: 'text-red-400',
      },
      {
        title: 'Critical Alarms',
        value: criticalAlarms,
        icon: 'fa-exclamation-circle',
        color: 'text-red-500',
      },
      {
        title: 'WebSocket',
        value: isConnected ? 'Connected' : 'Disconnected',
        icon: 'fa-wifi',
        color: isConnected ? 'text-green-400' : 'text-red-400',
      },
    ]);
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-slate-400">
              Network monitoring overview
              {lastUpdate && ` • Last update: ${timeAgo(lastUpdate)}`}
            </p>
          </div>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition font-medium"
          >
            <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {metrics.map((metric, index) => (
            <div key={index} className="card p-6 hover:border-purple-500/50 transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 text-sm font-medium">{metric.title}</h3>
                <i className={`fas ${metric.icon} ${metric.color} text-xl`} />
              </div>
              <p className={`text-3xl font-bold ${metric.color}`}>{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Devices Table */}
          <div className="lg:col-span-2 card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fas fa-server text-orange-400" />
                Connected Devices
              </h2>
              <span className="text-xs bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full">
                {devices.length} total
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">
                      Device Name
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">
                      IP Address
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">
                      Last Polled
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {devices.slice(0, 5).map(device => (
                    <tr key={device.id} className="table-row hover:bg-slate-900/30 transition cursor-pointer" onClick={() => router.push(`/devices/${device.id}`)}>
                      <td className="py-3 px-4 text-white font-medium hover:text-blue-400 transition">
                        <a className="hover:underline">{device.name}</a>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{device.ip_address}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                            device.connection_status === 'online'
                              ? 'status-online'
                              : 'status-offline'
                          }`}
                        >
                          <i
                            className={`fas fa-circle text-xs ${
                              device.connection_status === 'online'
                                ? 'text-green-400'
                                : 'text-red-400'
                            }`}
                          />
                          {device.connection_status ? device.connection_status.charAt(0).toUpperCase() + device.connection_status.slice(1) : 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {timeAgo(device.last_polled)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {devices.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <i className="fas fa-inbox text-3xl mb-2" />
                  <p>No devices found</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Alarms */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <i className="fas fa-bell text-red-400" />
              Recent Alarms
            </h2>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {alarms.map(alarm => (
                <div
                  key={alarm.id}
                  className={`p-3 rounded-lg border ${
                    alarm.severity === 'critical'
                      ? 'bg-red-500/10 border-red-500/50'
                      : alarm.severity === 'warning'
                      ? 'bg-yellow-500/10 border-yellow-500/50'
                      : 'bg-blue-500/10 border-blue-500/50'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <i
                      className={`fas fa-exclamation-circle mt-0.5 flex-shrink-0 ${
                        alarm.severity === 'critical'
                          ? 'text-red-400'
                          : alarm.severity === 'warning'
                          ? 'text-yellow-400'
                          : 'text-blue-400'
                      }`}
                    />
                    <p className="text-white text-sm font-medium flex-1">
                      {alarm.message}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 pl-6">
                    {alarm.device_name} • {timeAgo(alarm.created_at)}
                  </p>
                </div>
              ))}

              {alarms.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  <i className="fas fa-check-circle text-2xl mb-2 text-green-400" />
                  <p className="text-sm">No active alarms</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
