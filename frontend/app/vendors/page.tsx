'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useApi } from '@/hooks/useApi';

interface Vendor {
  id: number;
  name: string;
  display_name: string;
  category: string;
  description?: string;
  active: boolean;
  created_at?: string;
}

export default function VendorsPage() {
  const { call, loading } = useApi();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newVendor, setNewVendor] = useState({
    name: '',
    display_name: '',
    category: 'Networking',
    description: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [message, setMessage] = useState('');

  const categories = [
    'Networking',
    'Switching & Routing',
    'Security & Firewalls',
    'Storage & Computing',
    'Servers & Infrastructure',
    'Wireless & WiFi',
    'Cloud & Virtualization',
    'Monitoring & Infrastructure',
    'Telecommunications',
    'Other',
  ];

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    setIsLoading(true);
    try {
      // Fetch all vendors including inactive ones for management page
      const response = await call('/vendors?all=true');
      if (response.success && Array.isArray(response.data)) {
        setVendors(response.data);
      }
    } catch (error) {
      console.error('Failed to load vendors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.name.trim() || !newVendor.display_name.trim()) {
      setMessage('Vendor name and display name are required');
      return;
    }

    try {
      const response = await call('/vendors', {
        method: 'POST',
        data: {
          ...newVendor,
          active: true,
        },
      });

      if (response.success) {
        setMessage('Vendor added successfully');
        setNewVendor({
          name: '',
          display_name: '',
          category: 'Networking',
          description: '',
        });
        await loadVendors();
      } else {
        setMessage(response.error || 'Failed to add vendor');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const response = await call(`/vendors/${id}`, {
        method: 'PUT',
        data: {
          active: !currentStatus,
        },
      });

      if (response.success) {
        await loadVendors();
        setMessage('Vendor status updated');
      } else {
        setMessage(response.error || 'Failed to update vendor');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleDeleteVendor = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      try {
        const response = await call(`/vendors/${id}`, {
          method: 'DELETE',
        });

        if (response.success) {
          await loadVendors();
          setMessage('Vendor deleted successfully');
        } else {
          setMessage(response.error || 'Failed to delete vendor');
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'An error occurred');
      }
    }
  };

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.display_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'All' || vendor.category === categoryFilter;

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && vendor.active) ||
      (statusFilter === 'Inactive' && !vendor.active);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white">Vendor Management</h1>
          <p className="text-slate-400 mt-1">Manage network device vendors and their status</p>
        </div>

        {/* Message */}
        {message && (
          <div className="p-4 bg-orange-500/10 border border-orange-500/50 rounded-lg text-orange-400 text-sm">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add New Vendor Form */}
          <div className="card p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <i className="fas fa-plus-circle text-orange-400"></i>
              Add New Vendor
            </h2>
            <form onSubmit={handleAddVendor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Code Name *
                </label>
                <input
                  type="text"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  placeholder="e.g., ruijie"
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={newVendor.display_name}
                  onChange={(e) => setNewVendor({ ...newVendor, display_name: e.target.value })}
                  placeholder="e.g., Ruijie Networks"
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                <select
                  value={newVendor.category}
                  onChange={(e) => setNewVendor({ ...newVendor, category: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newVendor.description}
                  onChange={(e) => setNewVendor({ ...newVendor, description: e.target.value })}
                  placeholder="Optional description"
                  className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition h-20 resize-none"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full btn-primary py-2 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <i className="fas fa-plus"></i>
                Add Vendor
              </button>
            </form>
          </div>

          {/* Vendors List */}
          <div className="lg:col-span-2">
            {/* Filters */}
            <div className="card p-6 mb-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <i className="fas fa-filter text-orange-400"></i>
                Filters
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search vendors..."
                    className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Category
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition"
                    >
                      <option value="All">All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition"
                    >
                      <option value="All">All Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Vendors Table */}
            <div className="card overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900/50 border-b border-slate-800">
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Vendor Info</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-slate-400">Loading vendors...</td>
                    </tr>
                  ) : filteredVendors.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-slate-400">No vendors found</td>
                    </tr>
                  ) : (
                    filteredVendors.map((vendor) => (
                      <tr
                        key={vendor.id}
                        className="hover:bg-slate-900/30 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${vendor.active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-600'}`}></div>
                            <div>
                              <div className="font-bold text-white">{vendor.display_name}</div>
                              <div className="text-xs text-slate-500 font-mono">{vendor.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-300 bg-slate-800/50 px-2 py-1 rounded border border-slate-700">
                            {vendor.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleToggleStatus(vendor.id, vendor.active)}
                              className={`p-2 rounded-lg transition-colors ${
                                vendor.active
                                  ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                                  : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              }`}
                              title={vendor.active ? 'Deactivate' : 'Activate'}
                            >
                              <i className={`fas ${vendor.active ? 'fa-toggle-on' : 'fa-toggle-off'}`}></i>
                            </button>
                            <button
                              onClick={() => handleDeleteVendor(vendor.id)}
                              className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                              title="Delete"
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Statistics */}
            {!isLoading && (
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="card p-4 text-center">
                  <p className="text-slate-400 text-sm">Total Vendors</p>
                  <p className="text-2xl font-bold text-white mt-2">{vendors.length}</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-slate-400 text-sm">Active</p>
                  <p className="text-2xl font-bold text-green-400 mt-2">
                    {vendors.filter((v) => v.active).length}
                  </p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-slate-400 text-sm">Inactive</p>
                  <p className="text-2xl font-bold text-red-400 mt-2">
                    {vendors.filter((v) => !v.active).length}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
