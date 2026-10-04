'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { ChatService } from '@/lib/chatService';
import { X, Users, Search, Check, Loader2 } from 'lucide-react';

interface NewGroupModalProps {
  onClose: () => void;
}

export function NewGroupModal({ onClose }: NewGroupModalProps) {
  const { currentUser } = useAuth();
  const { createGroupChat } = useChat();
  const [name, setName] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadContacts() {
      if (!currentUser) return;
      try {
        setLoading(true);
        const contactList = await ChatService.getAllUsers(currentUser.id);
        setUsers(contactList);
      } catch (err) {
        console.error('Failed to load contacts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadContacts();
  }, [currentUser]);

  const toggleUser = (userId: string) => {
    setSelectedIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a group name');
      return;
    }
    if (selectedIds.length === 0) {
      alert('Please select at least 1 participant');
      return;
    }

    try {
      setIsSubmitting(true);
      await createGroupChat(name, selectedIds);
      onClose();
    } catch (err) {
      alert(`Failed to create group: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.display_name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-2xl overflow-hidden text-gray-200">
        {/* Header */}
        <div className="bg-[#202c33] px-5 py-4 flex items-center justify-between border-b border-[#2a3942]">
          <div className="flex items-center gap-2 text-gray-100 font-semibold">
            <Users className="w-5 h-5 text-[#00a884]" />
            New Encrypted Group
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-[#2a3942] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateGroup}>
          <div className="p-4 space-y-3 bg-[#111b21] border-b border-[#222d34]">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Group Subject</label>
              <input
                type="text"
                required
                placeholder="e.g. Project Alpha, Family..."
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#00a884]"
              />
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search participants..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#202c33] border border-[#2a3942] rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-[#00a884]"
              />
            </div>

            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>Select group members:</span>
              <span className="text-[#00a884] font-medium">{selectedIds.length} selected</span>
            </div>
          </div>

          {/* Members Checkbox List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-[#222d34]">
            {loading ? (
              <div className="p-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin text-[#00a884]" /> Loading contacts...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-400">No contacts available.</div>
            ) : (
              filteredUsers.map(user => {
                const isChecked = selectedIds.includes(user.id);
                return (
                  <button
                    type="button"
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#202c33] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2a3942] flex items-center justify-center text-xs font-semibold text-gray-200">
                        {user.display_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-100">{user.display_name}</div>
                        <div className="text-[11px] text-gray-400">@{user.username}</div>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isChecked
                          ? 'bg-[#00a884] border-[#00a884] text-white'
                          : 'border-[#2a3942] bg-[#202c33]'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-[#202c33] border-t border-[#2a3942]">
            <button
              type="submit"
              disabled={isSubmitting || selectedIds.length === 0 || !name.trim()}
              className="w-full py-2.5 bg-[#00a884] hover:bg-[#008f6f] disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {isSubmitting ? 'Creating Encrypted Group...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
