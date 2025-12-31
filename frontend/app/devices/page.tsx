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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white">Devices</h1>
            <p className="text-slate-400 mt-1">Manage network devices</p>
          </div>
          <Link
            href="/devices/add"
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition font-medium"
          >
            <i className="fas fa-plus" />
            Add Device
          </Link>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Devices</p>
                <p className="text-3xl font-bold text-white mt-1">{devices.length}</p>
              </div>
              <i className="fas fa-server text-3xl text-blue-400" />
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Online</p>
                <p className="text-3xl font-bold text-green-400 mt-1">{onlineCount}</p>
              </div>
              <i className="fas fa-check-circle text-3xl text-green-400" />
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Offline</p>
                <p className="text-3xl font-bold text-red-400 mt-1">{offlineCount}</p>
              </div>
              <i className="fas fa-times-circle text-3xl text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Search by device name or IP address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-purple-500 transition"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>

        {/* Devices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevices.map(device => (
            <Link
              key={device.id}
              href={`/devices/${device.id}`}
              className="card p-6 hover:border-purple-500/50 transition cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition">
                    {device.name}
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">{device.ip_address}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${
                    device.connection_status === 'online'
                      ? 'status-online'
                      : 'status-offline'
                  }`}
                >
                  {device.connection_status ? device.connection_status.charAt(0).toUpperCase() + device.connection_status.slice(1) : 'Unknown'}
                </span>
              </div>

              <div className="space-y-2 text-sm text-slate-400 mb-4">
                <div className="flex justify-between">
                  <span>Vendor:</span>
                  <span className="text-white">{device.vendor || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="text-white">{device.device_type || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Port:</span>
                  <span className="text-white">{device.snmp_port || 161}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-700">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = `/devices/${device.id}/edit`;
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 text-sm rounded-lg transition"
                >
                  <i className="fas fa-edit" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(device.id);
                  }}
                  className="flex-1 btn-danger py-2 text-sm rounded-lg"
                >
                  <i className="fas fa-trash mr-1" />
                  Delete
                </button>
              </div>
            </Link>
          ))}
        </div>

        {filteredDevices.length === 0 && !loading && (
          <div className="text-center py-12 card p-8">
            <i className="fas fa-inbox text-4xl text-slate-500 mb-4" />
            <p className="text-slate-400 text-lg">No devices found</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
