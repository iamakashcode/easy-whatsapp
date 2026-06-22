import { useState, useRef, useEffect } from 'react';
import { FaceSmileIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import EmojiPicker from 'emoji-picker-react';

export default function MessageComposer({ onSend, loading, placeholder = 'Type a message…', minRows = 2, seedText, onTextChange, sendLabel }) {
  const [text, setText]           = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef(null);

  // Pre-fill the textarea when a template is selected, so the user can review/edit
  // before sending (the send button only enables when there is text).
  useEffect(() => {
    if (seedText) setText(seedText);
  }, [seedText]);

  // Let an optional parent mirror the text (e.g. for a live preview).
  useEffect(() => { onTextChange?.(text); }, [text, onTextChange]);

  const handleEmoji = (emojiData) => {
    const pos = textareaRef.current?.selectionStart ?? text.length;
    setText((t) => t.slice(0, pos) + emojiData.emoji + t.slice(pos));
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative">
      {showEmoji && (
        <div className="absolute bottom-full left-0 mb-2 z-10">
          <EmojiPicker onEmojiClick={handleEmoji} theme="auto" height={350} />
        </div>
      )}

      <div className="flex items-end gap-2 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
        <button
          type="button"
          onClick={() => setShowEmoji((s) => !s)}
          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-whatsapp-teal rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <FaceSmileIcon className="w-5 h-5" />
        </button>

        <textarea
          ref={textareaRef}
          rows={minRows}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 resize-none bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400
                     focus:outline-none leading-relaxed"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || loading}
          className={`flex-shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-whatsapp-green text-white font-semibold
                     disabled:opacity-40 hover:bg-whatsapp-teal active:scale-[0.98] transition-all ${sendLabel ? 'px-4 py-2 text-sm' : 'p-2'}`}
        >
          {loading
            ? <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            : <PaperAirplaneIcon className="w-4 h-4" />}
          {sendLabel && <span>{loading ? 'Sending…' : sendLabel}</span>}
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1 ml-1">Press Enter to send, Shift+Enter for new line</p>
    </div>
  );
}
