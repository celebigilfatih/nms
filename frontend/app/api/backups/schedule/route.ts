import { NextRequest, NextResponse } from 'next/server';

// Mock scheduled backups database
const mockScheduledBackups = [
  {
    id: 'sched-1',
    device_id: 1,
    device_name: 'Router-01',
    backup_type: 'running-config',
    frequency: 'daily',
    time: '02:00',
    enabled: true,
    last_run: new Date(Date.now() - 22 * 60 * 60000).toISOString(),
    password_protected: false,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60000).toISOString(),
  },
  {
    id: 'sched-2',
    device_id: 2,
    device_name: 'Switch-02',
    backup_type: 'full-backup',
    frequency: 'weekly',
    time: '03:00',
    enabled: true,
    last_run: new Date(Date.now() - 2 * 24 * 60 * 60000).toISOString(),
    password_protected: true,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60000).toISOString(),
  },
  {
    id: 'sched-3',
    device_id: 4,
    device_name: 'ISL_PREFABRIK_SW',
    backup_type: 'running-config',
    frequency: 'daily',
    time: '01:00',
    enabled: true,
    last_run: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
    password_protected: false,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60000).toISOString(),
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const device_id = searchParams.get('device_id');

    let schedules = mockScheduledBackups;

    if (device_id) {
      schedules = schedules.filter(s => s.device_id === parseInt(device_id));
    }

    return NextResponse.json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.device_id || !body.frequency || !body.time) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const newSchedule = {
      id: `sched-${Date.now()}`,
      device_id: body.device_id,
      device_name: body.device_name,
      backup_type: body.backup_type || 'running-config',
      frequency: body.frequency,
      time: body.time,
      enabled: body.enabled !== false,
      password_protected: !!body.password,
      last_run: null,
      created_at: new Date().toISOString(),
    };

    mockScheduledBackups.push(newSchedule as any);

    return NextResponse.json(
      { success: true, data: newSchedule },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create schedule error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create schedule' },
      { status: 500 }
    );
  }
}
