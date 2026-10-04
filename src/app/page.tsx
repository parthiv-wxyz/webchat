'use client';

import React, { useState } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ChatProvider, useChat } from '@/context/ChatContext';
import { SetupBanner } from '@/components/chat/SetupBanner';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { AuthModal } from '@/components/auth/AuthModal';
import { NewChatModal } from '@/components/chat/NewChatModal';
import { NewGroupModal } from '@/components/chat/NewGroupModal';
import { ProfileModal } from '@/components/chat/ProfileModal';
import { Loader2 } from 'lucide-react';

function ChatAppContent() {
  const { currentUser, isLoading } = useAuth();
  const { activeConversation, setActiveConversation } = useChat();

  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#111b21] text-gray-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#00a884]" />
        <div className="text-xs">Loading WhatsApp Live & Cryptographic Keys...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0c1317]">
        <AuthModal />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Top Banner */}
      <SetupBanner />

      {/* Main WhatsApp Window */}
      <div className="flex-1 flex h-[calc(100%-33px)] overflow-hidden">
        {/* Left Sidebar */}
        <div
          className={`h-full ${
            activeConversation ? 'hidden md:flex' : 'flex w-full md:w-96'
          }`}
        >
          <Sidebar
            onOpenNewChat={() => setShowNewChat(true)}
            onOpenNewGroup={() => setShowNewGroup(true)}
            onOpenProfile={() => setShowProfile(true)}
          />
        </div>

        {/* Right Chat Area */}
        <div
          className={`flex-1 h-full ${
            !activeConversation ? 'hidden md:flex' : 'flex w-full'
          }`}
        >
          <ChatArea onBackMobile={() => setActiveConversation(null)} />
        </div>
      </div>

      {/* Modals */}
      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      {showNewGroup && <NewGroupModal onClose={() => setShowNewGroup(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <main className="h-screen w-screen flex flex-col overflow-hidden bg-[#0c1317]">
            <ChatAppContent />
          </main>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
