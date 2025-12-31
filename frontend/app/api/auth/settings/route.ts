import { NextRequest, NextResponse } from 'next/server';

// Mock auth settings database
let mockAuthSettings = {
  password_policy: {
    min_length: 12,
    require_uppercase: true,
    require_numbers: true,
    require_special_chars: true,
    expiry_days: 90,
    history_count: 5,
  },
  session_policy: {
    session_timeout_minutes: 30,
    max_sessions_per_user: 3,
    concurrent_session_allowed: true,
  },
  mfa_policy: {
    enforce_mfa: false,
    mfa_required_for_admin: true,
    grace_period_days: 7,
  },
  login_policy: {
    max_failed_attempts: 5,
    lockout_duration_minutes: 15,
    ip_whitelist_enabled: false,
  },
  audit_settings: {
    log_all_activities: true,
    retention_days: 90,
    log_login_attempts: true,
    log_permission_changes: true,
  },
};

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: mockAuthSettings,
    });
  } catch (error) {
    console.error('Get auth settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch auth settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate password policy
    if (body.password_policy) {
      if (body.password_policy.min_length < 8 || body.password_policy.min_length > 128) {
        return NextResponse.json(
          { success: false, error: 'Password minimum length must be between 8 and 128' },
          { status: 400 }
        );
      }
    }

    // Update settings
    mockAuthSettings = {
      ...mockAuthSettings,
      ...body,
    };

    return NextResponse.json({
      success: true,
      data: mockAuthSettings,
      message: 'Authentication settings updated successfully',
    });
  } catch (error) {
    console.error('Update auth settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update auth settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'reset') {
      // Reset to defaults
      mockAuthSettings = {
        password_policy: {
          min_length: 12,
          require_uppercase: true,
          require_numbers: true,
          require_special_chars: true,
          expiry_days: 90,
          history_count: 5,
        },
        session_policy: {
          session_timeout_minutes: 30,
          max_sessions_per_user: 3,
          concurrent_session_allowed: true,
        },
        mfa_policy: {
          enforce_mfa: false,
          mfa_required_for_admin: true,
          grace_period_days: 7,
        },
        login_policy: {
          max_failed_attempts: 5,
          lockout_duration_minutes: 15,
          ip_whitelist_enabled: false,
        },
        audit_settings: {
          log_all_activities: true,
          retention_days: 90,
          log_login_attempts: true,
          log_permission_changes: true,
        },
      };

      return NextResponse.json({
        success: true,
        data: mockAuthSettings,
        message: 'Authentication settings reset to defaults',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Auth settings action error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
