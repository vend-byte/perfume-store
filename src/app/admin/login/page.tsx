'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { Shield, ArrowRight, Lock, ExternalLink } from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Detect if we are inside an embedded preview frame
    try {
      setIsEmbedded(window.self !== window.top);
    } catch {
      setIsEmbedded(true);
    }
    // If we got bounced back from the dashboard, explain why
    const params = new URLSearchParams(window.location.search);
    if (params.get('session') === 'missing') {
      toast('Your session could not be verified. Please sign in again.', {
        icon: '🔁',
        duration: 3500,
      });
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Authentication successful. Welcome back.', {
          icon: '🔐',
          duration: 1200,
        });
        // Full page navigation guarantees the new session cookie
        // is sent with the request to the protected dashboard.
        setTimeout(() => {
          window.location.assign('/admin/dashboard');
        }, 500);
      } else {
        toast.error(data.error || 'Authentication failed.', {
          style: {
            background: '#450a0a',
            color: '#fda4af',
            border: '1px solid #fda4af',
          },
        });
        setIsLoading(false);
      }
    } catch {
      toast.error('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6">
      <Toaster position="top-center" />

      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-3xl flex items-center justify-center mb-6">
            <Shield className="w-12 h-12 text-black" />
          </div>
          <h1 className="text-4xl serif-heading tracking-tight text-white">Admin Access</h1>
          <p className="text-white/50 mt-3">The Scent Atelier • Secure Portal</p>
        </div>

        {isEmbedded && (
          <a
            href="/admin/login"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 flex items-center justify-center gap-2 bg-amber-400/10 border border-amber-400/40 text-amber-300 text-xs px-6 py-4 rounded-2xl hover:bg-amber-400/20 transition"
          >
            <ExternalLink size={14} />
            Viewing inside a preview frame? If login doesn&apos;t proceed, click here to open the admin portal in a full browser tab.
          </a>
        )}

        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-10 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-8">
            <div>
              <label className="block text-xs uppercase tracking-widest text-amber-400 mb-2">USERNAME</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full bg-black border border-white/20 rounded-2xl px-6 py-5 text-lg focus:outline-none focus:border-amber-400 placeholder:text-white/30 text-white"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-amber-400 mb-2">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-black border border-white/20 rounded-2xl px-6 py-5 text-lg focus:outline-none focus:border-amber-400 placeholder:text-white/30 text-white"
                placeholder="••••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-medium py-5 rounded-3xl flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-70 text-sm tracking-[1px]"
            >
              {isLoading ? 'VERIFYING...' : 'SECURE LOGIN'}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-10 text-center text-xs text-white/30 border-t border-white/10 pt-6 flex items-center justify-center gap-2">
            <Lock size={12} />
            <span>
              Credentials verified server-side • Sessions expire after 8 hours<br />
              Accounts lock after 5 failed attempts
            </span>
          </div>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => router.push('/')}
            className="text-white/40 hover:text-white text-sm flex items-center gap-2 mx-auto transition-colors"
          >
            ← Back to The Scent Atelier Store
          </button>
        </div>
      </div>
    </div>
  );
}
