import { NextRequest, NextResponse } from 'next/server';

// Mock database
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
    network_in: 1024 * 1024 * 50,
    network_out: 1024 * 1024 * 30,
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
    network_in: 1024 * 1024 * 100,
    network_out: 1024 * 1024 * 80,
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
    network_in: 1024 * 1024 * 50,
    network_out: 1024 * 1024 * 30,
    snmp_community: 'Fn4c2023',
    snmp_version: 'v2c',
  },
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deviceId = parseInt(params.id, 10);
    const device = mockDevices.find(d => d.id === deviceId);

    if (!device) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...device,
        metrics: {
          cpu_usage: device.cpu_usage,
          memory_usage: device.memory_usage,
          disk_usage: device.disk_usage,
          network_in: device.network_in,
          network_out: device.network_out,
        },
      },
    });
  } catch (error) {
    console.error('Get device error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch device' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deviceId = parseInt(params.id, 10);
    const body = await request.json();

    const deviceIndex = mockDevices.findIndex(d => d.id === deviceId);
    if (deviceIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    mockDevices[deviceIndex] = { ...mockDevices[deviceIndex], ...body };

    return NextResponse.json({
      success: true,
      data: mockDevices[deviceIndex],
    });
  } catch (error) {
    console.error('Update device error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update device' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deviceId = parseInt(params.id, 10);
    const index = mockDevices.findIndex(d => d.id === deviceId);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Device not found' },
        { status: 404 }
      );
    }

    mockDevices.splice(index, 1);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete device error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete device' },
      { status: 500 }
    );
  }
}
