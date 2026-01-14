'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { useApi } from '@/hooks/useApi';
import { timeAgo } from '@/lib/utils';

interface Backup {
  id: number;
  device_id: number;
  device_name: string;
  backup_type: string;
  file_name: string;
  file_size: number | string;
  status: string;
  created_at: string;
  checksum?: string | null;
  description?: string;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [filteredBackups, setFilteredBackups] = useState<Backup[]>([]);
  const [search, setSearch] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedBackups, setSelectedBackups] = useState<number[]>([]);

  const { call } = useApi();

  useEffect(() => {
    loadBackups();
  }, [call]);

  useEffect(() => {
    applyFilters();
  }, [search, deviceFilter, typeFilter, backups]);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const response = await call('/backups');
      if (response.success) {
        setBackups(response.data as Backup[]);
      }
    } catch (error) {
      console.error('Failed to load backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = backups;

    if (search.trim()) {
      filtered = filtered.filter(b =>
        b.device_name.toLowerCase().includes(search.toLowerCase()) ||
        b.file_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (deviceFilter !== 'all') {
      filtered = filtered.filter(b => b.device_name === deviceFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(b => b.backup_type === typeFilter);
    }

    setFilteredBackups(filtered);
  };

  const handleSelectBackup = (backupId: number) => {
    setSelectedBackups(prev =>
      prev.includes(backupId)
        ? prev.filter(id => id !== backupId)
        : [...prev, backupId]
    );
  };

  const handleDownloadBackup = async (backupId: number) => {
    try {
      const backup = backups.find(b => b.id === backupId);
      if (!backup) {
        console.error('Backup not found');
        return;
      }
      
      // Fetch the backup file from the API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/backups/${backupId}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to download backup');
      }
      
      // Get the file content
      const blob = await response.blob();
      const filename = `${backup.file_name}.txt`;
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL
      window.URL.revokeObjectURL(url);
      
      console.log(`Downloaded: ${filename}`);
    } catch (error) {
      console.error('Failed to download backup:', error);
      alert('Error: Failed to download backup');
    }
  };

  const handleDeleteBackup = async (backupId: number) => {
    if (!window.confirm('Are you sure you want to delete this backup?')) return;

    try {
      await call(`/backups/${backupId}`, { method: 'DELETE' });
      loadBackups();
    } catch (error) {
      console.error('Failed to delete backup:', error);
    }
  };

  const handleCompareBackups = async () => {
    if (filteredBackups.length < 2) {
      alert('You need at least 2 backups to compare');
      return;
    }
    
    // Get the last two backups
    const sortedBackups = [...filteredBackups].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    const backup1 = sortedBackups[1]; // older
    const backup2 = sortedBackups[0]; // newer
    
    try {
      const response = await call(`/backups/compare/${backup1.id}/${backup2.id}`);
      if (response.success) {
        // Store comparison result in sessionStorage
        sessionStorage.setItem('backupComparison', JSON.stringify(response.data));
        // Navigate to comparison page
        window.location.href = '/backups/compare';
      }
    } catch (error) {
      console.error('Failed to compare backups:', error);
      alert('Error: Failed to compare backups');
    }
  };

  const handleRestoreBackup = async (backupId: number) => {
    if (!window.confirm('Restore this backup to the device? This will overwrite current config.')) return;

    try {
      const response = await call(`/backups/${backupId}/restore`, { method: 'POST' });
      if (response.success) {
        alert(`Success: ${response.message}`);
        loadBackups();
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      alert(`Error: Failed to restore backup`);
    }
  };

  const deviceNames = Array.from(new Set(backups.map(b => b.device_name)));
  const backupTypes = Array.from(new Set(backups.map(b => b.backup_type)));
  const totalSize = backups.reduce((sum, b) => sum + (typeof b.file_size === 'string' ? parseInt(b.file_size, 10) : b.file_size), 0);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white">Config Backups</h1>
            <p className="text-slate-400 mt-1">Manage device configuration backups</p>
          </div>
          <Link
            href="/backups/create"
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition font-medium"
          >
            <i className="fas fa-plus" />
            Create Backup
          </Link>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Backups</p>
                <p className="text-3xl font-bold text-white mt-1">{backups.length}</p>
              </div>
              <i className="fas fa-database text-3xl text-blue-400" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Size</p>
                <p className="text-3xl font-bold text-green-400 mt-1">
                  {(totalSize / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <i className="fas fa-hdd text-3xl text-green-400" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Devices</p>
                <p className="text-3xl font-bold text-orange-400 mt-1">{deviceNames.length}</p>
              </div>
              <i className="fas fa-server text-3xl text-orange-400" />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Backup Types</p>
                <p className="text-3xl font-bold text-yellow-400 mt-1">{backupTypes.length}</p>
              </div>
              <i className="fas fa-tags text-3xl text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by device or filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
          />

          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition"
          >
            <option value="all">All Devices</option>
            {deviceNames.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition"
          >
            <option value="all">All Types</option>
            <option value="running-config">Running Config</option>
            <option value="startup-config">Startup Config</option>
            <option value="full-backup">Full Backup</option>
            <option value="system-logs">System Logs</option>
          </select>
        </div>

        {/* Backups Table */}
        <div className="card p-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBackups(filteredBackups.map(b => b.id));
                      } else {
                        setSelectedBackups([]);
                      }
                    }}
                  />
                </th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">Device</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">File Name</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">Type</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">Size</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">Created</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">Status</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBackups.map(backup => (
                <tr key={backup.id} className="table-row">
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedBackups.includes(backup.id)}
                      onChange={() => handleSelectBackup(backup.id)}
                    />
                  </td>
                  <td className="py-3 px-4 text-white font-medium">{backup.device_name}</td>
                  <td className="py-3 px-4 text-slate-300">{backup.file_name}</td>
                  <td className="py-3 px-4">
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                      {backup.backup_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {((typeof backup.file_size === 'string' ? parseInt(backup.file_size, 10) : backup.file_size) / 1024).toFixed(2)} KB
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs">
                    {timeAgo(backup.created_at)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        backup.status === 'success'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {backup.status.charAt(0).toUpperCase() + backup.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex gap-2">
                    <button
                      onClick={() => handleDownloadBackup(backup.id)}
                      className="text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-2 py-1 rounded transition"
                      title="Download"
                    >
                      <i className="fas fa-download" />
                    </button>
                    <button
                      onClick={() => handleRestoreBackup(backup.id)}
                      className="text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 px-2 py-1 rounded transition"
                      title="Restore"
                    >
                      <i className="fas fa-undo" />
                    </button>
                    <button
                      onClick={() => handleDeleteBackup(backup.id)}
                      className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 px-2 py-1 rounded transition"
                      title="Delete"
                    >
                      <i className="fas fa-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredBackups.length === 0 && !loading && (
            <div className="text-center py-8 text-slate-400">
              <i className="fas fa-inbox text-3xl mb-2" />
              <p>No backups found</p>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedBackups.length > 0 && (
          <div className="flex gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <p className="text-slate-400 flex-1">
              {selectedBackups.length} backup(s) selected
            </p>
            <button
              onClick={() => {
                if (window.confirm(`Delete ${selectedBackups.length} backups?`)) {
                  // Bulk delete logic
                  setSelectedBackups([]);
                }
              }}
              className="flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded transition"
            >
              <i className="fas fa-trash" />
              Delete Selected
            </button>
          </div>
        )}

        {/* Diff Action */}
        {filteredBackups.length >= 2 && (
          <div className="flex gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <button
              onClick={handleCompareBackups}
              className="flex items-center gap-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-4 py-2 rounded transition font-medium"
            >
              <i className="fas fa-code-branch" />
              Compare Last 2 Backups
            </button>
            <p className="text-slate-400 flex-1 text-sm pt-2">
              View differences between the last two backups
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
