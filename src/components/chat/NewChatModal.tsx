'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { ChatService } from '@/lib/chatService';
import {
  X,
  Search,
  ShieldCheck,
  UserPlus,
  Loader2,
  Phone,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  MessageSquare,
  Users,
} from 'lucide-react';

interface NewChatModalProps {
  onClose: () => void;
}

export function NewChatModal({ onClose }: NewChatModalProps) {
  const { currentUser } = useAuth();
  const { startDirectChat } = useChat();

  const [activeTab, setActiveTab] = useState<'phone' | 'contacts'>('phone');

  // Phone search states
  const [phoneInput, setPhoneInput] = useState('');
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [searchedUser, setSearchedUser] = useState<UserProfile | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Contacts browse states
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [startingChatWith, setStartingChatWith] = useState<string | null>(null);

  useEffect(() => {
    async function loadContacts() {
      if (!currentUser) return;
      try {
        setLoadingContacts(true);
        const contactList = await ChatService.getAllUsers(currentUser.id);
        setUsers(contactList);
      } catch (err) {
        console.error('Failed to load contacts:', err);
      } finally {
        setLoadingContacts(false);
      }
    }
    loadContacts();
  }, [currentUser]);

  // Lookup user by phone number (only returns profile if they created one)
  const handleSearchByPhone = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phoneInput.trim() || !currentUser) return;

    setIsSearchingPhone(true);
    setSearchAttempted(true);
    setSearchedUser(null);

    try {
      const found = await ChatService.findUserByPhone(phoneInput.trim());
      setSearchedUser(found);
    } catch (err) {
      console.error('Phone lookup failed:', err);
      setSearchedUser(null);
    } finally {
      setIsSearchingPhone(false);
    }
  };

  const handleSelectUser = async (target: UserProfile) => {
    try {
      setStartingChatWith(target.id);
      await startDirectChat(target);
      onClose();
    } catch (err) {
      alert(`Could not start chat: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setStartingChatWith(null);
    }
  };

  const handleCopyInvite = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.origin);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    }
  };

  const isSelfPhone =
    searchedUser?.id === currentUser?.id ||
    (currentUser?.phone_number &&
      phoneInput.replace(/[\s\-().]/g, '') === currentUser.phone_number.replace(/[\s\-().]/g, ''));

  const filteredUsers = users.filter(
    u =>
      u.display_name.toLowerCase().includes(contactSearch.toLowerCase()) ||
      u.username.toLowerCase().includes(contactSearch.toLowerCase()) ||
      (u.phone_number && u.phone_number.includes(contactSearch))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-2xl overflow-hidden text-gray-200">
        {/* Header */}
        <div className="bg-[#202c33] px-5 py-4 flex items-center justify-between border-b border-[#2a3942]">
          <div className="flex items-center gap-2 text-gray-100 font-semibold text-base">
            <UserPlus className="w-5 h-5 text-[#00a884]" />
            New Encrypted Conversation
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-[#2a3942] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#222d34] bg-[#111b21]">
          <button
            onClick={() => setActiveTab('phone')}
            className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'phone'
                ? 'text-[#00a884] border-b-2 border-[#00a884] bg-[#182229]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            Chat by Mobile Number
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-3 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'contacts'
                ? 'text-[#00a884] border-b-2 border-[#00a884] bg-[#182229]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Browse Contacts ({users.length})
          </button>
        </div>

        {/* TAB 1: Chat by Mobile Number */}
        {activeTab === 'phone' && (
          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            <form onSubmit={handleSearchByPhone} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Recipient&apos;s Mobile Number
                </label>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      autoFocus
                      required
                      placeholder="+1 (555) 010-0002 or +91 9876543210"
                      value={phoneInput}
                      onChange={e => {
                        setPhoneInput(e.target.value);
                        setSearchAttempted(false);
                      }}
                      className="w-full pl-9 pr-3 py-2.5 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#00a884]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSearchingPhone || !phoneInput.trim()}
                    className="px-4 py-2.5 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
                  >
                    {isSearchingPhone ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" /> Search
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick suggestions for testing */}
              <div className="bg-[#182229] p-2.5 rounded-lg border border-[#2a3942] text-[11px] text-gray-400 space-y-1.5">
                <div className="font-medium text-gray-300">💡 Quick demo numbers to try:</div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: 'Alice', phone: '+1 555 010 0001' },
                    { name: 'Bob', phone: '+1 555 010 0002' },
                    { name: 'Charlie', phone: '+1 555 010 0003' },
                  ].map(item => (
                    <button
                      key={item.phone}
                      type="button"
                      onClick={() => {
                        setPhoneInput(item.phone);
                        ChatService.findUserByPhone(item.phone).then(u => {
                          setSearchedUser(u);
                          setSearchAttempted(true);
                        });
                      }}
                      className="px-2 py-0.5 bg-[#202c33] hover:bg-[#2a3942] text-gray-300 rounded text-[10px] font-mono border border-[#2a3942] cursor-pointer"
                    >
                      {item.name}: {item.phone}
                    </button>
                  ))}
                </div>
              </div>
            </form>

            {/* Results Section */}
            {searchAttempted && !isSearchingPhone && (
              <div className="pt-1">
                {isSelfPhone ? (
                  /* Self warning */
                  <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl text-center space-y-2">
                    <AlertCircle className="w-7 h-7 text-amber-400 mx-auto" />
                    <div className="text-sm font-semibold text-amber-200">This is your own mobile number</div>
                    <p className="text-xs text-amber-300/80">
                      You are logged in with this number. You can only start encrypted chats with other users.
                    </p>
                  </div>
                ) : searchedUser ? (
                  /* Profile Found & Verified */
                  <div className="bg-[#182229] border border-[#00a884]/40 rounded-xl p-4 shadow-lg space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#2a3942]">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#00a884]">
                        <CheckCircle2 className="w-4 h-4 text-[#00a884]" />
                        Active Profile Found
                      </div>
                      <span className="text-[10px] text-gray-400 bg-[#202c33] px-2 py-0.5 rounded-full border border-[#2a3942]">
                        ECDH P-256 E2EE
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {searchedUser.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={searchedUser.avatar_url}
                            alt={searchedUser.display_name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-[#00a884]"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-[#202c33] flex items-center justify-center font-bold text-lg text-gray-200">
                            {searchedUser.display_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {searchedUser.is_online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] rounded-full border-2 border-[#182229]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-base font-bold text-gray-100 truncate">
                          {searchedUser.display_name}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          @{searchedUser.username}
                        </div>
                        <div className="text-xs text-[#00a884] font-medium flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {searchedUser.phone_number || phoneInput}
                        </div>
                        {searchedUser.status && (
                          <div className="text-[11px] text-gray-400 truncate mt-1 italic">
                            &ldquo;{searchedUser.status}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={startingChatWith === searchedUser.id}
                      onClick={() => handleSelectUser(searchedUser)}
                      className="w-full py-2.5 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      {startingChatWith === searchedUser.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Starting Chat...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-4 h-4" /> Start End-to-End Encrypted Chat
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Profile NOT Found */
                  <div className="bg-[#182229] border border-amber-800/40 rounded-xl p-5 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-amber-950/50 flex items-center justify-center mx-auto text-amber-400 border border-amber-800/50">
                      <AlertCircle className="w-6 h-6" />
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-100">
                        No Profile Found for {phoneInput}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        This user has not created a WhatsApp Live profile yet. In end-to-end encrypted messaging, chats can only be initiated with users who have published their public encryption keys.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleCopyInvite}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#202c33] hover:bg-[#2a3942] text-xs font-medium text-gray-200 rounded-lg border border-[#2a3942] transition-colors cursor-pointer"
                      >
                        {inviteCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#00a884]" /> Copied Invite Link
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Invite User to Create Profile
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Browse All Contacts */}
        {activeTab === 'contacts' && (
          <div>
            {/* Search filter in contacts */}
            <div className="p-3 border-b border-[#222d34] bg-[#111b21]">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter contacts by name, @username, or phone..."
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#00a884]"
                />
              </div>
            </div>

            {/* Contacts list */}
            <div className="max-h-80 overflow-y-auto divide-y divide-[#222d34]">
              {loadingContacts ? (
                <div className="p-8 flex flex-col items-center justify-center text-gray-400 text-xs gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#00a884]" />
                  Loading registered profiles...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  {contactSearch ? 'No contacts match your filter.' : 'No other registered contacts found.'}
                </div>
              ) : (
                filteredUsers.map(user => (
                  <button
                    key={user.id}
                    disabled={startingChatWith === user.id}
                    onClick={() => handleSelectUser(user)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-[#202c33] transition-colors text-left disabled:opacity-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {user.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.avatar_url}
                            alt={user.display_name}
                            className="w-10 h-10 rounded-full object-cover border border-[#2a3942]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#2a3942] flex items-center justify-center text-sm font-semibold text-gray-300">
                            {user.display_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {user.is_online && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00a884] rounded-full border-2 border-[#111b21]" />
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-medium text-gray-100">{user.display_name}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-2">
                          <span>@{user.username}</span>
                          {user.phone_number && (
                            <span className="text-[#00a884] flex items-center gap-0.5 font-mono text-[11px]">
                              <Phone className="w-2.5 h-2.5" />
                              {user.phone_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#00a884] bg-[#00a884]/10 px-2 py-1 rounded-full border border-[#00a884]/20">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>E2EE</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
