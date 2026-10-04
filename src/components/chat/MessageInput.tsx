'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import {
  Smile,
  Paperclip,
  Mic,
  Send,
  X,
  Trash2,
  Image as ImageIcon,
  FileText,
  StopCircle,
} from 'lucide-react';

const COMMON_EMOJIS = [
  '😀', '😂', '😍', '🔥', '👍', '🙏', '❤️', '🎉',
  '😎', '🤔', '🙌', '✨', '🚀', '💯', '👏', '🔒',
  '🥳', '🤩', '💡', '💬', '👀', '🤝', '⚡', '☕'
];

export function MessageInput() {
  const { sendMessage, setTyping } = useChat();
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle typing presence broadcast
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  };

  const handleSendText = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText('');
    setTyping(false);
    setShowEmojiPicker(false);
    setShowAttachmentMenu(false);
    await sendMessage(content, 'text');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const insertEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
    textareaRef.current?.focus();
  };

  // Handle File / Image upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setShowAttachmentMenu(false);

    // Read file as Base64 Data URL
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const isImage = file.type.startsWith('image/');
      const messageType = isImage ? 'image' : 'file';

      await sendMessage(dataUrl, messageType, {
        filename: file.name,
        filesize: file.size,
        mime_type: file.type,
      });
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  // Start Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch {
      alert('Microphone access was denied or is not supported.');
    }
  };

  // Cancel Recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
  };

  // Send Recorded Voice Note
  const finishAndSendRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        await sendMessage(base64Audio, 'audio', {
          duration: recordingDuration,
          mime_type: 'audio/webm',
        });
      };
      reader.readAsDataURL(audioBlob);

      mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      if (recordIntervalRef.current) {
        clearInterval(recordIntervalRef.current);
        recordIntervalRef.current = null;
      }
      setIsRecording(false);
      setRecordingDuration(0);
      audioChunksRef.current = [];
    };

    mediaRecorderRef.current.stop();
  };

  useEffect(() => {
    return () => {
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  return (
    <div className="relative bg-[#202c33] px-3 py-2 border-t border-[#2a3942] flex items-end gap-2 text-gray-300">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="absolute bottom-14 left-4 bg-[#111b21] border border-[#2a3942] rounded-2xl p-3 shadow-2xl z-30 w-72">
          <div className="flex justify-between items-center mb-2 pb-1 border-b border-[#2a3942]">
            <span className="text-xs font-medium text-gray-300">Emojis</span>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="text-gray-400 hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1.5 text-lg">
            {COMMON_EMOJIS.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="hover:scale-125 transition-transform p-1 rounded hover:bg-[#202c33] cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachment Menu Popup */}
      {showAttachmentMenu && (
        <div className="absolute bottom-14 left-12 bg-[#111b21] border border-[#2a3942] rounded-2xl p-2 shadow-2xl z-30 space-y-1 w-48 text-xs">
          <button
            type="button"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = 'image/*';
                fileInputRef.current.click();
              }
            }}
            className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#202c33] rounded-lg transition-colors text-left cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <ImageIcon className="w-4 h-4" />
            </div>
            <span>Photos & Videos</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = '*/*';
                fileInputRef.current.click();
              }
            }}
            className="w-full px-3 py-2 flex items-center gap-2.5 hover:bg-[#202c33] rounded-lg transition-colors text-left cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <span>Document</span>
          </button>
        </div>
      )}

      {/* Voice Recording Active Bar */}
      {isRecording ? (
        <div className="flex-1 flex items-center justify-between bg-[#111b21] px-4 py-2 rounded-xl border border-red-500/30">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono text-white">
              Recording {Math.floor(recordingDuration / 60)}:
              {(recordingDuration % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="p-1.5 text-gray-400 hover:text-red-400 rounded-full transition-colors cursor-pointer"
              title="Cancel recording"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={finishAndSendRecording}
              className="px-3 py-1 bg-[#00a884] hover:bg-[#008f6f] text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <StopCircle className="w-3.5 h-3.5" />
              Send
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Action buttons on left */}
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachmentMenu(false);
            }}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              showEmojiPicker ? 'text-[#00a884]' : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAttachmentMenu(!showAttachmentMenu);
              setShowEmojiPicker(false);
            }}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              showAttachmentMenu ? 'text-[#00a884]' : 'text-gray-400 hover:text-gray-200'
            }`}
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message (End-to-End Encrypted)..."
            className="flex-1 bg-[#2a3942] text-sm text-gray-100 placeholder-gray-400 rounded-xl px-4 py-2.5 resize-none focus:outline-none max-h-32 min-h-[42px]"
          />

          {/* Send or Voice Note Button */}
          {text.trim() ? (
            <button
              type="button"
              onClick={handleSendText}
              className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-md"
              title="Send message"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="w-10 h-10 rounded-full bg-[#2a3942] hover:bg-[#374248] text-gray-300 flex items-center justify-center transition-colors cursor-pointer"
              title="Record voice note"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
