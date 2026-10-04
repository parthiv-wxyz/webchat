'use client';

import React, { useEffect, useState } from 'react';
import { UserProfile } from '@/types';
import { generateSafetyNumber, getPublicKeyFingerprint } from '@/lib/crypto';
import { ShieldCheck, X, QrCode, CheckCircle2, Copy, Check } from 'lucide-react';

interface SecurityModalProps {
  currentUser: UserProfile;
  peerUser: UserProfile;
  onClose: () => void;
}

export function SecurityModal({ currentUser, peerUser, onClose }: SecurityModalProps) {
  const [safetyNumber, setSafetyNumber] = useState<string>('Generating security code...');
  const [peerFingerprint, setPeerFingerprint] = useState<string>('');
  const [myFingerprint, setMyFingerprint] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    async function loadSecurityInfo() {
      if (currentUser?.public_key && peerUser?.public_key) {
        const code = await generateSafetyNumber(currentUser.public_key, peerUser.public_key);
        setSafetyNumber(code);

        const peerFp = await getPublicKeyFingerprint(peerUser.public_key);
        const myFp = await getPublicKeyFingerprint(currentUser.public_key);
        setPeerFingerprint(peerFp);
        setMyFingerprint(myFp);
      }
    }
    loadSecurityInfo();
  }, [currentUser, peerUser]);

  const copyCode = () => {
    navigator.clipboard.writeText(safetyNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Split the 12 chunks of 5 digits into 2 columns of 6 for authentic WhatsApp layout
  const chunks = safetyNumber.split(' ');
  const col1 = chunks.slice(0, 6);
  const col2 = chunks.slice(6, 12);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111b21] dark:bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-2xl overflow-hidden text-gray-200">
        {/* Header */}
        <div className="bg-[#202c33] px-5 py-4 flex items-center justify-between border-b border-[#2a3942]">
          <div className="flex items-center gap-2 text-gray-100 font-semibold">
            <ShieldCheck className="w-5 h-5 text-[#00a884]" />
            Verify Security Code
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-[#2a3942] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-center">
          <p className="text-xs text-gray-400 leading-relaxed">
            To verify that messages and calls are encrypted end-to-end with{' '}
            <strong className="text-gray-200">{peerUser.display_name}</strong>, scan this code on their device or compare these numbers.
          </p>

          {/* QR Code Graphic Simulation */}
          <div className="inline-block p-4 bg-white rounded-xl shadow-lg border border-gray-300">
            <div className="w-44 h-44 relative bg-gray-900 rounded-lg flex flex-col items-center justify-center text-white p-2">
              <QrCode className="w-32 h-32 text-white" />
              <div className="text-[10px] text-gray-300 tracking-wider font-mono">ECDH P-256 E2EE</div>
            </div>
          </div>

          {/* 60-digit safety numbers (12 blocks of 5) */}
          <div className="bg-[#182229] p-4 rounded-xl border border-[#2a3942]">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm tracking-wider text-[#00a884] font-medium">
              <div className="space-y-1">
                {col1.map((c, i) => (
                  <div key={i}>{c}</div>
                ))}
              </div>
              <div className="space-y-1">
                {col2.map((c, i) => (
                  <div key={i}>{c}</div>
                ))}
              </div>
            </div>

            <button
              onClick={copyCode}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#00a884]" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to clipboard' : 'Copy 60-digit security code'}
            </button>
          </div>

          {/* Fingerprints */}
          <div className="text-left bg-[#182229] p-3 rounded-lg border border-[#2a3942] space-y-1.5 text-[11px]">
            <div className="flex justify-between items-center text-gray-400">
              <span>Your Public Key Fingerprint:</span>
              <span className="font-mono text-gray-200">{myFingerprint || '...'}</span>
            </div>
            <div className="flex justify-between items-center text-gray-400">
              <span>{peerUser.display_name}&apos;s Fingerprint:</span>
              <span className="font-mono text-gray-200">{peerFingerprint || '...'}</span>
            </div>
          </div>

          {/* Verification check */}
          <button
            onClick={() => setIsVerified(!isVerified)}
            className={`w-full py-2.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              isVerified
                ? 'bg-emerald-800 text-white'
                : 'bg-[#202c33] hover:bg-[#2a3942] text-gray-300 border border-[#2a3942]'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${isVerified ? 'text-white' : 'text-gray-400'}`} />
            {isVerified ? 'Marked as Verified' : 'Mark as Verified'}
          </button>
        </div>
      </div>
    </div>
  );
}
