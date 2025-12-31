'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-white mb-4">404</h1>
          <p className="text-2xl font-semibold text-slate-300 mb-2">Page Not Found</p>
          <p className="text-slate-400 mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="w-full bg-gradient-to-br from-orange-500 to-orange-600 hover:opacity-90 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <i className="fas fa-home" />
            Go to Dashboard
          </Link>

          <Link
            href="/devices"
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <i className="fas fa-server" />
            View Devices
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-700">
          <p className="text-sm text-slate-500 mb-4">Quick Navigation</p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/backups"
              className="text-sm text-orange-400 hover:text-orange-300 transition"
            >
              <i className="fas fa-database mr-1" />
              Backups
            </Link>
            <Link
              href="/alarms"
              className="text-sm text-orange-400 hover:text-orange-300 transition"
            >
              <i className="fas fa-bell mr-1" />
              Alarms
            </Link>
            <Link
              href="/reports"
              className="text-sm text-orange-400 hover:text-orange-300 transition"
            >
              <i className="fas fa-chart-bar mr-1" />
              Reports
            </Link>
            <Link
              href="/settings"
              className="text-sm text-orange-400 hover:text-orange-300 transition"
            >
              <i className="fas fa-cog mr-1" />
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
