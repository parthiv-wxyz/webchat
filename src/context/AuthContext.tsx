'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserProfile } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { mockBackend, initializeMockData } from '@/lib/mockBackend';
import { generateECDHKeyPair } from '@/lib/crypto';
import { storePrivateKey, getStoredPrivateKey } from '@/lib/keyStore';

interface AuthContextType {
  currentUser: UserProfile | null;
  isLoading: boolean;
  isSupabase: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, displayName: string, phoneNumber?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchMockUser: (user: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session and cryptographic keys
  const initAuth = useCallback(async () => {
    try {
      if (!isSupabaseConfigured) {
        await initializeMockData();
        const user = mockBackend.getCurrentUser();
        setCurrentUser(user);
        setIsLoading(false);
        return;
      }

      // Live Supabase flow
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          // Check if device has private key
          const existingPK = await getStoredPrivateKey(session.user.id);
          if (!existingPK) {
            // Generate new ECDH key pair on this device and update public key
            const { publicKeyJWK, privateKeyJWK } = await generateECDHKeyPair();
            await storePrivateKey(session.user.id, privateKeyJWK);
            await supabase
              .from('profiles')
              .update({ public_key: publicKeyJWK })
              .eq('id', session.user.id);
            profile.public_key = publicKeyJWK;
          }
          setCurrentUser(profile as UserProfile);
        }
      }
    } catch (err) {
      console.error('Failed to initialize auth state:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      initAuth();
    }, 0);

    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        } else if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profile) {
            setCurrentUser(profile as UserProfile);
          }
        }
      });

      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    }

    return () => clearTimeout(timer);
  }, [initAuth]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured) {
        const users = mockBackend.getUsers();
        const cleanedInput = email.replace(/[\s\-().]/g, '');
        const match = users.find(u =>
          u.username.toLowerCase() === email.toLowerCase() ||
          email.startsWith(u.username) ||
          (u.phone_number && u.phone_number.replace(/[\s\-().]/g, '') === cleanedInput)
        );
        if (match) {
          mockBackend.setCurrentUser(match);
          setCurrentUser(match);
          return;
        }
        throw new Error('User not found. Try logging in with username (@alice), email, or mobile number (+15550100001)!');
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile) {
          const pk = await getStoredPrivateKey(data.user.id);
          if (!pk) {
            const { publicKeyJWK, privateKeyJWK } = await generateECDHKeyPair();
            await storePrivateKey(data.user.id, privateKeyJWK);
            await supabase
              .from('profiles')
              .update({ public_key: publicKeyJWK })
              .eq('id', data.user.id);
            profile.public_key = publicKeyJWK;
          }
          setCurrentUser(profile as UserProfile);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    displayName: string,
    phoneNumber?: string
  ) => {
    setIsLoading(true);
    try {
      const { publicKeyJWK, privateKeyJWK } = await generateECDHKeyPair();

      if (!isSupabaseConfigured) {
        const newUser = await mockBackend.registerUser(username, displayName, publicKeyJWK, phoneNumber);
        await storePrivateKey(newUser.id, privateKeyJWK);
        setCurrentUser(newUser);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Sign up failed');
      }

      await storePrivateKey(authData.user.id, privateKeyJWK);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username: username.toLowerCase().trim(),
          display_name: displayName.trim(),
          phone_number: phoneNumber?.trim() || null,
          public_key: publicKeyJWK,
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
          status: 'Hey there! I am using WhatsApp Live.',
          is_online: true,
        })
        .select()
        .single();

      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      setCurrentUser(profileData as UserProfile);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured) {
        mockBackend.setCurrentUser(null);
        setCurrentUser(null);
        return;
      }
      await supabase.auth.signOut();
      setCurrentUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMockUser = (user: UserProfile) => {
    mockBackend.setCurrentUser(user);
    setCurrentUser(user);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;

    if (!isSupabaseConfigured) {
      const updated = mockBackend.updateUserProfile(currentUser.id, updates);
      setCurrentUser(updated);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', currentUser.id)
      .select()
      .single();

    if (error) throw error;
    if (data) {
      setCurrentUser(data as UserProfile);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        isSupabase: isSupabaseConfigured,
        login,
        signUp,
        logout,
        switchMockUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
