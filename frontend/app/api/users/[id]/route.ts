import { NextRequest, NextResponse } from 'next/server';

// Mock user database (same as parent route)
const mockUsers: any = [
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

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
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
    const userIndex = mockUsers.findIndex((u: any) => u.id === userId);

    if (userIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updatedUser = {
      ...mockUsers[userIndex],
      ...body,
      id: userId, // Prevent ID change
      created_at: mockUsers[userIndex].created_at,
    };

    mockUsers[userIndex] = updatedUser;

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = parseInt(params.id);
    const userIndex = mockUsers.findIndex((u: any) => u.id === userId);

    if (userIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deleting admin
    if (mockUsers[userIndex].role === 'admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete admin user' },
        { status: 400 }
      );
    }

    const deletedUser = mockUsers.splice(userIndex, 1);

    return NextResponse.json({
      success: true,
      data: deletedUser[0],
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
