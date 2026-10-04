import {
  UserProfile,
  Conversation,
  EncryptedMessagePayload,
  DecryptedMessage,
  MessageType,
  TypingEvent,
} from '@/types';
import { supabase, isSupabaseConfigured } from './supabase';
import { mockBackend } from './mockBackend';
import {
  deriveSharedSecretKey,
  importPublicKey,
  importPrivateKey,
  encryptMessage,
  decryptMessage,
  generateGroupRoomKey,
  exportKeyToJWK,
  importAESKeyFromJWK,
} from './crypto';
import {
  getStoredPrivateKey,
  getCachedSharedKey,
  setCachedSharedKey,
} from './keyStore';

export class ChatService {
  /**
   * Fetch all registered users to start new chats with
   */
  static async getAllUsers(currentUserId: string): Promise<UserProfile[]> {
    if (!isSupabaseConfigured) {
      return mockBackend.getUsers().filter(u => u.id !== currentUserId);
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId);

    if (error) {
      console.error('Error fetching users from Supabase:', error);
      return [];
    }

    return (data || []) as UserProfile[];
  }

  /**
   * Search for a user by their registered mobile number
   * Only returns the profile if they have created an account and profile!
   */
  static async findUserByPhone(phoneNumber: string): Promise<UserProfile | null> {
    const cleaned = phoneNumber.replace(/[\s\-().]/g, '');
    if (!cleaned) return null;

    if (!isSupabaseConfigured) {
      const match = mockBackend.getUserByPhone(phoneNumber);
      return match || null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`phone_number.eq.${cleaned},phone_number.eq.+${cleaned},phone_number.ilike.%${cleaned}%`)
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0] as UserProfile;
  }

  /**
   * Fetch conversations for the current user
   */
  static async getConversations(userId: string): Promise<Conversation[]> {
    if (!isSupabaseConfigured) {
      return mockBackend.getConversations(userId);
    }

    // 1. Get participant rows for current user
    const { data: participantData, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (partError || !participantData) {
      console.error('Error fetching user conversations:', partError);
      return [];
    }

    const conversationIds = participantData.map(p => p.conversation_id);
    if (conversationIds.length === 0) return [];

    // 2. Fetch conversations
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .in('id', conversationIds)
      .order('updated_at', { ascending: false });

    if (convError || !convData) {
      console.error('Error fetching conversation details:', convError);
      return [];
    }

    // 3. Fetch all participants for these conversations
    const { data: allParts, error: allPartsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, profiles(*)')
      .in('conversation_id', conversationIds);

    if (allPartsError) {
      console.error('Error fetching conversation participants:', allPartsError);
    }

    const conversationsWithParts: Conversation[] = convData.map(c => {
      const parts = (allParts || [])
        .filter(p => p.conversation_id === c.id)
        .map(p => p.profiles)
        .filter(Boolean) as unknown as UserProfile[];

      return {
        ...c,
        participants: parts,
      };
    });

    return conversationsWithParts;
  }

  /**
   * Create or fetch a direct 1-on-1 conversation
   */
  static async getOrCreateDirectConversation(
    currentUserId: string,
    targetUserId: string
  ): Promise<Conversation> {
    if (!isSupabaseConfigured) {
      return mockBackend.createDirectConversation(currentUserId, targetUserId);
    }

    // Check existing
    const { data: myConvs } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', currentUserId);

    if (myConvs && myConvs.length > 0) {
      const cids = myConvs.map(c => c.conversation_id);
      const { data: match } = await supabase
        .from('conversation_participants')
        .select('conversation_id, conversations(id, type, created_at, updated_at)')
        .eq('user_id', targetUserId)
        .in('conversation_id', cids);

      const existingDirect = match?.find(m => {
        const c = m.conversations as unknown as { type: string } | null;
        return c?.type === 'direct';
      });
      if (existingDirect && existingDirect.conversations) {
        return existingDirect.conversations as unknown as Conversation;
      }
    }

    // Create new direct conversation
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        type: 'direct',
        created_by: currentUserId,
      })
      .select()
      .single();

    if (createError || !newConv) {
      throw new Error(`Failed to create conversation: ${createError?.message}`);
    }

    // Add participants
    const { error: partError } = await supabase.from('conversation_participants').insert([
      { conversation_id: newConv.id, user_id: currentUserId, role: 'member' },
      { conversation_id: newConv.id, user_id: targetUserId, role: 'member' },
    ]);

    if (partError) {
      throw new Error(`Failed to add participants: ${partError.message}`);
    }

    return newConv as Conversation;
  }

  /**
   * Create a group conversation
   */
  static async createGroupConversation(
    name: string,
    currentUserId: string,
    participantUserIds: string[],
    avatarUrl?: string
  ): Promise<Conversation> {
    if (!isSupabaseConfigured) {
      return mockBackend.createGroupConversation(name, currentUserId, participantUserIds, avatarUrl);
    }

    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        type: 'group',
        name,
        avatar_url: avatarUrl,
        created_by: currentUserId,
      })
      .select()
      .single();

    if (convError || !newConv) {
      throw new Error(`Failed to create group: ${convError?.message}`);
    }

    // Generate group room key
    const groupKey = await generateGroupRoomKey();
    const groupKeyJWK = await exportKeyToJWK(groupKey);
    const groupKeyString = JSON.stringify(groupKeyJWK);

    const allMembers = Array.from(new Set([currentUserId, ...participantUserIds]));
    const participantRows = allMembers.map(uid => ({
      conversation_id: newConv.id,
      user_id: uid,
      role: uid === currentUserId ? 'admin' : 'member',
      encrypted_group_key: groupKeyString,
    }));

    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert(participantRows);

    if (partError) {
      throw new Error(`Failed to add group participants: ${partError.message}`);
    }

    return newConv as Conversation;
  }

  /**
   * Get shared encryption key for direct conversation
   */
  static async getSharedKeyForDirectChat(
    currentUserId: string,
    peerProfile: UserProfile
  ): Promise<CryptoKey> {
    const cached = getCachedSharedKey(currentUserId, peerProfile.id);
    if (cached) return cached;

    const myPrivateKeyJWK = await getStoredPrivateKey(currentUserId);
    if (!myPrivateKeyJWK) {
      throw new Error('Your encryption private key was not found on this device.');
    }

    const myPrivateKey = await importPrivateKey(myPrivateKeyJWK);
    const peerPublicKey = await importPublicKey(peerProfile.public_key);

    const sharedKey = await deriveSharedSecretKey(myPrivateKey, peerPublicKey);
    setCachedSharedKey(currentUserId, peerProfile.id, sharedKey);
    return sharedKey;
  }

  /**
   * Send End-to-End Encrypted Message
   */
  static async sendEncryptedMessage({
    conversation,
    currentUser,
    plaintext,
    messageType = 'text',
    mediaMetadata,
    replyToId,
  }: {
    conversation: Conversation;
    currentUser: UserProfile;
    plaintext: string;
    messageType?: MessageType;
    mediaMetadata?: Record<string, unknown>;
    replyToId?: string;
  }): Promise<DecryptedMessage> {
    let aesKey: CryptoKey;

    if (conversation.type === 'direct') {
      const peer = conversation.participants?.find(p => p.id !== currentUser.id);
      if (!peer) {
        throw new Error('Direct conversation recipient not found');
      }
      aesKey = await this.getSharedKeyForDirectChat(currentUser.id, peer);
    } else {
      // Group: use group room key
      const keyJWK = conversation.encrypted_group_key
        ? JSON.parse(conversation.encrypted_group_key)
        : await exportKeyToJWK(await generateGroupRoomKey());
      aesKey = await importAESKeyFromJWK(keyJWK);
    }

    // Encrypt content with AES-256-GCM + 12-byte IV
    const { ciphertext, iv } = await encryptMessage(plaintext, aesKey);

    const payload: Omit<EncryptedMessagePayload, 'id' | 'created_at' | 'status'> = {
      conversation_id: conversation.id,
      sender_id: currentUser.id,
      encrypted_content: ciphertext,
      iv: iv,
      message_type: messageType,
      media_metadata: mediaMetadata,
      reply_to_id: replyToId,
    };

    let sentMessage: EncryptedMessagePayload;

    if (!isSupabaseConfigured) {
      sentMessage = mockBackend.sendMessage(payload);
    } else {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          ...payload,
          status: 'sent',
        })
        .select()
        .single();

      if (error || !data) {
        throw new Error(`Failed to send message: ${error?.message}`);
      }
      sentMessage = data as EncryptedMessagePayload;
    }

    return {
      ...sentMessage,
      content: plaintext,
      is_encrypted: true,
    };
  }

  /**
   * Decrypt a batch of messages for a conversation
   */
  static async decryptMessages(
    messages: EncryptedMessagePayload[],
    conversation: Conversation,
    currentUserId: string
  ): Promise<DecryptedMessage[]> {
    const myPrivateKeyJWK = await getStoredPrivateKey(currentUserId);
    const myPrivateKey = myPrivateKeyJWK ? await importPrivateKey(myPrivateKeyJWK) : null;

    const decryptedList: DecryptedMessage[] = [];

    for (const msg of messages) {
      try {
        let aesKey: CryptoKey | null = null;

        if (conversation.type === 'direct') {
          // In direct chat, the peer is either the sender (if received) or the other participant (if sent by me)
          const peer = conversation.participants?.find(p =>
            msg.sender_id === currentUserId ? p.id !== currentUserId : p.id === msg.sender_id
          );

          if (peer && myPrivateKey) {
            aesKey = await this.getSharedKeyForDirectChat(currentUserId, peer);
          }
        } else {
          // Group chat
          if (conversation.encrypted_group_key) {
            aesKey = await importAESKeyFromJWK(JSON.parse(conversation.encrypted_group_key));
          }
        }

        if (aesKey) {
          const plaintext = await decryptMessage(msg.encrypted_content, msg.iv, aesKey);
          decryptedList.push({
            ...msg,
            content: plaintext,
            is_encrypted: true,
          });
        } else {
          decryptedList.push({
            ...msg,
            content: '🔒 [End-to-End Encrypted Message]',
            is_encrypted: true,
            decryption_error: true,
          });
        }
      } catch (err) {
        console.warn(`Decryption error for message ${msg.id}:`, err);
        decryptedList.push({
          ...msg,
          content: '⚠️ [Unable to decrypt message - Key mismatch]',
          is_encrypted: true,
          decryption_error: true,
        });
      }
    }

    return decryptedList;
  }

  /**
   * Fetch and decrypt conversation messages
   */
  static async getConversationMessages(
    conversation: Conversation,
    currentUserId: string
  ): Promise<DecryptedMessage[]> {
    let encryptedList: EncryptedMessagePayload[] = [];

    if (!isSupabaseConfigured) {
      encryptedList = mockBackend.getMessages(conversation.id);
    } else {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
      encryptedList = (data || []) as EncryptedMessagePayload[];
    }

    return await this.decryptMessages(encryptedList, conversation, currentUserId);
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(conversationId: string, currentUserId: string): Promise<void> {
    if (!isSupabaseConfigured) {
      mockBackend.markMessagesAsRead(conversationId, currentUserId);
      return;
    }

    await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .neq('status', 'read');
  }

  /**
   * Send typing status
   */
  static sendTypingStatus(event: TypingEvent): void {
    if (!isSupabaseConfigured) {
      mockBackend.sendTypingStatus(event);
      return;
    }

    const channel = supabase.channel(`typing:${event.conversation_id}`);
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: event,
    });
  }
}
