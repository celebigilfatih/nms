import { NextRequest, NextResponse } from 'next/server';

// Mock permissions database
const rolePermissions: Record<string, string[]> = {
  admin: [
    'view_dashboard',
    'manage_devices',
    'add_devices',
    'delete_devices',
    'edit_devices',
    'view_alarms',
    'acknowledge_alarms',
    'manage_users',
    'edit_permissions',
    'view_reports',
    'export_reports',
    'manage_backups',
    'restore_backups',
    'manage_schedules',
    'view_settings',
    'edit_settings',
    'manage_authentication',
  ],
  operator: [
    'view_dashboard',
    'manage_devices',
    'add_devices',
    'edit_devices',
    'view_alarms',
    'acknowledge_alarms',
    'view_reports',
    'export_reports',
    'manage_backups',
    'restore_backups',
    'view_settings',
  ],
  viewer: [
    'view_dashboard',
    'view_alarms',
    'view_reports',
    'view_settings',
  ],
  guest: [
    'view_dashboard',
  ],
};

const mockUsers: any = [
  {
    id: 1,
    username: 'admin',
    role: 'admin',
  },
  {
    id: 2,
    username: 'buski',
    role: 'operator',
  },
  {
    id: 3,
    username: 'viewer',
    role: 'viewer',
  },
  {
    id: 4,
    username: 'guest',
    role: 'guest',
  },
];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id);
    const user = mockUsers.find((u: any) => u.id === userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const permissions = rolePermissions[user.role] || [];

    return NextResponse.json({
      success: true,
      data: {
        user_id: userId,
        username: user.username,
        role: user.role,
        permissions,
        total_permissions: permissions.length,
      },
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id);
    const user = mockUsers.find((u: any) => u.id === userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Only admins can have all permissions
    if (body.role === 'admin') {
      body.permissions = rolePermissions.admin;
    } else {
      body.permissions = rolePermissions[body.role] || [];
    }

    user.role = body.role;

    return NextResponse.json({
      success: true,
      data: {
        user_id: userId,
        username: user.username,
        role: user.role,
        permissions: body.permissions,
        total_permissions: body.permissions.length,
      },
    });
  } catch (error) {
    console.error('Update permissions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update permissions' },
      { status: 500 }
    );
  }
}
