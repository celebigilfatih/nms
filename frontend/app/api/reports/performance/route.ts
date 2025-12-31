import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('range') || '24h';

    // Generate mock chart data based on time range
    let labels: string[] = [];
    if (timeRange === '24h') {
      labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    } else if (timeRange === '7d') {
      labels = Array.from({ length: 7 }, (_, i) => `Day ${i + 1}`);
    } else if (timeRange === '30d') {
      labels = Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`);
    } else {
      labels = Array.from({ length: 13 }, (_, i) => `Week ${i + 1}`);
    }

    const generateData = () =>
      Array.from({ length: labels.length }, () => Math.floor(Math.random() * 100));

    const chartData = {
      labels,
      datasets: [
        {
          label: 'CPU Usage (%)',
          data: generateData(),
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
        },
        {
          label: 'Memory Usage (%)',
          data: generateData(),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
        },
      ],
    };

    return NextResponse.json({
      success: true,
      data: chartData,
    });
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
