'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useApi } from '@/hooks/useApi';

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
  summary?: {
    avgCpu: number;
    avgMemory: number;
    networkTraffic: string;
    uptime: string;
  };
}

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState('24h');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  const { call } = useApi();

  useEffect(() => {
    loadChartData();
  }, [timeRange]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const response = await call(`/reports/performance?range=${timeRange}`);
      if (response.success) {
        setChartData(response.data as ChartData);
      }
    } catch (error) {
      console.error('Failed to load chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white">Reports</h1>
            <p className="text-slate-400 mt-1">Network performance analysis and metrics</p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white focus:outline-none focus:border-orange-500 transition"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* CPU Performance */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <i className="fas fa-microchip text-orange-400" />
              CPU Usage
            </h2>
            <div className="h-64 flex items-center justify-center bg-slate-900/50 rounded-lg">
              <div className="text-center text-slate-400">
                <i className="fas fa-chart-line text-3xl mb-2" />
                <p>Chart.js integration ready</p>
              </div>
            </div>
          </div>

          {/* Memory Performance */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <i className="fas fa-memory text-blue-400" />
              Memory Usage
            </h2>
            <div className="h-64 flex items-center justify-center bg-slate-900/50 rounded-lg">
              <div className="text-center text-slate-400">
                <i className="fas fa-chart-line text-3xl mb-2" />
                <p>Chart.js integration ready</p>
              </div>
            </div>
          </div>

          {/* Network In/Out */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <i className="fas fa-network-wired text-green-400" />
              Network Traffic
            </h2>
            <div className="h-64 flex items-center justify-center bg-slate-900/50 rounded-lg">
              <div className="text-center text-slate-400">
                <i className="fas fa-chart-bar text-3xl mb-2" />
                <p>Chart.js integration ready</p>
              </div>
            </div>
          </div>

          {/* Device Uptime */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <i className="fas fa-server text-yellow-400" />
              Device Uptime
            </h2>
            <div className="h-64 flex items-center justify-center bg-slate-900/50 rounded-lg">
              <div className="text-center text-slate-400">
                <i className="fas fa-chart-pie text-3xl mb-2" />
                <p>Chart.js integration ready</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="card p-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <i className="fas fa-chart-bar text-orange-400" />
            Summary Statistics
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-slate-400 text-sm">Avg CPU Usage</p>
              <p className="text-3xl font-bold text-orange-400 mt-2">{chartData?.summary?.avgCpu || 0}%</p>
              <p className="text-xs text-slate-500 mt-1">Real-time aggregate</p>
            </div>

            <div>
              <p className="text-slate-400 text-sm">Avg Memory Usage</p>
              <p className="text-3xl font-bold text-blue-400 mt-2">{chartData?.summary?.avgMemory || 0}%</p>
              <p className="text-xs text-slate-500 mt-1">Real-time aggregate</p>
            </div>

            <div>
              <p className="text-slate-400 text-sm">Network In/Out</p>
              <p className="text-3xl font-bold text-green-400 mt-2">{chartData?.summary?.networkTraffic || '0 GB/s'}</p>
              <p className="text-xs text-slate-500 mt-1">Current throughput</p>
            </div>

            <div>
              <p className="text-slate-400 text-sm">System Uptime</p>
              <p className="text-3xl font-bold text-yellow-400 mt-2">{chartData?.summary?.uptime || '0%'}</p>
              <p className="text-xs text-slate-500 mt-1">Average availability</p>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="flex gap-4">
          <button className="flex items-center gap-2 btn-primary px-4 py-2 rounded-lg font-medium">
            <i className="fas fa-download" />
            Export PDF
          </button>
          <button className="flex items-center gap-2 btn-secondary px-4 py-2 rounded-lg font-medium">
            <i className="fas fa-file-csv" />
            Export CSV
          </button>
          <button className="flex items-center gap-2 btn-secondary px-4 py-2 rounded-lg font-medium">
            <i className="fas fa-envelope" />
            Email Report
          </button>
        </div>
      </div>
    </Layout>
  );
}
