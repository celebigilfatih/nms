'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useApi } from '@/hooks/useApi';
import { timeAgo } from '@/lib/utils';

interface DeviceMetrics {
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  network_in?: number;
  network_out?: number;
}

interface Interface {
  id: number;
  name: string;
  ip_address: string;
  status: string;
  in_octets: number;
  out_octets: number;
  in_errors: number;
  out_errors: number;
  speed: number;
  mtu: number;
  type: string;
  last_updated: string;
}

interface Device {
  id: number;
  name: string;
  ip_address: string;
  vendor: string;
  device_type: string;
  connection_status: string;
  snmp_port?: number;
  snmp_version?: string;
  snmp_community?: string;
  last_polled?: string;
  last_online?: string;
  polling_enabled?: boolean;
  location?: string;
  notes?: string;
  metrics?: any;
  interfaces?: Interface[];
}

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = params.id as string;

  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [operatingPort, setOperatingPort] = useState<string | null>(null);

  const { call } = useApi();

  useEffect(() => {
    loadDevice();
  }, [deviceId]);

  const loadDevice = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await call(`/devices/${deviceId}`);
      if (response.success) {
        setDevice(response.data as Device);
      } else {
        setError('Failed to load device details');
      }
    } catch (err) {
      console.error('Failed to load device:', err);
      setError('An error occurred while loading the device');
    } finally {
      setLoading(false);
    }
  };

  const handlePortToggle = async (portName: string, currentStatus: string) => {
    setOperatingPort(portName);
    try {
      const response = await call(`/devices/${deviceId}/ports/${portName}/toggle`, {
        method: 'POST',
        data: { currentStatus }
      });

      if (response.success) {
        // Update the interface status locally
        if (device && device.interfaces) {
          const updatedInterfaces = device.interfaces.map(iface => 
            iface.name === portName 
              ? { ...iface, status: currentStatus === 'up' ? 'down' : 'up' }
              : iface
          );
          setDevice({ ...device, interfaces: updatedInterfaces });
        }
        alert(`Port ${portName} ${currentStatus === 'up' ? 'disabled' : 'enabled'} successfully`);
      } else {
        alert(`Error: ${response.error || 'Failed to toggle port'}`);
      }
    } catch (err) {
      console.error('Failed to toggle port:', err);
      alert('Error toggling port');
    } finally {
      setOperatingPort(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <i className="fas fa-spinner fa-spin text-3xl text-purple-400" />
        </div>
      </Layout>
    );
  }

  if (error || !device) {
    return (
      <Layout>
        <div className="card p-8 text-center">
          <i className="fas fa-exclamation-circle text-4xl text-red-400 mb-4" />
          <p className="text-red-400 text-lg mb-4">{error || 'Device not found'}</p>
          <button
            onClick={() => router.back()}
            className="btn-secondary px-4 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-slate-400 hover:text-white transition"
            >
              <i className="fas fa-arrow-left text-xl" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-white">{device.name}</h1>
              <p className="text-slate-400 mt-1">{device.ip_address}</p>
            </div>
          </div>
          <span
            className={`px-4 py-2 rounded-lg text-lg font-semibold ${
              device.connection_status === 'online' ? 'status-online' : 'status-offline'
            }`}
          >
            {device.connection_status ? device.connection_status.charAt(0).toUpperCase() + device.connection_status.slice(1) : 'Unknown'}
          </span>
        </div>

        {/* Basic Information - Compact Single Row with Icons */}
        <div className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-6 lg:gap-8">
            {/* IP Address */}
            <div className="flex items-center gap-2">
              <i className="fas fa-network-wired text-blue-400 text-lg" />
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">IP</p>
                <p className="text-white font-semibold">{device.ip_address}</p>
              </div>
            </div>

            {/* Vendor */}
            <div className="flex items-center gap-2">
              <i className="fas fa-building text-purple-400 text-lg" />
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">Vendor</p>
                <p className="text-white font-semibold">{device.vendor || 'N/A'}</p>
              </div>
            </div>

            {/* Device Type */}
            <div className="flex items-center gap-2">
              <i className="fas fa-microchip text-cyan-400 text-lg" />
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">Type</p>
                <p className="text-white font-semibold">{device.device_type || 'N/A'}</p>
              </div>
            </div>

            {/* SNMP Port */}
            <div className="flex items-center gap-2">
              <i className="fas fa-plug text-yellow-400 text-lg" />
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">SNMP Port</p>
                <p className="text-white font-semibold">{device.snmp_port || 161}</p>
              </div>
            </div>

            {/* Last Polled */}
            <div className="flex items-center gap-2">
              <i className="fas fa-clock text-green-400 text-lg" />
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">Polled</p>
                <p className="text-white font-semibold">{device.last_polled ? timeAgo(device.last_polled) : 'Never'}</p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <i
                className={`fas fa-circle text-lg ${
                  device.connection_status === 'online' ? 'text-green-400' : 'text-red-400'
                }`}
              />
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-wider">Status</p>
                <p className="text-white font-semibold">
                  {device.connection_status ? device.connection_status.charAt(0).toUpperCase() + device.connection_status.slice(1) : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        {device.metrics && device.metrics.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <i className="fas fa-chart-bar text-green-400" />
              System Metrics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {device.metrics.map((metric: any) => {
                const value = parseFloat(metric.metric_value);
                let icon = 'fas fa-gauge';
                let color = 'text-blue-400';
                let statusColor = 'text-green-400';
                
                if (metric.metric_type === 'cpu') {
                  icon = 'fas fa-microchip';
                  color = 'text-purple-400';
                } else if (metric.metric_type === 'memory') {
                  icon = 'fas fa-memory';
                  color = 'text-blue-400';
                } else if (metric.metric_type === 'disk') {
                  icon = 'fas fa-hdd';
                  color = 'text-yellow-400';
                } else if (metric.metric_type === 'uptime') {
                  icon = 'fas fa-clock';
                  color = 'text-cyan-400';
                }

                if (value > 80) statusColor = 'text-red-400';
                else if (value > 60) statusColor = 'text-yellow-400';

                return (
                  <div key={metric.id} className="card p-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-slate-400 text-sm font-semibold">{metric.metric_name}</p>
                      <i className={`${icon} ${color} text-xl`} />
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {value.toFixed(1)}{metric.metric_unit}
                    </p>
                    {metric.metric_unit === '%' && (
                      <div className="mt-3 bg-slate-900/50 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            value > 80
                              ? 'bg-red-500'
                              : value > 60
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(value, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Network Interfaces */}
        {device.interfaces && device.interfaces.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <i className="fas fa-network-wired text-blue-400" />
              Network Interfaces ({device.interfaces.length})
            </h2>

            <div className="overflow-x-auto card p-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">Interface</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">IP Address</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-semibold">Status</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-semibold">Incoming</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-semibold">Outgoing</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-semibold">Errors</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-semibold">Speed</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {device.interfaces.map((iface: Interface) => {
                    const inOctets = typeof iface.in_octets === 'string' ? parseInt(iface.in_octets) : iface.in_octets;
                    const outOctets = typeof iface.out_octets === 'string' ? parseInt(iface.out_octets) : iface.out_octets;
                    const inErrors = typeof iface.in_errors === 'string' ? parseInt(iface.in_errors) : iface.in_errors;
                    const outErrors = typeof iface.out_errors === 'string' ? parseInt(iface.out_errors) : iface.out_errors;
                    const speed = typeof iface.speed === 'string' ? parseInt(iface.speed) : iface.speed;
                    
                    const inMB = (inOctets / (1024 * 1024)).toFixed(2);
                    const outMB = (outOctets / (1024 * 1024)).toFixed(2);
                    const speedGbps = (speed / 1000000000).toFixed(1);
                    const totalErrors = inErrors + outErrors;

                    return (
                      <tr key={iface.id} className="border-b border-slate-700/50 hover:bg-slate-900/30 transition">
                        <td className="py-3 px-4">
                          <span className="text-white font-semibold">{iface.name}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{iface.ip_address || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                              iface.status === 'up'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {iface.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">{inMB} MB</td>
                        <td className="py-3 px-4 text-right text-slate-300">{outMB} MB</td>
                        <td className="py-3 px-4 text-right">
                          {totalErrors > 0 ? (
                            <span className="text-red-400 font-semibold">{totalErrors}</span>
                          ) : (
                            <span className="text-green-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300">{speedGbps} Gbps</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handlePortToggle(iface.name, iface.status)}
                            disabled={operatingPort === iface.name}
                            className={`px-3 py-1 rounded text-xs font-semibold transition ${
                              iface.status === 'up'
                                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {operatingPort === iface.name ? (
                              <i className="fas fa-spinner fa-spin" />
                            ) : iface.status === 'up' ? (
                              <>
                                <i className="fas fa-times mr-1" />
                                Close
                              </>
                            ) : (
                              <>
                                <i className="fas fa-check mr-1" />
                                Open
                              </>
                            )}
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

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={loadDevice}
            className="flex items-center gap-2 btn-secondary px-4 py-2 rounded-lg"
          >
            <i className="fas fa-sync" />
            Refresh
          </button>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 btn-primary px-4 py-2 rounded-lg"
          >
            <i className="fas fa-arrow-left" />
            Back
          </button>
        </div>
      </div>
    </Layout>
  );
}
