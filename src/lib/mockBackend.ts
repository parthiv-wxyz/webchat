import {
  UserProfile,
  Conversation,
  ConversationParticipant,
  EncryptedMessagePayload,
  TypingEvent,
} from '@/types';
import { generateECDHKeyPair } from './crypto';
import { storePrivateKey } from './keyStore';

const STORAGE_KEYS = {
  USERS: 'wa_mock_users',
  CONVERSATIONS: 'wa_mock_conversations',
  PARTICIPANTS: 'wa_mock_participants',
  MESSAGES: 'wa_mock_messages',
  CURRENT_USER: 'wa_mock_current_user',
};

// Cross-tab broadcast channel for real-time simulation
let realtimeChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  realtimeChannel = new BroadcastChannel('whatsapp_live_realtime');
}

export interface RealtimeMessageEvent {
  type: 'NEW_MESSAGE' | 'UPDATE_MESSAGE' | 'TYPING' | 'USER_ONLINE';
  payload: unknown;
}

export function subscribeToMockRealtime(callback: (event: RealtimeMessageEvent) => void): () => void {
  if (!realtimeChannel) return () => {};

  const handler = (event: MessageEvent<RealtimeMessageEvent>) => {
    callback(event.data);
  };

  realtimeChannel.addEventListener('message', handler);
  return () => {
    realtimeChannel?.removeEventListener('message', handler);
  };
}

export function broadcastMockEvent(event: RealtimeMessageEvent) {
  realtimeChannel?.postMessage(event);
}

// Helpers to load/save in localStorage
function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorageItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded or blocked
  }
}

export function normalizePhoneNumber(phone: string): string {
  // Strip spaces, dashes, parentheses, dots
  return phone.replace(/[\s\-().]/g, '');
}

/**
 * Initialize mock pre-seeded users with valid cryptographic ECDH keys
 */
export async function initializeMockData(): Promise<void> {
  if (typeof window === 'undefined') return;

  const existingUsers = getStorageItem<UserProfile[]>(STORAGE_KEYS.USERS, []);
  if (existingUsers.length > 0) {
    // If users exist but lack phone_number, patch them with default demo mobile numbers
    let changed = false;
    const patched = existingUsers.map(u => {
      if (!u.phone_number) {
        changed = true;
        if (u.username === 'alice') return { ...u, phone_number: '+15550100001' };
        if (u.username === 'bob') return { ...u, phone_number: '+15550100002' };
        if (u.username === 'charlie') return { ...u, phone_number: '+15550100003' };
      }
      return u;
    });
    if (changed) {
      setStorageItem(STORAGE_KEYS.USERS, patched);
      const current = getStorageItem<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
      if (current) {
        const found = patched.find(p => p.id === current.id);
        if (found) setStorageItem(STORAGE_KEYS.CURRENT_USER, found);
      }
    }
    return;
  }

  // Generate real ECDH key pairs for 3 demo users so E2EE works authentically
  const aliceKey = await generateECDHKeyPair();
  const bobKey = await generateECDHKeyPair();
  const charlieKey = await generateECDHKeyPair();

  const aliceId = 'usr_alice_101';
  const bobId = 'usr_bob_102';
  const charlieId = 'usr_charlie_103';

  // Store private keys in KeyStore
  await storePrivateKey(aliceId, aliceKey.privateKeyJWK);
  await storePrivateKey(bobId, bobKey.privateKeyJWK);
  await storePrivateKey(charlieId, charlieKey.privateKeyJWK);

  const mockUsers: UserProfile[] = [
    {
      id: aliceId,
      username: 'alice',
      display_name: 'Alice (Security Lead)',
      phone_number: '+15550100001',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      status: '🔒 Encrypted end-to-end!',
      public_key: aliceKey.publicKeyJWK,
      is_online: true,
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: bobId,
      username: 'bob',
      display_name: 'Bob (Product Manager)',
      phone_number: '+15550100002',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      status: 'In a meeting | Ping if urgent',
      public_key: bobKey.publicKeyJWK,
      is_online: true,
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: charlieId,
      username: 'charlie',
      display_name: 'Charlie (Engineer)',
      phone_number: '+15550100003',
      avatar_url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      status: 'Debugging React 19 & Next.js ⚡',
      public_key: charlieKey.publicKeyJWK,
      is_online: false,
      last_seen: new Date(Date.now() - 3600000).toISOString(),
      created_at: new Date().toISOString(),
    },
  ];

  setStorageItem(STORAGE_KEYS.USERS, mockUsers);

  // Set default current user as Alice if not chosen
  if (!getStorageItem(STORAGE_KEYS.CURRENT_USER, null)) {
    setStorageItem(STORAGE_KEYS.CURRENT_USER, mockUsers[0]);
  }
}

export const mockBackend = {
  getUsers: (): UserProfile[] => {
    return getStorageItem<UserProfile[]>(STORAGE_KEYS.USERS, []);
  },

  getUserById: (id: string): UserProfile | undefined => {
    return mockBackend.getUsers().find(u => u.id === id);
  },

  getUserByPhone: (phone: string): UserProfile | undefined => {
    const cleanedSearch = normalizePhoneNumber(phone);
    if (!cleanedSearch) return undefined;
    return mockBackend.getUsers().find(u => {
      if (!u.phone_number) return false;
      const cleanedUserPhone = normalizePhoneNumber(u.phone_number);
      return (
        cleanedUserPhone === cleanedSearch ||
        cleanedUserPhone.endsWith(cleanedSearch) ||
        cleanedSearch.endsWith(cleanedUserPhone)
      );
    });
  },

  getCurrentUser: (): UserProfile | null => {
    return getStorageItem<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
  },

  setCurrentUser: (user: UserProfile | null): void => {
    setStorageItem(STORAGE_KEYS.CURRENT_USER, user);
    if (user) {
      broadcastMockEvent({
        type: 'USER_ONLINE',
        payload: { userId: user.id, isOnline: true },
      });
    }
  },

  registerUser: async (
    username: string,
    displayName: string,
    publicKeyJWK: JsonWebKey,
    phoneNumber?: string,
    avatarUrl?: string
  ): Promise<UserProfile> => {
    const users = mockBackend.getUsers();
    const existing = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      throw new Error(`Username @${username} is already taken.`);
    }

    if (phoneNumber) {
      const cleanNew = normalizePhoneNumber(phoneNumber);
      const existingPhone = users.find(u => u.phone_number && normalizePhoneNumber(u.phone_number) === cleanNew);
      if (existingPhone) {
        throw new Error(`Mobile number ${phoneNumber} is already registered with another profile.`);
      }
    }

    const newUser: UserProfile = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: username.toLowerCase().trim(),
      display_name: displayName.trim(),
      phone_number: phoneNumber?.trim(),
      avatar_url: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      status: 'Hey there! I am using WhatsApp Live.',
      public_key: publicKeyJWK,
      is_online: true,
      last_seen: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    users.push(newUser);
    setStorageItem(STORAGE_KEYS.USERS, users);
    mockBackend.setCurrentUser(newUser);
    return newUser;
  },

  updateUserProfile: (userId: string, updates: Partial<UserProfile>): UserProfile => {
    const users = mockBackend.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error('User not found');
    users[index] = { ...users[index], ...updates };
    setStorageItem(STORAGE_KEYS.USERS, users);

    const current = mockBackend.getCurrentUser();
    if (current && current.id === userId) {
      mockBackend.setCurrentUser(users[index]);
    }
    return users[index];
  },

  getConversations: (userId: string): Conversation[] => {
    const participants = getStorageItem<ConversationParticipant[]>(STORAGE_KEYS.PARTICIPANTS, []);
    const myConvs = participants.filter(p => p.user_id === userId);
    const convIds = new Set(myConvs.map(p => p.conversation_id));

    const allConvs = getStorageItem<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, []);
    const userConvs = allConvs.filter(c => convIds.has(c.id));

    // Attach participants
    return userConvs.map(conv => {
      const parts = participants.filter(p => p.conversation_id === conv.id);
      const allUsers = mockBackend.getUsers();
      const profileParts = parts
        .map(p => allUsers.find(u => u.id === p.user_id))
        .filter(Boolean) as UserProfile[];

      return {
        ...conv,
        participants: profileParts,
      };
    }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },

  createDirectConversation: (currentUserId: string, targetUserId: string): Conversation => {
    // Check if direct conversation already exists
    const participants = getStorageItem<ConversationParticipant[]>(STORAGE_KEYS.PARTICIPANTS, []);
    const allConvs = getStorageItem<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, []);

    for (const conv of allConvs) {
      if (conv.type === 'direct') {
        const parts = participants.filter(p => p.conversation_id === conv.id);
        const userIds = parts.map(p => p.user_id);
        if (userIds.includes(currentUserId) && userIds.includes(targetUserId)) {
          return conv;
        }
      }
    }

    // Create new
    const newConv: Conversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'direct',
      created_by: currentUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    allConvs.push(newConv);
    setStorageItem(STORAGE_KEYS.CONVERSATIONS, allConvs);

    participants.push(
      {
        id: `part_${Date.now()}_1`,
        conversation_id: newConv.id,
        user_id: currentUserId,
        role: 'member',
        joined_at: new Date().toISOString(),
      },
      {
        id: `part_${Date.now()}_2`,
        conversation_id: newConv.id,
        user_id: targetUserId,
        role: 'member',
        joined_at: new Date().toISOString(),
      }
    );
    setStorageItem(STORAGE_KEYS.PARTICIPANTS, participants);

    return newConv;
  },

  createGroupConversation: (name: string, currentUserId: string, participantUserIds: string[], avatarUrl?: string): Conversation => {
    const allConvs = getStorageItem<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, []);
    const participants = getStorageItem<ConversationParticipant[]>(STORAGE_KEYS.PARTICIPANTS, []);

    const newConv: Conversation = {
      id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'group',
      name,
      avatar_url: avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
      created_by: currentUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    allConvs.push(newConv);
    setStorageItem(STORAGE_KEYS.CONVERSATIONS, allConvs);

    const allMemberIds = Array.from(new Set([currentUserId, ...participantUserIds]));
    for (const uid of allMemberIds) {
      participants.push({
        id: `part_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        conversation_id: newConv.id,
        user_id: uid,
        role: uid === currentUserId ? 'admin' : 'member',
        joined_at: new Date().toISOString(),
      });
    }
    setStorageItem(STORAGE_KEYS.PARTICIPANTS, participants);

    return newConv;
  },

  getMessages: (conversationId: string): EncryptedMessagePayload[] => {
    const allMessages = getStorageItem<EncryptedMessagePayload[]>(STORAGE_KEYS.MESSAGES, []);
    return allMessages
      .filter(m => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  sendMessage: (payload: Omit<EncryptedMessagePayload, 'id' | 'created_at' | 'status'>): EncryptedMessagePayload => {
    const allMessages = getStorageItem<EncryptedMessagePayload[]>(STORAGE_KEYS.MESSAGES, []);
    const newMessage: EncryptedMessagePayload = {
      ...payload,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'delivered', // Delivered immediately in mock
      created_at: new Date().toISOString(),
    };

    allMessages.push(newMessage);
    setStorageItem(STORAGE_KEYS.MESSAGES, allMessages);

    // Update conversation updated_at
    const allConvs = getStorageItem<Conversation[]>(STORAGE_KEYS.CONVERSATIONS, []);
    const conv = allConvs.find(c => c.id === payload.conversation_id);
    if (conv) {
      conv.updated_at = newMessage.created_at;
      setStorageItem(STORAGE_KEYS.CONVERSATIONS, allConvs);
    }

    broadcastMockEvent({
      type: 'NEW_MESSAGE',
      payload: newMessage,
    });

    return newMessage;
  },

  markMessagesAsRead: (conversationId: string, currentUserId: string): void => {
    const allMessages = getStorageItem<EncryptedMessagePayload[]>(STORAGE_KEYS.MESSAGES, []);
    let updated = false;

    for (const msg of allMessages) {
      if (msg.conversation_id === conversationId && msg.sender_id !== currentUserId && msg.status !== 'read') {
        msg.status = 'read';
        updated = true;
      }
    }

    if (updated) {
      setStorageItem(STORAGE_KEYS.MESSAGES, allMessages);
      broadcastMockEvent({
        type: 'UPDATE_MESSAGE',
        payload: { conversationId, status: 'read' },
      });
    }
  },

  sendTypingStatus: (event: TypingEvent): void => {
    broadcastMockEvent({
      type: 'TYPING',
      payload: event,
    });
  },
};
