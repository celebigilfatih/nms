import { NextRequest, NextResponse } from 'next/server';

// Mock backup database
const mockBackups = [
  {
    id: 1,
    device_id: 1,
    device_name: 'Router-01',
    backup_type: 'running-config',
    file_name: 'Router-01-running-20251226.cfg',
    file_size: 45230,
    status: 'success',
    created_at: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    checksum: 'a1b2c3d4e5f6',
  },
  {
    id: 2,
    device_id: 1,
    device_name: 'Router-01',
    backup_type: 'startup-config',
    file_name: 'Router-01-startup-20251225.cfg',
    file_size: 44890,
    status: 'success',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60000).toISOString(),
    checksum: 'b2c3d4e5f6a1',
  },
  {
    id: 3,
    device_id: 2,
    device_name: 'Switch-02',
    backup_type: 'full-backup',
    file_name: 'Switch-02-full-20251226.zip',
    file_size: 125680,
    status: 'success',
    created_at: new Date(Date.now() - 12 * 60 * 60000).toISOString(),
    checksum: 'c3d4e5f6a1b2',
  },
  {
    id: 4,
    device_id: 4,
    device_name: 'ISL_PREFABRIK_SW',
    backup_type: 'running-config',
    file_name: 'ISL_PREFABRIK_SW-running-20251226.cfg',
    file_size: 52340,
    status: 'success',
    created_at: new Date(Date.now() - 1 * 60 * 60000).toISOString(),
    checksum: 'd4e5f6a1b2c3',
  },
];

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: mockBackups,
    });
  } catch (error) {
    console.error('Get backups error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch backups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    if (!body.device_id || !body.backup_name) {
      return NextResponse.json(
        { success: false, error: 'Device ID and backup name are required' },
        { status: 400 }
      );
    }

    // Create new backup
    const newBackup = {
      id: mockBackups.length + 1,
      device_id: body.device_id,
      device_name: body.device_name || `Device-${body.device_id}`,
      backup_type: body.backup_type || 'running-config',
      file_name: `${body.backup_name}-${Date.now()}.cfg`,
      file_size: Math.floor(Math.random() * 100000) + 20000,
      status: 'success',
      created_at: new Date().toISOString(),
      checksum: Math.random().toString(36).substring(2, 14),
      notes: body.description || '',
    };

    mockBackups.push(newBackup as any);

    return NextResponse.json(
      { success: true, data: newBackup },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create backup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}
