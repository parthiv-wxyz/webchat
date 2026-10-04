'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  Conversation,
  DecryptedMessage,
  UserProfile,
  MessageType,
  EncryptedMessagePayload,
} from '@/types';
import { useAuth } from './AuthContext';
import { ChatService } from '@/lib/chatService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { subscribeToMockRealtime, RealtimeMessageEvent } from '@/lib/mockBackend';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: DecryptedMessage[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  typingMap: Record<string, string>; // convId -> username typing
  setActiveConversation: (conv: Conversation | null) => void;
  sendMessage: (text: string, type?: MessageType, mediaMetadata?: Record<string, unknown>) => Promise<void>;
  startDirectChat: (user: UserProfile) => Promise<Conversation>;
  createGroupChat: (name: string, memberIds: string[]) => Promise<Conversation>;
  setTyping: (isTyping: boolean) => void;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversationState] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingMap, setTypingMap] = useState<Record<string, string>>({});

  const activeConvRef = useRef<Conversation | null>(null);

  // Sync ref outside render
  useEffect(() => {
    activeConvRef.current = activeConversation;
  }, [activeConversation]);

  // Refresh conversations list
  const refreshConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      setIsLoadingConversations(true);
      const convs = await ChatService.getConversations(currentUser.id);
      setConversations(convs);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [currentUser]);

  // Load conversations when user changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!currentUser) {
        setConversations([]);
        setActiveConversationState(null);
        setMessages([]);
      } else {
        refreshConversations();
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [currentUser, refreshConversations]);

  // Load and decrypt messages for active conversation
  const loadMessages = useCallback(async (conv: Conversation) => {
    if (!currentUser) return;
    setIsLoadingMessages(true);
    try {
      const msgs = await ChatService.getConversationMessages(conv, currentUser.id);
      setMessages(msgs);
      // Mark as read
      await ChatService.markMessagesAsRead(conv.id, currentUser.id);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [currentUser]);

  const setActiveConversation = (conv: Conversation | null) => {
    setActiveConversationState(conv);
    if (conv) {
      loadMessages(conv);
    } else {
      setMessages([]);
    }
  };

  // Real-time message receiver handler
  const handleIncomingMessage = useCallback(async (incoming: EncryptedMessagePayload) => {
    if (!currentUser) return;

    const currentConv = activeConvRef.current;
    if (currentConv && incoming.conversation_id === currentConv.id) {
      // Decrypt incoming message
      const decrypted = await ChatService.decryptMessages([incoming], currentConv, currentUser.id);
      if (decrypted.length > 0) {
        setMessages(prev => {
          if (prev.some(m => m.id === decrypted[0].id)) return prev;
          return [...prev, decrypted[0]];
        });

        if (incoming.sender_id !== currentUser.id) {
          ChatService.markMessagesAsRead(currentConv.id, currentUser.id);
        }
      }
    }

    // Refresh conversation list to show latest snippet
    refreshConversations();
  }, [currentUser, refreshConversations]);

  // Realtime subscription setup
  useEffect(() => {
    if (!currentUser) return;

    if (!isSupabaseConfigured) {
      // Mock Realtime
      const unsubscribe = subscribeToMockRealtime(async (event: RealtimeMessageEvent) => {
        if (event.type === 'NEW_MESSAGE') {
          handleIncomingMessage(event.payload as EncryptedMessagePayload);
        } else if (event.type === 'UPDATE_MESSAGE') {
          const { conversationId, status } = event.payload as { conversationId: string; status: 'sent' | 'delivered' | 'read' };
          if (activeConvRef.current?.id === conversationId) {
            setMessages(prev => prev.map(m => ({ ...m, status })));
          }
        } else if (event.type === 'TYPING') {
          const { conversation_id, username, is_typing, user_id } = event.payload as {
            conversation_id: string;
            username: string;
            is_typing: boolean;
            user_id: string;
          };
          if (user_id !== currentUser.id) {
            setTypingMap(prev => ({
              ...prev,
              [conversation_id]: is_typing ? username : '',
            }));
          }
        }
      });
      return unsubscribe;
    } else {
      // Supabase Postgres Changes
      const channel = supabase
        .channel('public:messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          payload => {
            handleIncomingMessage(payload.new as EncryptedMessagePayload);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages' },
          payload => {
            const updated = payload.new as EncryptedMessagePayload;
            setMessages(prev =>
              prev.map(m => (m.id === updated.id ? { ...m, status: updated.status } : m))
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser, handleIncomingMessage]);

  // Send message
  const sendMessage = async (text: string, type: MessageType = 'text', mediaMetadata?: Record<string, unknown>) => {
    if (!currentUser || !activeConversation || (!text.trim() && type === 'text')) return;

    try {
      const sent = await ChatService.sendEncryptedMessage({
        conversation: activeConversation,
        currentUser,
        plaintext: text,
        messageType: type,
        mediaMetadata,
      });

      setMessages(prev => {
        if (prev.some(m => m.id === sent.id)) return prev;
        return [...prev, sent];
      });

      refreshConversations();
    } catch (err) {
      console.error('Failed to send message:', err);
      alert(`Message sending failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Start 1-on-1 direct chat
  const startDirectChat = async (targetUser: UserProfile): Promise<Conversation> => {
    if (!currentUser) throw new Error('Not logged in');

    const conv = await ChatService.getOrCreateDirectConversation(currentUser.id, targetUser.id);
    conv.participants = [currentUser, targetUser];

    setConversations(prev => {
      const exists = prev.find(c => c.id === conv.id);
      return exists ? prev : [conv, ...prev];
    });

    setActiveConversation(conv);
    return conv;
  };

  // Create group chat
  const createGroupChat = async (name: string, memberIds: string[]): Promise<Conversation> => {
    if (!currentUser) throw new Error('Not logged in');

    const conv = await ChatService.createGroupConversation(name, currentUser.id, memberIds);
    await refreshConversations();
    setActiveConversation(conv);
    return conv;
  };

  // Typing indicator
  const setTyping = (isTyping: boolean) => {
    if (!currentUser || !activeConversation) return;
    ChatService.sendTypingStatus({
      conversation_id: activeConversation.id,
      user_id: currentUser.id,
      username: currentUser.display_name,
      is_typing: isTyping,
    });
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        isLoadingConversations,
        isLoadingMessages,
        typingMap,
        setActiveConversation,
        sendMessage,
        startDirectChat,
        createGroupChat,
        setTyping,
        refreshConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
