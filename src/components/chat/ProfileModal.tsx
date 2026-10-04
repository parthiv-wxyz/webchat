'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getPublicKeyFingerprint } from '@/lib/crypto';
import { getStoredPrivateKey } from '@/lib/keyStore';
import { X, User, KeyRound, Shield, Check, Copy, Save, LogOut, Phone } from 'lucide-react';

interface ProfileModalProps {
  onClose: () => void;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { currentUser, updateProfile, logout } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.display_name || '');
  const [status, setStatus] = useState(currentUser?.status || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone_number || '');
  const [fingerprint, setFingerprint] = useState('');
  const [exportedKey, setExportedKey] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadKeyData() {
      if (currentUser?.public_key) {
        const fp = await getPublicKeyFingerprint(currentUser.public_key);
        setFingerprint(fp);
      }
    }
    loadKeyData();
  }, [currentUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile({
        display_name: displayName,
        status: status,
        phone_number: phoneNumber.trim() || undefined,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      alert(`Failed to update profile: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportKeys = async () => {
    if (!currentUser) return;
    const pk = await getStoredPrivateKey(currentUser.id);
    if (!pk) {
      alert('No private key found on this client device.');
      return;
    }
    const backupObj = {
      version: 1,
      userId: currentUser.id,
      username: currentUser.username,
      publicKey: currentUser.public_key,
      privateKey: pk,
      exportedAt: new Date().toISOString(),
    };
    setExportedKey(JSON.stringify(backupObj, null, 2));
    setShowExport(true);
  };

  const handleCopyBackup = () => {
    navigator.clipboard.writeText(exportedKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-2xl overflow-hidden text-gray-200">
        {/* Header */}
        <div className="bg-[#202c33] px-5 py-4 flex items-center justify-between border-b border-[#2a3942]">
          <div className="flex items-center gap-2 text-gray-100 font-semibold">
            <User className="w-5 h-5 text-[#00a884]" />
            Profile & Encryption Settings
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-[#2a3942] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Avatar and Identity */}
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {currentUser?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.display_name}
                  className="w-20 h-20 rounded-full border-2 border-[#00a884] object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#202c33] flex items-center justify-center text-xl font-bold text-gray-300">
                  {currentUser?.display_name?.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="mt-2 text-xs text-gray-400 font-mono">@{currentUser?.username}</div>
          </div>

          {/* Edit Profile Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-gray-100 focus:outline-none focus:border-[#00a884]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">About Status</label>
              <input
                type="text"
                value={status}
                onChange={e => setStatus(e.target.value)}
                placeholder="Hey there! I am using WhatsApp Live."
                className="w-full px-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-gray-100 focus:outline-none focus:border-[#00a884]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Mobile Number <span className="text-gray-500 font-normal">(for contacts to find you)</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +1 555 019 2834"
                  className="w-full pl-9 pr-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-gray-100 focus:outline-none focus:border-[#00a884]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Profile
                </>
              )}
            </button>
          </form>

          {/* Cryptographic Key Information */}
          <div className="bg-[#182229] p-4 rounded-xl border border-[#2a3942] space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
              <Shield className="w-4 h-4 text-[#00a884]" />
              End-to-End Encryption Keys
            </div>

            <div className="text-[11px] text-gray-400">
              Public Key Fingerprint (ECDH P-256):
              <div className="font-mono text-emerald-400 mt-0.5 tracking-wider font-medium">
                {fingerprint || 'Computing...'}
              </div>
            </div>

            {!showExport ? (
              <button
                type="button"
                onClick={handleExportKeys}
                className="w-full py-2 bg-[#202c33] hover:bg-[#2a3942] text-gray-300 rounded-lg text-xs font-medium border border-[#2a3942] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Export / Backup Encryption Keys
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  readOnly
                  rows={4}
                  value={exportedKey}
                  className="w-full p-2 bg-[#0c1317] border border-[#2a3942] rounded-lg text-[10px] font-mono text-gray-300 resize-none"
                />
                <button
                  type="button"
                  onClick={handleCopyBackup}
                  className="w-full py-1.5 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey ? 'Backup Copied!' : 'Copy Key Backup String'}
                </button>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full py-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-900/60 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
