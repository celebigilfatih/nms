import { NextRequest, NextResponse } from 'next/server';

const mockAlarms = [
  {
    id: 1,
    device_id: 1,
    device_name: 'Router-01',
    message: 'CPU usage exceeded threshold',
    severity: 'critical',
    status: 'active',
    created_at: new Date(Date.now() - 10 * 60000).toISOString(),
  },
  {
    id: 2,
    device_id: 2,
    device_name: 'Switch-02',
    message: 'Memory usage at 85%',
    severity: 'warning',
    status: 'active',
    created_at: new Date(Date.now() - 20 * 60000).toISOString(),
  },
  {
    id: 3,
    device_id: 3,
    device_name: 'Firewall-03',
    message: 'Device is offline',
    severity: 'critical',
    status: 'acknowledged',
    created_at: new Date(Date.now() - 60 * 60000).toISOString(),
    acknowledged_at: new Date(Date.now() - 55 * 60000).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  try {
    // In production, fetch from database
    return NextResponse.json({
      success: true,
      data: mockAlarms,
    });
  } catch (error) {
    console.error('Get alarms error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alarms' },
      { status: 500 }
    );
  }
}
