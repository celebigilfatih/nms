import { NextRequest, NextResponse } from 'next/server';

// Mock user database
const mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@nms.local',
    full_name: 'Administrator',
    role: 'admin',
    status: 'active',
    last_login: new Date(Date.now() - 2 * 60 * 60000).toISOString(),
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60000).toISOString(),
    two_factor_enabled: true,
  },
  {
    id: 2,
    username: 'buski',
    email: 'buski@nms.local',
    full_name: 'Network Engineer',
    role: 'operator',
    status: 'active',
    last_login: new Date(Date.now() - 4 * 60 * 60000).toISOString(),
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60000).toISOString(),
    two_factor_enabled: false,
  },
  {
    id: 3,
    username: 'viewer',
    email: 'viewer@nms.local',
    full_name: 'Monitoring Viewer',
    role: 'viewer',
    status: 'active',
    last_login: new Date(Date.now() - 1 * 24 * 60 * 60000).toISOString(),
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60000).toISOString(),
    two_factor_enabled: false,
  },
  {
    id: 4,
    username: 'guest',
    email: 'guest@nms.local',
    full_name: 'Guest User',
    role: 'guest',
    status: 'inactive',
    last_login: new Date(Date.now() - 7 * 24 * 60 * 60000).toISOString(),
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60000).toISOString(),
    two_factor_enabled: false,
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const role = searchParams.get('role');

    let users = mockUsers;

    if (status) {
      users = users.filter(u => u.status === status);
    }
    if (role) {
      users = users.filter(u => u.role === role);
    }

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.username || !body.email || !body.role) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check username exists
    if (mockUsers.some(u => u.username === body.username)) {
      return NextResponse.json(
        { success: false, error: 'Username already exists' },
        { status: 400 }
      );
    }

    const newUser = {
      id: Math.max(...mockUsers.map(u => u.id)) + 1,
      username: body.username,
      email: body.email,
      full_name: body.full_name || body.username,
      role: body.role,
      status: 'active',
      last_login: null,
      created_at: new Date().toISOString(),
      two_factor_enabled: false,
    };

    mockUsers.push(newUser as any);

    return NextResponse.json(
      { success: true, data: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
