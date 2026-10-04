'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { useTheme } from '@/context/ThemeContext';
import { Conversation, UserProfile } from '@/types';
import {
  MessageSquarePlus,
  Users,
  Moon,
  Sun,
  Search,
  MoreVertical,
  Check,
  CheckCheck,
  ImageIcon,
  Mic,
  FileText,
  Lock,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

interface SidebarProps {
  onOpenNewChat: () => void;
  onOpenNewGroup: () => void;
  onOpenProfile: () => void;
}

export function Sidebar({ onOpenNewChat, onOpenNewGroup, onOpenProfile }: SidebarProps) {
  const { currentUser, logout } = useAuth();
  const { conversations, activeConversation, setActiveConversation, isLoadingConversations } = useChat();
  const { theme, toggleTheme } = useTheme();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'groups'>('all');
  const [showMenu, setShowMenu] = useState(false);

  const getConversationTitle = (conv: Conversation): string => {
    if (conv.type === 'group') {
      return conv.name || 'Group Chat';
    }
    const peer = conv.participants?.find(p => p.id !== currentUser?.id);
    return peer?.display_name || 'Direct Chat';
  };

  const getConversationAvatar = (conv: Conversation) => {
    if (conv.type === 'group') {
      return conv.avatar_url;
    }
    const peer = conv.participants?.find(p => p.id !== currentUser?.id);
    return peer?.avatar_url;
  };

  const getPeerUser = (conv: Conversation): UserProfile | undefined => {
    if (conv.type === 'direct') {
      return conv.participants?.find(p => p.id !== currentUser?.id);
    }
    return undefined;
  };

  const formatLastActivity = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isToday(date)) {
        return format(date, 'h:mm a');
      } else if (isYesterday(date)) {
        return 'Yesterday';
      }
      return format(date, 'dd/MM/yyyy');
    } catch {
      return '';
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const title = getConversationTitle(conv).toLowerCase();
    const peer = getPeerUser(conv);
    const phone = peer?.phone_number || '';
    const matchesSearch = title.includes(search.toLowerCase()) || phone.includes(search);
    if (!matchesSearch) return false;

    if (filter === 'groups') return conv.type === 'group';
    if (filter === 'unread') return (conv.unread_count || 0) > 0;
    return true;
  });

  return (
    <div className="w-full md:w-96 flex flex-col h-full bg-[#111b21] border-r border-[#222d34] select-none">
      {/* Header Bar */}
      <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between border-b border-[#2a3942]">
        {/* User Profile Avatar */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 hover:opacity-85 transition-opacity cursor-pointer text-left"
          title="Open Profile & Settings"
        >
          <div className="relative">
            {currentUser?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentUser.avatar_url}
                alt={currentUser.display_name}
                className="w-10 h-10 rounded-full object-cover border border-[#2a3942]"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#2a3942] flex items-center justify-center font-bold text-gray-200">
                {currentUser?.display_name?.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00a884] rounded-full border-2 border-[#202c33]" />
          </div>

          <div className="hidden sm:block">
            <div className="text-sm font-semibold text-gray-100 leading-tight">
              {currentUser?.display_name}
            </div>
            <div className="text-[11px] text-gray-400 font-mono">
              {currentUser?.phone_number ? currentUser.phone_number : `@${currentUser?.username}`}
            </div>
          </div>
        </button>

        {/* Action icons */}
        <div className="flex items-center gap-1 text-gray-300">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-[#2a3942] transition-colors cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={onOpenNewGroup}
            className="p-2 rounded-full hover:bg-[#2a3942] transition-colors cursor-pointer"
            title="New Encrypted Group"
          >
            <Users className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenNewChat}
            className="p-2 rounded-full hover:bg-[#2a3942] transition-colors cursor-pointer"
            title="New Chat"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-[#2a3942] transition-colors cursor-pointer"
              title="Menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-12 bg-[#202c33] border border-[#2a3942] rounded-xl shadow-2xl py-1.5 w-48 z-40 text-xs">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenProfile();
                  }}
                  className="w-full px-4 py-2 text-left text-gray-200 hover:bg-[#111b21] transition-colors"
                >
                  Profile & Security Keys
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenNewChat();
                  }}
                  className="w-full px-4 py-2 text-left text-gray-200 hover:bg-[#111b21] transition-colors"
                >
                  New Conversation
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenNewGroup();
                  }}
                  className="w-full px-4 py-2 text-left text-gray-200 hover:bg-[#111b21] transition-colors"
                >
                  Create Group
                </button>
                <div className="my-1 border-t border-[#2a3942]" />
                <button
                  onClick={() => {
                    setShowMenu(false);
                    logout();
                  }}
                  className="w-full px-4 py-2 text-left text-red-400 hover:bg-[#111b21] transition-colors"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Input & Filter Pills */}
      <div className="p-2.5 space-y-2 border-b border-[#222d34]">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search or start a new chat"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#202c33] border border-[#2a3942] rounded-lg text-xs text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#00a884]"
          />
        </div>

        <div className="flex items-center gap-1.5 px-0.5">
          {(['all', 'unread', 'groups'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                filter === tab
                  ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40'
                  : 'bg-[#202c33] text-gray-400 hover:text-gray-200 border border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#222d34]/60">
        {isLoadingConversations && conversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">Loading chats...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400 space-y-3">
            <Lock className="w-8 h-8 text-gray-500 mx-auto" />
            <p>No conversations yet.</p>
            <button
              onClick={onOpenNewChat}
              className="px-4 py-2 bg-[#00a884] text-white rounded-lg text-xs font-medium hover:bg-[#008f6f] transition-colors cursor-pointer"
            >
              Start New Encrypted Chat
            </button>
          </div>
        ) : (
          filteredConversations.map(conv => {
            const isSelected = activeConversation?.id === conv.id;
            const title = getConversationTitle(conv);
            const avatar = getConversationAvatar(conv);
            const peer = getPeerUser(conv);
            const lastMsg = conv.last_message;

            return (
              <div
                key={conv.id}
                onClick={() => setActiveConversation(conv)}
                className={`px-3.5 py-3 flex items-center gap-3 transition-colors cursor-pointer ${
                  isSelected ? 'bg-[#2a3942]' : 'hover:bg-[#202c33]/70'
                }`}
              >
                {/* Avatar with presence */}
                <div className="relative shrink-0">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatar}
                      alt={title}
                      className="w-12 h-12 rounded-full object-cover border border-[#2a3942]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#2a3942] flex items-center justify-center font-bold text-gray-200">
                      {conv.type === 'group' ? (
                        <Users className="w-6 h-6 text-[#00a884]" />
                      ) : (
                        title.slice(0, 2).toUpperCase()
                      )}
                    </div>
                  )}

                  {peer?.is_online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full border-2 border-[#111b21]" />
                  )}
                </div>

                {/* Info & Snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-gray-100 truncate">{title}</span>
                    <span className="text-[11px] text-gray-400 shrink-0">
                      {formatLastActivity(conv.updated_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1 truncate max-w-[200px]">
                      {lastMsg && lastMsg.sender_id === currentUser?.id && (
                        <span>
                          {lastMsg.status === 'read' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                          ) : lastMsg.status === 'delivered' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </span>
                      )}

                      {lastMsg?.message_type === 'image' && (
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5" /> Photo
                        </span>
                      )}
                      {lastMsg?.message_type === 'audio' && (
                        <span className="flex items-center gap-1">
                          <Mic className="w-3.5 h-3.5" /> Voice message
                        </span>
                      )}
                      {lastMsg?.message_type === 'file' && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> Document
                        </span>
                      )}
                      {(!lastMsg || lastMsg.message_type === 'text') && (
                        <span className="truncate">{lastMsg?.content || '🔒 End-to-end encrypted'}</span>
                      )}
                    </div>

                    {(conv.unread_count || 0) > 0 && (
                      <span className="w-5 h-5 rounded-full bg-[#00a884] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
