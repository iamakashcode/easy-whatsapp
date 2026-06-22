import { useState, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export function useContacts() {
  const [contacts, setContacts]     = useState([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(false);

  const fetchContacts = useCallback(async ({ page = 1, limit = 20, search = '', tag = '' } = {}) => {
    setLoading(true);
    try {
      const { data } = await api.get('/contacts', { params: { page, limit, search, tag } });
      setContacts(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  const createContact = useCallback(async (payload) => {
    const { data } = await api.post('/contacts', payload);
    return data;
  }, []);

  const updateContact = useCallback(async (id, payload) => {
    const { data } = await api.put(`/contacts/${id}`, payload);
    return data;
  }, []);

  const deleteContact = useCallback(async (id) => {
    await api.delete(`/contacts/${id}`);
  }, []);

  const importCSV = useCallback(async (file) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/contacts/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }, []);

  return { contacts, total, totalPages, loading, fetchContacts, createContact, updateContact, deleteContact, importCSV };
}
