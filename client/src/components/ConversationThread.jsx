import { useEffect, useRef } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

const statusIcon = (status) => {
  const base = 'w-3.5 h-3.5 inline-block ml-1';
  if (status === 'read')      return <span className={`${base} text-blue-400`}>✓✓</span>;
  if (status === 'delivered') return <span className={`${base} text-gray-400`}>✓✓</span>;
  if (status === 'sent')      return <CheckIcon className={`${base} text-gray-400`} />;
  if (status === 'failed')    return <span className={`${base} text-red-400`}>✕</span>;
  return null;
};

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

// WhatsApp-style date separator label: Today / Yesterday / full date.
const formatDateLabel = (dateStr) => {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today))     return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
};

// Stable per-day key to decide when to insert a date separator.
const dayKey = (dateStr) => new Date(dateStr).toDateString();

export default function ConversationThread({ messages, loading, contactId }) {
  const containerRef = useRef(null);
  const bottomRef = useRef(null);
  const prevCount = useRef(0);
  const prevContact = useRef(null);
  // Tracks whether the user is parked at the bottom. Updated on scroll, so a
  // background poll refresh never yanks them down while they read old messages.
  const atBottom = useRef(true);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  useEffect(() => {
    if (!messages.length) return;
    const contactChanged = prevContact.current !== contactId;
    const isInitialLoad  = prevContact.current === null || contactChanged;
    const grew           = messages.length > prevCount.current;

    if (isInitialLoad) {
      // Jump to the latest message when opening a conversation.
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
      atBottom.current = true;
    } else if (grew && atBottom.current) {
      // New message arrived while already at the bottom → follow it.
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    // Otherwise (poll refresh with no new messages, or user scrolled up) do nothing.

    prevContact.current = contactId;
    prevCount.current = messages.length;
  }, [messages, contactId]);

  if (loading && !messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-whatsapp-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No messages yet. Say hello! 👋
      </div>
    );
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
      {messages.map((msg, i) => {
        const isOut = msg.direction === 'OUTBOUND';
        const ts = msg.sentAt || msg.createdAt;
        const prev = messages[i - 1];
        const showDate = !prev || dayKey(ts) !== dayKey(prev.sentAt || prev.createdAt);
        return (
          <div key={msg.id}>
            {showDate && (
              <div className="flex justify-center my-3">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200/80 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 shadow-sm">
                  {formatDateLabel(ts)}
                </span>
              </div>
            )}
            <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                isOut
                  ? 'bg-whatsapp-light dark:bg-whatsapp-teal/30 text-gray-900 dark:text-white rounded-br-sm'
                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.body}</p>
              {isOut && msg.status === 'failed' && msg.error && (
                <p className="text-xs mt-1 text-red-500 flex items-start gap-1">
                  <span>⚠</span>
                  <span>{msg.error}</span>
                </p>
              )}
              <p className={`text-xs mt-0.5 ${isOut ? 'text-right' : 'text-left'} text-gray-400 dark:text-gray-400`}>
                {formatTime(msg.sentAt || msg.createdAt)}
                {isOut && (
                  <span title={msg.status === 'failed' ? (msg.error || 'Message failed') : msg.status}>
                    {statusIcon(msg.status)}
                  </span>
                )}
              </p>
            </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
