-- ==============================================================================
-- WhatsApp Live Encrypted Chat - Supabase Database Schema
-- Includes Tables, Row Level Security (RLS), Realtime Replication, & Triggers
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE
-- Holds public user profiles & ECDH Public Keys (JWK format)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    phone_number TEXT UNIQUE,
    avatar_url TEXT,
    status TEXT DEFAULT 'Hey there! I am using WhatsApp Live.',
    public_key JSONB NOT NULL, -- JWK of user's ECDH P-256 public key
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for searching users
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone_number);

-- 3. CONVERSATIONS TABLE
-- Direct (1-on-1) or Group conversations
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    name TEXT, -- Null for direct, string for group
    avatar_url TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CONVERSATION PARTICIPANTS
-- Maps users to conversations with roles and optional encrypted room keys
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    encrypted_group_key TEXT, -- Encrypted group room key for this user
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conv ON public.conversation_participants(conversation_id);

-- 5. MESSAGES TABLE
-- E2EE Encrypted messages. The database NEVER stores plaintext content!
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    encrypted_content TEXT NOT NULL, -- Base64 ciphertext (AES-256-GCM)
    iv TEXT NOT NULL,               -- Base64 initialization vector (12 bytes)
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'file')),
    media_metadata JSONB,           -- Optional: filename, filesize, duration
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at ASC);

-- 6. AUTOMATIC TIMESTAMP UPDATE TRIGGER
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET updated_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
CREATE TRIGGER on_message_inserted
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- 7. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- Conversations Policies
CREATE POLICY "Users can view conversations they are part of" 
ON public.conversations FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = public.conversations.id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Authenticated users can create conversations" 
ON public.conversations FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Participants can update conversation" 
ON public.conversations FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = public.conversations.id
        AND user_id = auth.uid()
    )
);

-- Participants Policies
CREATE POLICY "Users can view participants of their conversations" 
ON public.conversation_participants FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants cp2
        WHERE cp2.conversation_id = public.conversation_participants.conversation_id
        AND cp2.user_id = auth.uid()
    )
);

CREATE POLICY "Authenticated users can add participants" 
ON public.conversation_participants FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Messages Policies
CREATE POLICY "Users can view messages of their conversations" 
ON public.messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = public.messages.conversation_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can send messages to their conversations" 
ON public.messages FOR INSERT 
TO authenticated 
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = public.messages.conversation_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update message status (read receipts)" 
ON public.messages FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = public.messages.conversation_id
        AND user_id = auth.uid()
    )
);

-- 8. SUPABASE REALTIME REPLICATION SETUP
-- Enable Realtime for live encrypted messaging, typing, and read receipts
BEGIN;
  -- Add tables to realtime publication if not already included
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.messages, 
    public.conversations, 
    public.conversation_participants, 
    public.profiles;
COMMIT;

-- 9. STORAGE BUCKET FOR MEDIA (Optional)
-- Storage for encrypted media files if using Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;
