'use client';

import React, { useState, useRef } from 'react';
import { DecryptedMessage, UserProfile } from '@/types';
import { Check, CheckCheck, Lock, Play, Pause, FileText, AlertTriangle, Download } from 'lucide-react';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: DecryptedMessage;
  isCurrentUser: boolean;
  senderProfile?: UserProfile;
  isGroup?: boolean;
}

export function MessageBubble({
  message,
  isCurrentUser,
  senderProfile,
  isGroup = false,
}: MessageBubbleProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formattedTime = (() => {
    try {
      return format(new Date(message.created_at), 'h:mm a');
    } catch {
      return '';
    }
  })();

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  return (
    <div className={`flex w-full my-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] md:max-w-[60%] rounded-2xl px-3.5 py-2 shadow-sm ${
          isCurrentUser
            ? 'bg-[#005c4b] text-gray-100 rounded-tr-none'
            : 'bg-[#202c33] text-gray-200 rounded-tl-none border border-[#2a3942]/50'
        }`}
      >
        {/* Sender name for group chats */}
        {isGroup && !isCurrentUser && senderProfile && (
          <div className="text-[11px] font-semibold text-[#53bdeb] mb-0.5">
            {senderProfile.display_name}
          </div>
        )}

        {/* Decryption Error Banner */}
        {message.decryption_error ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-800/50">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{message.content}</span>
          </div>
        ) : (
          <>
            {/* Image message */}
            {message.message_type === 'image' && (
              <div className="mb-1 rounded-lg overflow-hidden max-w-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={message.content}
                  alt="Encrypted attachment"
                  className="w-full max-h-72 object-cover rounded-lg hover:opacity-95 transition-opacity cursor-pointer"
                  onClick={() => {
                    const win = window.open();
                    win?.document.write(`<img src="${message.content}" style="max-width:100%" />`);
                  }}
                />
              </div>
            )}

            {/* Voice note message */}
            {message.message_type === 'audio' && (
              <div className="flex items-center gap-3 py-1 px-1 min-w-[200px]">
                <audio
                  ref={audioRef}
                  src={message.content}
                  onEnded={() => setIsPlayingAudio(false)}
                />
                <button
                  type="button"
                  onClick={toggleAudio}
                  className="w-9 h-9 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer"
                >
                  {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="flex-1">
                  {/* Stylized Audio Waveform Bars */}
                  <div className="flex items-center gap-0.5 h-6">
                    {[40, 70, 30, 90, 60, 100, 50, 80, 45, 95, 30, 85, 60, 40, 75].map((height, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all ${
                          isPlayingAudio ? 'bg-[#00a884]' : 'bg-gray-400/60'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                  <div className="text-[10px] text-gray-300 font-mono mt-0.5">
                    {message.media_metadata?.duration
                      ? `${Math.round(message.media_metadata.duration)}s`
                      : 'Voice message'}
                  </div>
                </div>
              </div>
            )}

            {/* Document / File message */}
            {message.message_type === 'file' && (
              <div className="flex items-center gap-3 p-2 bg-black/20 rounded-lg mb-1">
                <FileText className="w-8 h-8 text-[#00a884] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-100 truncate">
                    {message.media_metadata?.filename || 'Encrypted Document'}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {message.media_metadata?.filesize
                      ? `${Math.round(message.media_metadata.filesize / 1024)} KB`
                      : 'File'}
                  </div>
                </div>
                <a
                  href={message.content}
                  download={message.media_metadata?.filename || 'attachment'}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-gray-300"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* Standard Text */}
            {message.message_type === 'text' && (
              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap select-text">
                {message.content}
              </p>
            )}
          </>
        )}

        {/* Message Footer: Timestamp, Lock & Ticks */}
        <div className="flex items-center justify-end gap-1 text-[10px] text-gray-300/80 mt-1 float-right ml-3 select-none">
          <span title="Encrypted with AES-256-GCM">
            <Lock className="w-2.5 h-2.5 opacity-70" />
          </span>
          <span>{formattedTime}</span>

          {isCurrentUser && (
            <span className="ml-0.5">
              {message.status === 'read' ? (
                <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="w-3.5 h-3.5 text-gray-300" />
              ) : (
                <Check className="w-3.5 h-3.5 text-gray-300" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
