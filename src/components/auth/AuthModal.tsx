'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Shield, Lock, User, Mail, Sparkles, ArrowRight, CheckCircle2, Phone } from 'lucide-react';
import { mockBackend } from '@/lib/mockBackend';

export function AuthModal() {
  const { login, signUp, isSupabase, switchMockUser } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        if (!username.trim() || !displayName.trim()) {
          throw new Error('Please fill in all fields');
        }
        await signUp(email, password, username, displayName, phoneNumber);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = (userId: string) => {
    const user = mockBackend.getUserById(userId);
    if (user) {
      switchMockUser(user);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c1317]/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl overflow-hidden text-gray-200">
        {/* WhatsApp Brand Header */}
        <div className="bg-[#202c33] p-6 text-center border-b border-[#2a3942]">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#00a884]/10 text-[#00a884] mb-3">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-100">WhatsApp Live Chat</h2>
          <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-[#00a884]" />
            End-to-End Encrypted Messaging (ECDH + AES-256-GCM)
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#222d34] bg-[#111b21]">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(''); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mode === 'signin'
                ? 'text-[#00a884] border-b-2 border-[#00a884] bg-[#182229]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              mode === 'signup'
                ? 'text-[#00a884] border-b-2 border-[#00a884] bg-[#182229]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-lg text-xs text-red-200">
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Display Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alice Smith"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#00a884]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Username</label>
                <div className="relative">
                  <span className="text-gray-400 absolute left-3 top-2.5 text-sm">@</span>
                  <input
                    type="text"
                    required
                    placeholder="alice"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#00a884]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Mobile Number <span className="text-[#00a884] font-normal">(for users to find & chat with you)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +1 555 019 2834 or +91 9876543210"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#00a884]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              {isSupabase ? 'Email Address' : 'Email or Username'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type={isSupabase ? 'email' : 'text'}
                required
                placeholder={isSupabase ? 'name@example.com' : 'alice or alice@whatsapp.demo'}
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#00a884]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#00a884]"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="p-3 bg-[#182229] rounded-lg border border-[#222d34] flex items-start gap-2 text-[11px] text-gray-300">
              <CheckCircle2 className="w-4 h-4 text-[#00a884] shrink-0 mt-0.5" />
              <span>
                Your device will automatically generate an ECDH cryptographic key pair. Your private key stays on your browser and will never touch the server.
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer"
          >
            {isSubmitting ? (
              'Processing...'
            ) : (
              <>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Logins */}
        {!isSupabase && (
          <div className="p-4 bg-[#182229] border-t border-[#222d34]">
            <p className="text-xs text-gray-400 mb-2 flex items-center gap-1 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              One-Click Demo Accounts (Instant Test):
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('usr_alice_101')}
                className="px-2 py-2 bg-[#202c33] hover:bg-[#2a3942] rounded-lg text-xs font-medium text-gray-200 border border-[#2a3942] transition-colors text-center cursor-pointer flex flex-col items-center"
              >
                <span>👩 Alice</span>
                <span className="text-[10px] text-gray-400 font-mono mt-0.5">+1 555 010 0001</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('usr_bob_102')}
                className="px-2 py-2 bg-[#202c33] hover:bg-[#2a3942] rounded-lg text-xs font-medium text-gray-200 border border-[#2a3942] transition-colors text-center cursor-pointer flex flex-col items-center"
              >
                <span>👨 Bob</span>
                <span className="text-[10px] text-gray-400 font-mono mt-0.5">+1 555 010 0002</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('usr_charlie_103')}
                className="px-2 py-2 bg-[#202c33] hover:bg-[#2a3942] rounded-lg text-xs font-medium text-gray-200 border border-[#2a3942] transition-colors text-center cursor-pointer flex flex-col items-center"
              >
                <span>👨 Charlie</span>
                <span className="text-[10px] text-gray-400 font-mono mt-0.5">+1 555 010 0003</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
