import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../api/axios';
import { useMessages } from '../hooks/useMessages';
import { usePolling } from '../hooks/usePolling';
import ConversationThread from '../components/ConversationThread';
import MessageComposer from '../components/MessageComposer';

export default function Inbox() {
  const [contacts, setContacts]         = useState([]);
  const [selectedContact, setSelected]  = useState(null);
  const [conversation, setConversation] = useState([]);
  const [search, setSearch]             = useState('');
  const [convLoading, setConvLoading]   = useState(false);
  const [sending, setSending]           = useState(false);

  // unreadCounts: { [contactId]: totalInboundCount } from server
  const [unreadCounts, setUnreadCounts] = useState({});
  // seenCounts: { [contactId]: inbound count at time user last opened that contact }
  const seenCounts = useRef(
    JSON.parse(localStorage.getItem('wa_seen_counts') || '{}')
  );

  const { sendMessage } = useMessages();

  const loadContacts = useCallback(async () => {
    try {
      const { data } = await api.get('/contacts', { params: { limit: 100, search } });
      setContacts(data.data);
    } catch { /* silent */ }
  }, [search]);

  const loadConversation = useCallback(async () => {
    if (!selectedContact) return;
    setConvLoading(true);
    try {
      const { data } = await api.get(`/messages/conversation/${selectedContact.id}`, { params: { limit: 100 } });
      setConversation(data.data);
    } catch { /* silent */ } finally {
      setConvLoading(false);
    }
  }, [selectedContact]);

  const loadUnreadCounts = useCallback(async () => {
    try {
      const { data } = await api.get('/messages/unread-counts');
      setUnreadCounts(data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);
  useEffect(() => { loadConversation(); }, [loadConversation]);
  useEffect(() => { loadUnreadCounts(); }, [loadUnreadCounts]);

  usePolling(loadContacts,      5000, true);
  usePolling(loadConversation,  3000, !!selectedContact);
  usePolling(loadUnreadCounts,  4000, true);

  const handleSelectContact = (c) => {
    setSelected(c);
    // Mark as seen: store current total count as seen
    const updated = { ...seenCounts.current, [c.id]: unreadCounts[c.id] || 0 };
    seenCounts.current = updated;
    localStorage.setItem('wa_seen_counts', JSON.stringify(updated));
  };

  // Badge = inbound messages minus how many were there when user last opened this contact
  const getBadge = (contactId) => {
    const total = unreadCounts[contactId] || 0;
    const seen  = seenCounts.current[contactId] || 0;
    return Math.max(0, total - seen);
  };

  const handleSend = async (body) => {
    if (!selectedContact) return;
    setSending(true);
    try {
      const msg = await sendMessage({ contactId: selectedContact.id, body, type: 'text' });
      setConversation((prev) => [...prev, msg]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const filteredContacts = contacts
    .filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    )
    .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

  return (
    <div className="flex gap-0 h-[calc(100vh-7rem)] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Contact list */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9 text-sm"
              placeholder="Search contacts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No contacts found</p>
          ) : (
            filteredContacts.map((c) => {
              const badge = getBadge(c.id);
              const isSelected = selectedContact?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectContact(c)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 ${
                    isSelected ? 'bg-whatsapp-green/5 border-l-2 border-l-whatsapp-green' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-whatsapp-green/20 flex items-center justify-center text-whatsapp-teal dark:text-whatsapp-green font-bold text-sm">
                      {c.name[0]?.toUpperCase()}
                    </div>
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-whatsapp-green text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${badge > 0 ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-900 dark:text-white'}`}>
                      {c.name}
                    </p>
                    <p className={`text-xs truncate ${badge > 0 ? 'text-gray-700 dark:text-gray-300 font-medium' : 'text-gray-400'}`}>
                      {c.lastMessageBody || c.phone}
                    </p>
                  </div>
                  {badge > 0 && (
                    <span className="w-2 h-2 rounded-full bg-whatsapp-green flex-shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
        {selectedContact ? (
          <>
            <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-whatsapp-green/20 flex items-center justify-center text-whatsapp-teal dark:text-whatsapp-green font-bold text-sm">
                {selectedContact.name[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white text-sm">{selectedContact.name}</p>
                <p className="text-xs text-gray-400 font-mono">{selectedContact.phone}</p>
              </div>
            </div>

            <ConversationThread messages={conversation} loading={convLoading} contactId={selectedContact.id} />

            <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <MessageComposer onSend={handleSend} loading={sending} minRows={1} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-gray-400">
            <div>
              <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 opacity-30">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              <p className="font-medium">Select a contact</p>
              <p className="text-sm mt-1">Choose a contact to view conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
