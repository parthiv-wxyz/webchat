export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  phone_number?: string;
  avatar_url?: string;
  status?: string;
  public_key: JsonWebKey | string;
  is_online?: boolean;
  last_seen?: string;
  created_at?: string;
}

export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string; // For groups
  avatar_url?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Computed / joined fields:
  participants?: UserProfile[];
  last_message?: DecryptedMessage;
  unread_count?: number;
  encrypted_group_key?: string; // For groups: key encrypted for current user
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'member';
  encrypted_group_key?: string;
  joined_at: string;
  profile?: UserProfile;
}

export type MessageType = 'text' | 'image' | 'audio' | 'file';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface EncryptedMessagePayload {
  id: string;
  conversation_id: string;
  sender_id: string;
  encrypted_content: string; // Base64 ciphertext
  iv: string; // Base64 initialization vector
  message_type: MessageType;
  media_metadata?: {
    filename?: string;
    filesize?: number;
    mime_type?: string;
    width?: number;
    height?: number;
    duration?: number; // for audio voice notes
  };
  reply_to_id?: string;
  status: MessageStatus;
  created_at: string;
}

export interface DecryptedMessage extends Omit<EncryptedMessagePayload, 'encrypted_content'> {
  content: string; // Decrypted plaintext (or decrypted media base64 data URL)
  is_encrypted: boolean;
  decryption_error?: boolean;
}

export interface KeyPairJWK {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}

export interface TypingEvent {
  conversation_id: string;
  user_id: string;
  username: string;
  is_typing: boolean;
}
