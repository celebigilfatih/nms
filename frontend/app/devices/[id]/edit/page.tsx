'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useApi } from '@/hooks/useApi';

interface Device {
  id: number;
  name: string;
  ip_address: string;
  vendor: string;
  device_type: string;
  snmp_port?: number;
  snmp_version?: string;
  snmp_community?: string;
  location?: string;
  notes?: string;
  polling_enabled?: boolean;
  ssh_username?: string;
  ssh_password?: string;
}

export default function EditDevicePage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = params.id as string;

  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Partial<Device>>({});

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
        const deviceData = response.data as Device;
        setDevice(deviceData);
        setFormData(deviceData);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device) return;

    setSaving(true);
    try {
      const response = await call(`/devices/${device.id}`, {
        method: 'PUT',
        data: formData
      });

      if (response.success) {
        alert('Device updated successfully');
        router.push(`/devices/${device.id}`);
      } else {
        setError(response.error || 'Failed to update device');
      }
    } catch (err) {
      console.error('Failed to update device:', err);
      setError('An error occurred while updating the device');
    } finally {
      setSaving(false);
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-slate-400 hover:text-white transition"
          >
            <i className="fas fa-arrow-left text-xl" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-white">Edit Device</h1>
            <p className="text-slate-400 mt-1">{device.name}</p>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="card p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <i className="fas fa-server text-blue-400" />
              Basic Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Device Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">IP Address *</label>
                <input
                  type="text"
                  name="ip_address"
                  value={formData.ip_address || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Vendor *</label>
                <select
                  name="vendor"
                  value={formData.vendor || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-purple-500 transition"
                >
                  <option value="">Select Vendor</option>
                  <option value="hp">HP</option>
                  <option value="cisco">Cisco</option>
                  <option value="arista">Arista</option>
                  <option value="juniper">Juniper</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Device Type *</label>
                <select
                  name="device_type"
                  value={formData.device_type || ''}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-purple-500 transition"
                >
                  <option value="">Select Type</option>
                  <option value="switch">Switch</option>
                  <option value="router">Router</option>
                  <option value="firewall">Firewall</option>
                  <option value="server">Server</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                  placeholder="e.g., Data Center 1"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">SNMP Version</label>
                <select
                  name="snmp_version"
                  value={formData.snmp_version || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-purple-500 transition"
                >
                  <option value="">Auto-detect</option>
                  <option value="v1">SNMPv1</option>
                  <option value="v2c">SNMPv2c</option>
                  <option value="v3">SNMPv3</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">SNMP Community</label>
                <input
                  type="text"
                  name="snmp_community"
                  value={formData.snmp_community || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                  placeholder="public"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">SNMP Port</label>
                <input
                  type="number"
                  name="snmp_port"
                  value={formData.snmp_port || 161}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-sm mb-2 mt-6">Notes</label>
              <textarea
                name="notes"
                value={formData.notes || ''}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                placeholder="Additional notes about this device..."
              />
            </div>
          </div>

          {/* SSH Credentials (Optional) */}
          <div className="card p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <i className="fas fa-lock text-green-400" />
              SSH Credentials (Optional)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-slate-400 text-sm mb-2">SSH Username</label>
                <input
                  type="text"
                  name="ssh_username"
                  value={formData.ssh_username || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                  placeholder="e.g., admin"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-2">SSH Password</label>
                <input
                  type="password"
                  name="ssh_password"
                  value={formData.ssh_password || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                  placeholder="Password for backup retrieval"
                />
              </div>
            </div>

            <p className="text-slate-400 text-xs mt-4">
              <i className="fas fa-info-circle mr-2" />
              SSH credentials are used for automated configuration backups
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white px-6 py-2 rounded-lg transition font-medium"
            >
              {saving ? (
                <>
                  <i className="fas fa-spinner fa-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save" />
                  Save Changes
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-2 btn-secondary px-6 py-2 rounded-lg"
            >
              <i className="fas fa-times" />
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
