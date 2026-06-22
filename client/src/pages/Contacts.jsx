import { useEffect, useState, useCallback } from 'react';
import { PlusIcon, ArrowUpTrayIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useContacts } from '../hooks/useContacts';
import ContactForm from '../components/ContactForm';
import CSVImport from '../components/CSVImport';
import Pagination from '../components/Pagination';

export default function Contacts() {
  const { contacts, total, totalPages, loading, fetchContacts, createContact, updateContact, deleteContact, importCSV } = useContacts();

  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [tagFilter, setTagFilter]     = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [showImport, setShowImport]   = useState(false);
  const [editContact, setEditContact] = useState(null);

  const load = useCallback(() => {
    fetchContacts({ page, search, tag: tagFilter });
  }, [page, search, tagFilter, fetchContacts]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (formData) => {
    try {
      if (editContact) {
        await updateContact(editContact.id, formData);
        toast.success('Contact updated');
      } else {
        await createContact(formData);
        toast.success('Contact added');
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save contact');
      throw err;
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this contact?')) return;
    try {
      await deleteContact(id);
      toast.success('Contact deleted');
      load();
    } catch {
      toast.error('Failed to delete contact');
    }
  };

  const handleImport = async (file) => {
    const res = await importCSV(file);
    toast.success(
      `Imported ${res.imported} contact${res.imported === 1 ? '' : 's'}` +
      (res.skipped ? ` · skipped ${res.skipped} (duplicate or already saved)` : '')
    );
    load();
    return res;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contacts</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{total} contacts total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="btn-secondary">
            <ArrowUpTrayIcon className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={() => { setEditContact(null); setShowForm(true); }} className="btn-primary">
            <PlusIcon className="w-4 h-4" /> Add Contact
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <input
          className="input w-48"
          placeholder="Filter by tag…"
          value={tagFilter}
          onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-3 border-whatsapp-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <UserGroupEmptyState />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Tags</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Notes</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{c.phone}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags?.map((tag) => (
                          <span key={tag} className="badge bg-whatsapp-green/10 text-whatsapp-teal dark:text-whatsapp-green text-xs">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{c.notes || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => { setEditContact(c); setShowForm(true); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-whatsapp-teal hover:bg-whatsapp-green/10 transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>

      {showForm && (
        <ContactForm
          contact={editContact}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditContact(null); }}
        />
      )}
      {showImport && (
        <CSVImport onImport={handleImport} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}

function UserGroupEmptyState() {
  return (
    <div>
      <svg className="w-16 h-16 mx-auto mb-3 text-gray-200 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <p className="font-medium">No contacts found</p>
      <p className="text-sm mt-1">Add a contact or import from CSV to get started</p>
    </div>
  );
}
