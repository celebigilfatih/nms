'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!email.trim()) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    // Attempt login
    const result = await login(email, password);

    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-8 right-20 w-72 h-72 bg-orange-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="text-4xl gradient-badge p-3 rounded-lg">
              <i className="fas fa-network-wired" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">NMS Dashboard</h1>
          <p className="text-slate-400">Network Monitoring System</p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleSubmit}
          className="glass rounded-2xl p-8 shadow-2xl space-y-6"
        >
          <h2 className="text-2xl font-bold text-center text-white mb-8">
            Sign In
          </h2>

          {/* Error Message */}
          {error && (
            <div className="animate-fadeIn p-4 rounded-lg bg-red-500/20 border border-red-500/50">
              <div className="flex items-center gap-3">
                <i className="fas fa-exclamation-circle text-red-400" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <i className="fas fa-envelope absolute left-4 top-4 text-slate-500 text-lg" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="admin@example.com"
                className="input-focus w-full pl-12 pr-4 py-3 rounded-lg bg-slate-900/30 border border-slate-700 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <i className="fas fa-lock absolute left-4 top-4 text-slate-500 text-lg" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                className="input-focus w-full pl-12 pr-12 py-3 rounded-lg bg-slate-900/30 border border-slate-700 text-white placeholder-slate-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 transition"
              >
                <i
                  className={`fas fa-${
                    showPassword ? 'eye-slash' : 'eye'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember"
              className="w-4 h-4 rounded cursor-pointer"
            />
            <label
              htmlFor="remember"
              className="text-sm text-slate-400 hover:text-slate-300 cursor-pointer transition"
            >
              Remember me
            </label>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-3 font-semibold rounded-lg transition"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Forgot Password */}
          <div className="text-center">
            <a
              href="#"
              className="text-sm text-purple-400 hover:text-purple-300 transition"
            >
              Forgot your password?
            </a>
          </div>
        </form>

        {/* Demo Credentials Info */}
        <div className="mt-6 animate-fadeIn p-4 rounded-lg bg-blue-500/20 border border-blue-500/50">
          <div className="flex items-start gap-3">
            <i className="fas fa-info-circle text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-300">
              <p className="font-semibold mb-2">Demo Credentials:</p>
              <p>Email: <code className="bg-slate-900/50 px-2 py-1 rounded">admin@nms.local</code></p>
              <p>Password: <code className="bg-slate-900/50 px-2 py-1 rounded">admin123</code></p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>© 2025 Network Monitoring System</p>
        </div>
      </div>
    </div>
  );
}
