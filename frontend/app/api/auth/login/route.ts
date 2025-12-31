import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // For demo: validate against demo credentials
    // In production, hash passwords and verify against database
    const DEMO_EMAIL = 'admin@nms.local';
    const DEMO_PASSWORD = 'admin123';

    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      return NextResponse.json({
        success: true,
        data: {
          token: 'demo-jwt-token-' + Date.now(),
          user: {
            id: 1,
            email: DEMO_EMAIL,
            name: 'Admin User',
            role: 'admin',
            permissions: ['read', 'write', 'delete'],
          },
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid email or password' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
