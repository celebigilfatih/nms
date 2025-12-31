'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useApi } from '@/hooks/useApi';
import { validateIP, validatePort } from '@/lib/utils';

interface Vendor {
  id: number;
  name: string;
  display_name: string;
  category: string;
  active: boolean;
}

export default function AddDevicePage() {
  const router = useRouter();
  const { call } = useApi();
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    ip: '',
    port: '161',
    connection_type: 'SNMP',
    // SSH fields
    ssh_username: '',
    ssh_password: '',
    // API fields
    api_url: '',
    api_method: 'GET',
    api_key: '',
    // SNMP fields
    snmp_version: 'v2c',
    community_string: 'public',
    snmp_username: '',
    snmp_auth_protocol: 'MD5',
    snmp_auth_password: '',
    snmp_privacy_protocol: 'DES',
    snmp_privacy_password: '',
    // Common fields
    vendor: '',
    device_type: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const response = await call('/vendors');
      if (response.success && Array.isArray(response.data)) {
        setVendors(response.data);
      }
    } catch (error) {
      console.error('Failed to load vendors:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Common validation
    if (!formData.name.trim()) newErrors.name = 'Device name is required';
    if (!formData.ip.trim()) newErrors.ip = 'IP address is required';
    if (!validateIP(formData.ip)) newErrors.ip = 'Invalid IP address format';
    if (!validatePort(formData.port)) newErrors.port = 'Invalid port number (1-65535)';

    // Connection type specific validation
    if (formData.connection_type === 'SSH') {
      if (!formData.ssh_username.trim()) newErrors.ssh_username = 'SSH username is required';
      if (!formData.ssh_password.trim()) newErrors.ssh_password = 'SSH password is required';
    } else if (formData.connection_type === 'API') {
      if (!formData.api_url.trim()) newErrors.api_url = 'API URL is required';
      if (!formData.api_key.trim()) newErrors.api_key = 'API key is required';
    } else if (formData.connection_type === 'SNMP') {
      if (formData.snmp_version === 'v2c' && !formData.community_string.trim()) {
        newErrors.community_string = 'Community string is required for SNMPv2c';
      }
      if (formData.snmp_version === 'v3') {
        if (!formData.snmp_username.trim()) newErrors.snmp_username = 'Username is required for SNMPv3';
        if (!formData.snmp_auth_password.trim()) newErrors.snmp_auth_password = 'Auth password is required for SNMPv3';
        if (!formData.snmp_privacy_password.trim()) newErrors.snmp_privacy_password = 'Privacy password is required for SNMPv3';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      // Convert frontend field names to backend field names
      const payload = {
        name: formData.name,
        ip_address: formData.ip,  // Convert 'ip' to 'ip_address'
        snmp_port: formData.port,  // Convert 'port' to 'snmp_port'
        connection_type: formData.connection_type,
        // SSH fields
        ssh_username: formData.ssh_username,
        ssh_password: formData.ssh_password,
        // API fields
        api_url: formData.api_url,
        api_method: formData.api_method,
        api_key: formData.api_key,
        // SNMP fields
        snmp_version: formData.snmp_version,
        snmp_community: formData.community_string,  // Convert 'community_string' to 'snmp_community'
        snmp_username: formData.snmp_username,
        snmp_auth_protocol: formData.snmp_auth_protocol,
        snmp_auth_password: formData.snmp_auth_password,
        snmp_privacy_protocol: formData.snmp_privacy_protocol,
        snmp_privacy_password: formData.snmp_privacy_password,
        // Common fields
        vendor: formData.vendor,
        device_type: formData.device_type,
      };

      const response = await call('/devices', {
        method: 'POST',
        data: payload,
      });

      if (response.success) {
        router.push('/devices');
      } else {
        setErrors({ submit: response.error || 'Failed to add device' });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setErrors({ submit: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white">Add Device</h1>
          <p className="text-slate-400 mt-1">Configure a new network device for monitoring</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-8 space-y-6">
          {errors.submit && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Basic Info */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <i className="fas fa-server text-purple-400" />
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Device Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Core Router 1"
                  className={`w-full px-4 py-2 rounded-lg bg-slate-900/50 border ${
                    errors.name ? 'border-red-500' : 'border-slate-700'
                  } text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition`}
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    IP Address *
                  </label>
                  <input
                    type="text"
                    name="ip"
                    value={formData.ip}
                    onChange={handleChange}
                    placeholder="192.168.1.1"
                    className={`w-full px-4 py-2 rounded-lg bg-slate-900/50 border ${
                      errors.ip ? 'border-red-500' : 'border-slate-700'
                    } text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition`}
                  />
                  {errors.ip && <p className="text-red-400 text-xs mt-1">{errors.ip}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Port
                  </label>
                  <input
                    type="number"
                    name="port"
                    value={formData.port}
                    onChange={handleChange}
                    min="1"
                    max="65535"
                    className={`w-full px-4 py-2 rounded-lg bg-slate-900/50 border ${
                      errors.port ? 'border-red-500' : 'border-slate-700'
                    } text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition`}
                  />
                  {errors.port && <p className="text-red-400 text-xs mt-1">{errors.port}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Connection Type */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <i className="fas fa-link text-orange-400" />
              Connection Type
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Select Connection Protocol
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['SSH', 'API', 'SNMP'].map(type => (
                  <label key={type} className="flex items-center gap-3 p-4 rounded-lg border border-slate-700 hover:border-orange-500/50 cursor-pointer transition">
                    <input
                      type="radio"
                      name="connection_type"
                      value={type}
                      checked={formData.connection_type === type}
                      onChange={handleChange}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="font-medium text-slate-300">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* SSH Configuration */}
          {formData.connection_type === 'SSH' && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-terminal text-green-400" />
                SSH Configuration
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    name="ssh_username"
                    value={formData.ssh_username}
                    onChange={handleChange}
                    placeholder="e.g., admin"
                    className={`w-full px-4 py-2 rounded-lg bg-slate-900/50 border ${
                      errors.ssh_username ? 'border-red-500' : 'border-slate-700'
                    } text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition`}
                  />
                  {errors.ssh_username && <p className="text-red-400 text-xs mt-1">{errors.ssh_username}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="ssh_password"
                      value={formData.ssh_password}
                      onChange={handleChange}
                      className={`w-full px-4 py-2 rounded-lg bg-slate-900/50 border ${
                        errors.ssh_password ? 'border-red-500' : 'border-slate-700'
                      } text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} />
                    </button>
                  </div>
                  {errors.ssh_password && <p className="text-red-400 text-xs mt-1">{errors.ssh_password}</p>}
                </div>
              </div>
            </div>
          )}

          {/* API Configuration */}
          {formData.connection_type === 'API' && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-code text-blue-400" />
                API Configuration
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    API URL *
                  </label>
                  <input
                    type="text"
                    name="api_url"
                    value={formData.api_url}
                    onChange={handleChange}
                    placeholder="https://api.example.com/v1/devices"
                    className={`w-full px-4 py-2 rounded-lg bg-slate-900/50 border ${
                      errors.api_url ? 'border-red-500' : 'border-slate-700'
                    } text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition`}
                  />
                  {errors.api_url && <p className="text-red-400 text-xs mt-1">{errors.api_url}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    HTTP Method
                  </label>
                  <select
                    name="api_method"
                    value={formData.api_method}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-purple-500 transition"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    API Key *
                  </label>
                  <input
                    type="password"
                    name="api_key"
                    value={formData.api_key}
                    onChange={handleChange}
                    placeholder="Your API key"
                    className={`w-full px-4 py-2 rounded-lg bg-slate-900/50 border ${
                      errors.api_key ? 'border-red-500' : 'border-slate-700'
                    } text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition`}
                  />
                  {errors.api_key && <p className="text-red-400 text-xs mt-1">{errors.api_key}</p>}
                </div>
              </div>
            </div>
          )}

          {/* SNMP Configuration */}
          {formData.connection_type === 'SNMP' && (
            <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <i className="fas fa-cogs text-blue-400" />
              SNMP Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  SNMP Version
                </label>
                <select
                  name="snmp_version"
                  value={formData.snmp_version}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-purple-500 transition"
                >
                  <option value="v2c">SNMPv2c</option>
                  <option value="v3">SNMPv3</option>
                </select>
              </div>

              {formData.snmp_version === 'v2c' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Community String
                  </label>
                  <input
                    type="password"
                    name="community_string"
                    value={formData.community_string}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              )}

              {formData.snmp_version === 'v3' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      name="snmp_username"
                      value={formData.snmp_username}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Auth Protocol
                    </label>
                    <select
                      name="snmp_auth_protocol"
                      value={formData.snmp_auth_protocol}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-purple-500 transition"
                    >
                      <option value="MD5">MD5</option>
                      <option value="SHA">SHA</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Auth Password
                    </label>
                    <input
                      type="password"
                      name="snmp_auth_password"
                      value={formData.snmp_auth_password}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Privacy Protocol
                    </label>
                    <select
                      name="snmp_privacy_protocol"
                      value={formData.snmp_privacy_protocol}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-purple-500 transition"
                    >
                      <option value="DES">DES</option>
                      <option value="3DES">3DES</option>
                      <option value="AES">AES</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Privacy Password
                    </label>
                    <input
                      type="password"
                      name="snmp_privacy_password"
                      value={formData.snmp_privacy_password}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          )}

          {/* Device Details */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <i className="fas fa-info-circle text-green-400" />
              Device Details
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Vendor
                </label>
                <select
                  name="vendor"
                  value={formData.vendor}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-purple-500 transition"
                >
                  <option value="">Select Vendor</option>
                  {vendors.length > 0 ? (
                    // Group vendors by category
                    Object.entries(
                      vendors.reduce((acc: Record<string, Vendor[]>, vendor) => {
                        if (!acc[vendor.category]) acc[vendor.category] = [];
                        acc[vendor.category].push(vendor);
                        return acc;
                      }, {})
                    )
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([category, categoryVendors]) => (
                        <optgroup key={category} label={category}>
                          {categoryVendors.map(vendor => (
                            <option key={vendor.id} value={vendor.name}>
                              {vendor.display_name}
                            </option>
                          ))}
                        </optgroup>
                      ))
                  ) : (
                    <option>Loading vendors...</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Device Type
                </label>
                <select
                  name="device_type"
                  value={formData.device_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-purple-500 transition"
                >
                  <option value="">Select Type</option>
                  <option value="Router">Router</option>
                  <option value="Switch">Switch</option>
                  <option value="Firewall">Firewall</option>
                  <option value="Server">Server</option>
                  <option value="Printer">Printer</option>
                </select>
              </div>
            </div>
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
              disabled={loading}
              className="flex-1 btn-primary py-2 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <i className="fas fa-spinner fa-spin" />}
              {loading ? 'Adding...' : 'Add Device'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
