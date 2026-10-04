'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Database, KeyRound, UserCheck, AlertCircle } from 'lucide-react';
import { mockBackend } from '@/lib/mockBackend';

export function SetupBanner() {
  const { currentUser, isSupabase, switchMockUser } = useAuth();
  const mockUsers = !isSupabase ? mockBackend.getUsers() : [];

  return (
    <div className="bg-[#1f2c34] text-xs text-gray-300 border-b border-[#2a3942] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 z-20">
      <div className="flex items-center gap-2">
        {isSupabase ? (
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <Database className="w-3.5 h-3.5" />
            Supabase Live Backend Connected (PostgreSQL + RLS + Realtime)
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-amber-400 font-medium">
            <AlertCircle className="w-3.5 h-3.5" />
            Interactive Demo Mode Active (Web Crypto ECDH + AES-256-GCM Live)
          </span>
        )}
        <span className="hidden md:inline-flex items-center gap-1 text-gray-400">
          • <ShieldCheck className="w-3 h-3 text-emerald-400" /> End-to-End Encrypted
        </span>
      </div>

      {!isSupabase && mockUsers.length > 0 && currentUser && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400 flex items-center gap-1">
            <KeyRound className="w-3 h-3 text-cyan-400" /> Switch user:
          </span>
          <div className="flex items-center gap-1">
            {mockUsers.map(user => (
              <button
                key={user.id}
                onClick={() => switchMockUser(user)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors flex items-center gap-1 ${
                  currentUser.id === user.id
                    ? 'bg-[#00a884] text-white font-medium'
                    : 'bg-[#2a3942] hover:bg-[#374248] text-gray-300'
                }`}
                title={`Switch active tab session to ${user.display_name}`}
              >
                <UserCheck className="w-2.5 h-2.5" />
                {user.username}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
