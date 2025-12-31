/**
 * Next.js UI Component Examples
 * Sample alarm data structures and React components for displaying NMS data
 */

// Sample alarm data structure for API responses
const SAMPLE_ALARMS = [
  {
    id: 1,
    device_id: 1,
    device_name: "Router-Core-01",
    type: "port_down",
    severity: "critical",
    message: "Port Gi0/0/1 (Uplink to ISP) is down",
    acknowledged: false,
    created_at: "2024-01-15T10:30:00Z",
    metadata: {
      interface_index: 1,
      interface_name: "Gi0/0/1",
      description: "Uplink to ISP",
      admin_status: "up",
      oper_status: "down"
    }
  },
  {
    id: 2,
    device_id: 2,
    device_name: "Firewall-FG01",
    type: "cpu_high",
    severity: "warning",
    message: "CPU usage 85.2% exceeded threshold 80%",
    acknowledged: false,
    created_at: "2024-01-15T10:25:00Z",
    metadata: {
      cpu_usage: 85.2,
      threshold: 80.0
    }
  },
  {
    id: 3,
    device_id: 3,
    device_name: "Switch-Access-02",
    type: "memory_high",
    severity: "warning",
    message: "Memory usage 82.5% exceeded threshold 80%",
    acknowledged: true,
    acknowledged_by: "john.doe",
    acknowledged_at: "2024-01-15T10:20:00Z",
    created_at: "2024-01-15T10:15:00Z",
    metadata: {
      memory_usage: 82.5,
      threshold: 80.0
    }
  }
];

// Sample device metrics
const SAMPLE_DEVICE_METRICS = {
  device_id: 1,
  device_name: "Router-Core-01",
  health: {
    uptime_seconds: 125489,
    cpu_usage: 45.3,
    memory_usage: 62.1,
    temperature: 55.2
  },
  interfaces: [
    {
      interface_index: 1,
      interface_name: "Gi0/0/1",
      description: "Uplink to ISP",
      admin_status: "up",
      oper_status: "down",
      speed: 1000000000,
      in_octets: 1024000000,
      out_octets: 512000000
    },
    {
      interface_index: 2,
      interface_name: "Gi0/0/2",
      description: "LAN Connection",
      admin_status: "up",
      oper_status: "up",
      speed: 1000000000,
      in_octets: 2048000000,
      out_octets: 1024000000
    }
  ]
};

/**
 * React Component Example: Alarm List
 */
import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock
} from 'lucide-react';

const SEVERITY_COLORS = {
  critical: 'bg-red-100 border-red-300 text-red-800',
  warning: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  info: 'bg-blue-100 border-blue-300 text-blue-800'
};

const SEVERITY_ICONS = {
  critical: <AlertCircle className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />
};

export function AlarmList() {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In real app: fetch from API
    // const response = await fetch('/api/alarms');
    setAlarms(SAMPLE_ALARMS);
    setLoading(false);
  }, []);

  const acknowledgeAlarm = async (alarmId) => {
    try {
      const response = await fetch(`/api/alarms/${alarmId}/acknowledge`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledged_by: 'current_user' })
      });
      if (response.ok) {
        // Update local state
        setAlarms(alarms.map(a =>
          a.id === alarmId ? { ...a, acknowledged: true } : a
        ));
      }
    } catch (error) {
      console.error('Failed to acknowledge alarm:', error);
    }
  };

  if (loading) return <div>Loading alarms...</div>;

  return (
    <div className="space-y-3">
      {alarms.map(alarm => (
        <div
          key={alarm.id}
          className={`border rounded-lg p-4 ${SEVERITY_COLORS[alarm.severity]}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {SEVERITY_ICONS[alarm.severity]}
              <div className="flex-1">
                <h3 className="font-semibold">{alarm.device_name}</h3>
                <p className="text-sm mt-1">{alarm.message}</p>
                <div className="flex gap-4 text-xs mt-2">
                  <span>Type: {alarm.type.replace(/_/g, ' ')}</span>
                  <span>Created: {new Date(alarm.created_at).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {!alarm.acknowledged && (
                <button
                  onClick={() => acknowledgeAlarm(alarm.id)}
                  className="px-3 py-1 bg-white bg-opacity-50 rounded hover:bg-opacity-75 text-xs font-medium"
                >
                  Acknowledge
                </button>
              )}
              {alarm.acknowledged && (
                <span className="flex items-center gap-1 text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  Ack'd by {alarm.acknowledged_by}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * React Component Example: Device Health Dashboard
 */
export function DeviceHealthCard({ device }) {
  const { health, interfaces } = device;
  
  const healthMetrics = [
    {
      label: 'CPU',
      value: health.cpu_usage,
      unit: '%',
      threshold: 80,
      color: health.cpu_usage >= 80 ? 'text-red-600' : 'text-green-600'
    },
    {
      label: 'Memory',
      value: health.memory_usage,
      unit: '%',
      threshold: 80,
      color: health.memory_usage >= 80 ? 'text-red-600' : 'text-green-600'
    },
    {
      label: 'Temperature',
      value: health.temperature,
      unit: '°C',
      threshold: 80,
      color: health.temperature >= 80 ? 'text-red-600' : 'text-green-600'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-bold mb-4">{device.device_name}</h2>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        {healthMetrics.map(metric => (
          <div key={metric.label} className="border rounded-lg p-4">
            <span className="text-sm text-gray-600">{metric.label}</span>
            <div className={`text-2xl font-bold ${metric.color}`}>
              {metric.value.toFixed(1)}{metric.unit}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Threshold: {metric.threshold}{metric.unit}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-2">Interface Status</h3>
        <div className="space-y-2">
          {interfaces.map(iface => (
            <div
              key={iface.interface_index}
              className={`flex justify-between items-center text-sm p-2 rounded ${
                iface.oper_status === 'up'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              <span>
                {iface.interface_name} ({iface.description})
              </span>
              <span className="font-medium">
                {iface.oper_status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
