'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { href: '/', label: 'Dashboard', icon: 'fa-chart-line' },
  { href: '/devices', label: 'Devices', icon: 'fa-server' },
  { href: '/devices/add', label: 'Add Device', icon: 'fa-plus' },
  { href: '/backups', label: 'Backups', icon: 'fa-database' },
  { href: '/alarms', label: 'Alarms', icon: 'fa-bell' },
  { href: '/reports', label: 'Reports', icon: 'fa-chart-bar' },
  { href: '/settings', label: 'Settings', icon: 'fa-cog' },
];

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, logout, user } = useAuth();

  // Don't render layout for login page
  if (pathname === '/login') {
    return children;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-purple-400 mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-950 border-r border-slate-800 flex flex-col overflow-y-auto">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-3">
            <div className="text-2xl gradient-badge p-2 rounded-lg">
              <i className="fas fa-network-wired" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">NMS</h1>
              <p className="text-xs text-slate-400">Monitoring System</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <i className={`fas ${item.icon} w-5 text-center`} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="px-4 py-3 rounded-lg bg-slate-800/50">
            <p className="text-xs text-slate-500 mb-1">Logged in as</p>
            <p className="text-white font-semibold text-sm truncate">{user?.email}</p>
            <p className="text-xs text-slate-400 mt-1">
              <i className="fas fa-crown mr-1" />
              {user?.role.charAt(0).toUpperCase()}
              {user?.role.slice(1)}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 px-4 rounded-lg transition font-medium text-sm"
          >
            <i className="fas fa-sign-out-alt" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
