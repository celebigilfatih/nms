import { NextRequest, NextResponse } from 'next/server';

let settings = {
  polling_interval: 60,
  notification_email: 'admin@nms.local',
  alarm_threshold_cpu: 80,
  alarm_threshold_memory: 85,
  alarm_threshold_disk: 90,
  retention_days: 30,
};

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate thresholds
    if (
      body.alarm_threshold_cpu < 0 ||
      body.alarm_threshold_cpu > 100
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid CPU threshold' },
        { status: 400 }
      );
    }

    settings = { ...settings, ...body };

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
