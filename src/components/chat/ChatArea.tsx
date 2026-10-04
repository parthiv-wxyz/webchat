'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { UserProfile } from '@/types';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { SecurityModal } from './SecurityModal';
import { CallModal } from './CallModal';
import {
  Phone,
  Video,
  Search,
  MoreVertical,
  ShieldCheck,
  Lock,
  ArrowLeft,
  X,
  Users,
} from 'lucide-react';

interface ChatAreaProps {
  onBackMobile?: () => void;
}

export function ChatArea({ onBackMobile }: ChatAreaProps) {
  const { currentUser } = useAuth();
  const { activeConversation, messages, typingMap, isLoadingMessages } = useChat();

  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [activeCall, setActiveCall] = useState<{ isVideo: boolean } | null>(null);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChatMenu, setShowChatMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const peerUser: UserProfile | undefined =
    activeConversation?.type === 'direct'
      ? activeConversation.participants?.find(p => p.id !== currentUser?.id)
      : undefined;

  const typingUser = activeConversation ? typingMap[activeConversation.id] : '';

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  if (!activeConversation) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#222e35] p-8 text-center text-gray-400 select-none border-b-[6px] border-[#00a884]">
        <div className="max-w-md space-y-4">
          <div className="w-20 h-20 rounded-full bg-[#111b21] flex items-center justify-center mx-auto text-[#00a884] border border-[#2a3942] shadow-xl">
            <Lock className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-light text-gray-200">WhatsApp Live Web</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            Send and receive live end-to-end encrypted messages with instant delivery.
            Your private keys never leave this browser device.
          </p>
          <div className="pt-8 flex items-center justify-center gap-1.5 text-xs text-gray-500">
            <ShieldCheck className="w-4 h-4 text-[#00a884]" />
            End-to-end encrypted with ECDH P-256 and AES-256-GCM
          </div>
        </div>
      </div>
    );
  }

  const title =
    activeConversation.type === 'group'
      ? activeConversation.name || 'Group Chat'
      : peerUser?.display_name || 'Direct Chat';

  const avatar =
    activeConversation.type === 'group'
      ? activeConversation.avatar_url
      : peerUser?.avatar_url;

  // Filter messages if search active
  const displayedMessages = searchQuery.trim()
    ? messages.filter(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b141a] relative overflow-hidden">
      {/* Chat Header */}
      <div className="bg-[#202c33] px-4 py-2.5 flex items-center justify-between border-b border-[#2a3942] z-10 select-none">
        <div className="flex items-center gap-3">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="md:hidden p-1 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => peerUser && setShowSecurityModal(true)}
          >
            <div className="relative">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={title}
                  className="w-10 h-10 rounded-full object-cover border border-[#2a3942]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#2a3942] flex items-center justify-center font-bold text-gray-200 text-sm">
                  {activeConversation.type === 'group' ? (
                    <Users className="w-5 h-5 text-[#00a884]" />
                  ) : (
                    title.slice(0, 2).toUpperCase()
                  )}
                </div>
              )}
              {peerUser?.is_online && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00a884] rounded-full border-2 border-[#202c33]" />
              )}
            </div>

            <div>
              <div className="text-sm font-semibold text-gray-100 flex items-center gap-1.5">
                <span>{title}</span>
                <span title="End-to-End Encrypted">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00a884]" />
                </span>
              </div>
              <div className="text-[11px] text-gray-400 flex items-center gap-1">
                {typingUser ? (
                  <span className="text-[#00a884] font-medium animate-pulse">
                    {typingUser} is typing...
                  </span>
                ) : activeConversation.type === 'group' ? (
                  `${activeConversation.participants?.length || 0} participants`
                ) : (
                  <>
                    {peerUser?.phone_number && (
                      <span className="text-gray-400 font-mono">{peerUser.phone_number} • </span>
                    )}
                    {peerUser?.is_online ? (
                      <span className="text-[#00a884]">online</span>
                    ) : (
                      <span>offline</span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 text-gray-300">
          <button
            onClick={() => setActiveCall({ isVideo: false })}
            className="p-2 rounded-full hover:bg-[#2a3942] transition-colors cursor-pointer"
            title="Start Voice Call (Encrypted)"
          >
            <Phone className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveCall({ isVideo: true })}
            className="p-2 rounded-full hover:bg-[#2a3942] transition-colors cursor-pointer"
            title="Start Video Call (Encrypted)"
          >
            <Video className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowInChatSearch(!showInChatSearch)}
            className={`p-2 rounded-full hover:bg-[#2a3942] transition-colors cursor-pointer ${
              showInChatSearch ? 'text-[#00a884]' : ''
            }`}
            title="Search in conversation"
          >
            <Search className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowChatMenu(!showChatMenu)}
              className="p-2 rounded-full hover:bg-[#2a3942] transition-colors cursor-pointer"
              title="More options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showChatMenu && (
              <div className="absolute right-0 top-12 bg-[#202c33] border border-[#2a3942] rounded-xl shadow-2xl py-1.5 w-52 z-40 text-xs">
                {peerUser && (
                  <button
                    onClick={() => {
                      setShowChatMenu(false);
                      setShowSecurityModal(true);
                    }}
                    className="w-full px-4 py-2 text-left text-gray-200 hover:bg-[#111b21] transition-colors flex items-center gap-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#00a884]" />
                    Verify Security Code
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowChatMenu(false);
                    setShowInChatSearch(true);
                  }}
                  className="w-full px-4 py-2 text-left text-gray-200 hover:bg-[#111b21] transition-colors flex items-center gap-2"
                >
                  <Search className="w-3.5 h-3.5" />
                  Search Messages
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-Chat Search Bar */}
      {showInChatSearch && (
        <div className="bg-[#111b21] px-4 py-2 border-b border-[#2a3942] flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            autoFocus
            placeholder="Search messages in this chat..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-gray-100 placeholder-gray-500 focus:outline-none"
          />
          {searchQuery && (
            <span className="text-[10px] text-gray-400 font-mono">
              {displayedMessages.length} results
            </span>
          )}
          <button
            onClick={() => {
              setShowInChatSearch(false);
              setSearchQuery('');
            }}
            className="text-gray-400 hover:text-gray-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Chat Messages Body with WhatsApp Doodle Pattern */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-2 relative"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.02) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      >
        {/* End-to-End Encryption Notice Badge */}
        <div className="flex justify-center my-3">
          <button
            onClick={() => peerUser && setShowSecurityModal(true)}
            className="max-w-md bg-[#182229]/90 border border-[#2a3942] rounded-xl px-4 py-2 text-center text-[11px] text-[#ffd279] shadow-sm hover:bg-[#182229] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Messages and calls are end-to-end encrypted. No one outside of this chat, not even Supabase, can read or listen to them. Tap to verify.
            </span>
          </button>
        </div>

        {/* Date Divider */}
        <div className="flex justify-center my-2">
          <span className="bg-[#182229] border border-[#2a3942] text-gray-400 text-[10px] uppercase font-semibold tracking-wider px-3 py-1 rounded-lg">
            TODAY
          </span>
        </div>

        {/* Messages */}
        {isLoadingMessages && messages.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400">
            Decrypting messages with your private key...
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-500">
            {searchQuery ? 'No matching messages found.' : 'No messages yet. Send a message to start the encrypted chat!'}
          </div>
        ) : (
          displayedMessages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isCurrentUser={msg.sender_id === currentUser?.id}
              senderProfile={activeConversation.participants?.find(p => p.id === msg.sender_id)}
              isGroup={activeConversation.type === 'group'}
            />
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <MessageInput />

      {/* Modals */}
      {showSecurityModal && peerUser && currentUser && (
        <SecurityModal
          currentUser={currentUser}
          peerUser={peerUser}
          onClose={() => setShowSecurityModal(false)}
        />
      )}

      {activeCall && peerUser && (
        <CallModal
          peerUser={peerUser}
          isVideo={activeCall.isVideo}
          onClose={() => setActiveCall(null)}
        />
      )}
    </div>
  );
}
