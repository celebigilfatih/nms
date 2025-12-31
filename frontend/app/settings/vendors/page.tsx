'use client';

// This is a redirect page to /vendors
// Using useRouter to navigate to the main vendors page

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsVendorsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main vendors page
    router.push('/vendors');
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <i className="fas fa-spinner fa-spin text-4xl text-orange-400 mb-4"></i>
        <p className="text-slate-400">Redirecting to Vendor Management...</p>
      </div>
    </div>
  );
}
