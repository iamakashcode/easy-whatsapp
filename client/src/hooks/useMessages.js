import { useState, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export function useMessages() {
  const [messages, setMessages]     = useState([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(false);

  const fetchMessages = useCallback(async ({ page = 1, limit = 20, direction } = {}) => {
    setLoading(true);
    try {
      const { data } = await api.get('/messages', { params: { page, limit, direction } });
      setMessages(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConversation = useCallback(async (contactId, { page = 1, limit = 50 } = {}) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/messages/conversation/${contactId}`, { params: { page, limit } });
      setMessages(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      return data;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (payload) => {
    const { data } = await api.post('/messages/send', payload);
    return data;
  }, []);

  const sendBulk = useCallback(async (payload) => {
    const { data } = await api.post('/messages/send-bulk', payload);
    return data;
  }, []);

  return { messages, total, totalPages, loading, fetchMessages, fetchConversation, sendMessage, sendBulk };
}
