'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useApi } from '@/hooks/useApi';

interface Device {
  id: number;
  name: string;
  ip_address: string;
  vendor: string;
  device_type: string;
  connection_status: string;
  snmp_port?: number;
  snmp_version?: string;
  polling_enabled?: boolean;
  last_polled?: string;
  last_online?: string;
  vendor_model?: string;
  serial_number?: string;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const { call } = useApi();

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [search, statusFilter, devices]);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const response = await call('/devices');
      if (response.success) {
        setDevices(response.data as Device[]);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = devices;

    if (search.trim()) {
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.ip_address.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.connection_status === statusFilter);
    }

    setFilteredDevices(filtered);
  };

  const handleDelete = async (deviceId: number) => {
    if (!window.confirm('Are you sure you want to delete this device?')) return;

    try {
      await call(`/devices/${deviceId}`, { method: 'DELETE' });
      loadDevices();
    } catch (error) {
      console.error('Failed to delete device:', error);
    }
  };

  const onlineCount = devices.filter(d => d.connection_status === 'online').length;
  const offlineCount = devices.filter(d => d.connection_status === 'offline').length;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">
              Network <span className="text-orange-500">Devices</span>
            </h1>
            <p className="text-slate-400 mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Monitoring {devices.length} nodes across the network
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadDevices}
              disabled={loading}
              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
              title="Refresh Devices"
            >
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`} />
            </button>
            <Link
              href="/devices/add"
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-lg transition font-bold shadow-lg shadow-orange-500/20"
            >
              <i className="fas fa-plus" />
              Add Device
            </Link>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-1 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="p-6 flex items-center justify-between relative">
              <div>
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Inventory</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-black text-white">{devices.length}</p>
                  <p className="text-blue-400 text-sm font-bold">Devices</p>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform">
                <i className="fas fa-server text-2xl text-blue-400" />
              </div>
            </div>
          </div>

          <div className="card p-1 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="p-6 flex items-center justify-between relative">
              <div>
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Operational</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-black text-green-400">{onlineCount}</p>
                  <p className="text-green-500/60 text-sm font-bold">Online</p>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 group-hover:scale-110 transition-transform">
                <i className="fas fa-check-circle text-2xl text-green-400" />
              </div>
            </div>
          </div>

          <div className="card p-1 overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="p-6 flex items-center justify-between relative">
              <div>
                <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Disconnected</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-black text-red-400">{offlineCount}</p>
                  <p className="text-red-500/60 text-sm font-bold">Offline</p>
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform">
                <i className="fas fa-times-circle text-2xl text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by name, IP, model or serial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900/50 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-6 py-3 rounded-xl bg-slate-900/50 border border-slate-800 text-white focus:outline-none focus:border-orange-500/50 transition-all cursor-pointer appearance-none"
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>

        {/* Devices Table View */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="fas fa-list text-orange-500" />
            Device Inventory Table
          </h2>
          <div className="text-[10px] text-slate-500 font-mono">
            v2.0-table-view
          </div>
        </div>
        <div className="card overflow-hidden border-orange-500/20 shadow-2xl shadow-orange-500/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-orange-500/30">
                  <th className="px-6 py-5 text-[11px] uppercase font-black text-orange-500 tracking-widest">Device Name</th>
                  <th className="px-6 py-5 text-[11px] uppercase font-black text-slate-400 tracking-widest">IP Address</th>
                  <th className="px-6 py-5 text-[11px] uppercase font-black text-slate-400 tracking-widest text-center">Status</th>
                  <th className="px-6 py-5 text-[11px] uppercase font-black text-slate-400 tracking-widest">Vendor / Type</th>
                  <th className="px-6 py-5 text-[11px] uppercase font-black text-slate-400 tracking-widest">Last Polled</th>
                  <th className="px-6 py-5 text-[11px] uppercase font-black text-slate-400 tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredDevices.map(device => {
                  console.log('Rendering table row for:', device.name);
                  return (
                    <tr key={device.id} className="hover:bg-orange-500/[0.03] transition-all duration-300 group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${
                            device.connection_status === 'online' 
                            ? 'bg-green-500/5 border-green-500/20 text-green-400 group-hover:border-green-500/50 shadow-lg shadow-green-500/10' 
                            : 'bg-red-500/5 border-red-500/20 text-red-400 group-hover:border-red-500/50'
                          }`}>
                            <i className={`fas ${device.device_type === 'Switch' ? 'fa-network-wired' : 'fa-server'} text-sm`} />
                          </div>
                          <div>
                            <Link href={`/devices/${device.id}`} className="text-sm font-bold text-white hover:text-orange-400 transition-colors">
                              {device.name}
                            </Link>
                            <div className="text-[10px] text-slate-500 font-medium">ID: #{device.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-orange-200/70 font-mono bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">{device.ip_address}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border-2 ${
                            device.connection_status === 'online'
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${device.connection_status === 'online' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`} />
                          {device.connection_status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-white font-bold">
                            {device.vendor || 'Generic'}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest opacity-70">
                            {device.device_type || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {device.last_polled ? (
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-300 font-semibold">{new Date(device.last_polled).toLocaleDateString()}</span>
                            <span className="text-[10px] text-slate-500 font-mono uppercase">{new Date(device.last_polled).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] italic text-slate-600 bg-slate-900/50 px-2 py-1 rounded">Never Polled</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                          <Link
                            href={`/devices/${device.id}`}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700 hover:border-slate-500 shadow-lg"
                            title="View Details"
                          >
                            <i className="fas fa-eye text-xs" />
                          </Link>
                          <Link
                            href={`/devices/${device.id}/edit`}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 transition-all border border-orange-500/20 hover:border-orange-500/50 shadow-lg"
                            title="Edit Device"
                          >
                            <i className="fas fa-edit text-xs" />
                          </Link>
                          <button
                            onClick={() => handleDelete(device.id)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all border border-red-500/20 hover:border-red-500/50 shadow-lg"
                            title="Delete Device"
                          >
                            <i className="fas fa-trash-alt text-xs" />
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

        {filteredDevices.length === 0 && !loading && (
          <div className="text-center py-20 card flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mb-6 border border-slate-800">
              <i className="fas fa-search text-3xl text-slate-700" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">No devices found</h3>
            <p className="text-slate-500 max-w-xs">We couldn't find any devices matching your current search or filters.</p>
            <button 
              onClick={() => {setSearch(''); setStatusFilter('all');}}
              className="mt-6 text-orange-500 font-bold hover:text-orange-400 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
