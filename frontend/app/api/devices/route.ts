import { NextRequest, NextResponse } from 'next/server';

// Mock database - Including real device from ISL_PREFABRIK_SW
const mockDevices = [
  {
    id: 1,
    name: 'Router-01',
    ip: '192.168.1.1',
    vendor: 'Cisco',
    type: 'Router',
    status: 'online',
    uptime: 99.8,
    last_polled: new Date(Date.now() - 5 * 60000).toISOString(),
    cpu_usage: 45,
    memory_usage: 62,
    disk_usage: 78,
  },
  {
    id: 2,
    name: 'Switch-02',
    ip: '192.168.1.2',
    vendor: 'Fortinet',
    type: 'Switch',
    status: 'online',
    uptime: 99.5,
    last_polled: new Date(Date.now() - 3 * 60000).toISOString(),
    cpu_usage: 32,
    memory_usage: 48,
    disk_usage: 55,
  },
  {
    id: 3,
    name: 'Firewall-03',
    ip: '192.168.1.3',
    vendor: 'MikroTik',
    type: 'Firewall',
    status: 'offline',
    uptime: 0,
    last_polled: new Date(Date.now() - 30 * 60000).toISOString(),
    cpu_usage: 0,
    memory_usage: 0,
    disk_usage: 0,
  },
  {
    id: 4,
    name: 'ISL_PREFABRIK_SW',
    ip: '10.5.0.76',
    vendor: 'Fn4c (Prefabrik)',
    type: 'Switch',
    status: 'timeout',
    uptime: 99.8,
    last_polled: new Date().toISOString(),
    cpu_usage: 45.3,
    memory_usage: 62.8,
    disk_usage: 78.5,
    snmp_community: 'Fn4c2023',
  },
];

export async function GET(request: NextRequest) {
  try {
    // In production, fetch from database
    return NextResponse.json({
      success: true,
      data: mockDevices,
    });
  } catch (error) {
    console.error('Get devices error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    if (!body.name || !body.ip) {
      return NextResponse.json(
        { success: false, error: 'Name and IP are required' },
        { status: 400 }
      );
    }

    // In production, save to database
    const newDevice = {
      id: mockDevices.length + 1,
      ...body,
      status: 'pending',
      uptime: 0,
      last_polled: new Date().toISOString(),
    };

    mockDevices.push(newDevice);

    return NextResponse.json(
      { success: true, data: newDevice },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create device error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create device' },
      { status: 500 }
    );
  }
}
