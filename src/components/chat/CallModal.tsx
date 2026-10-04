'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { PhoneOff, Mic, MicOff, Video, VideoOff, ShieldCheck } from 'lucide-react';

interface CallModalProps {
  peerUser: UserProfile;
  isVideo: boolean;
  onClose: () => void;
}

export function CallModal({ peerUser, isVideo, onClose }: CallModalProps) {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected'>('ringing');
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(!isVideo);

  useEffect(() => {
    // Simulate call answered after 2.5 seconds
    const timer = setTimeout(() => {
      setCallStatus('connected');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStatus]);

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-[#111b21] border border-[#2a3942] rounded-3xl shadow-2xl overflow-hidden text-gray-200 flex flex-col items-center p-8 text-center relative">
        {/* Top security indicator */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1f2c34] text-[#00a884] text-xs font-medium mb-8 border border-[#2a3942]">
          <ShieldCheck className="w-3.5 h-3.5" />
          End-to-End Encrypted Call
        </div>

        {/* Contact Avatar / Video Placeholder */}
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-full border-4 border-[#00a884] p-1 overflow-hidden shadow-2xl flex items-center justify-center bg-[#202c33]">
            {peerUser.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={peerUser.avatar_url}
                alt={peerUser.display_name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-3xl font-bold text-gray-200">
                {peerUser.display_name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          {callStatus === 'ringing' && (
            <span className="absolute inset-0 rounded-full border-4 border-[#00a884] animate-ping opacity-30" />
          )}
        </div>

        {/* Caller Info */}
        <h3 className="text-xl font-bold text-white mb-1">{peerUser.display_name}</h3>
        <p className="text-sm text-gray-400 mb-6 font-mono">
          {callStatus === 'ringing' ? 'WhatsApp ringing...' : formatDuration(seconds)}
        </p>

        {/* Call Controls */}
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isMuted ? 'bg-red-500 text-white' : 'bg-[#2a3942] hover:bg-[#374248] text-gray-200'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isVideoOff ? 'bg-red-500 text-white' : 'bg-[#2a3942] hover:bg-[#374248] text-gray-200'
            }`}
            title={isVideoOff ? 'Turn video on' : 'Turn video off'}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          <button
            onClick={onClose}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
            title="End Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
