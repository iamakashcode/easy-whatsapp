import { useEffect, useRef, useState } from 'react';
import { CheckCircleIcon, UserCircleIcon, CameraIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../api/axios';

// Meta's business-profile category (vertical) enum, with friendly labels.
const VERTICALS = [
  ['', '— Select category —'],
  ['OTHER', 'Other'],
  ['PROF_SERVICES', 'Professional Services'],
  ['RETAIL', 'Retail'],
  ['ECOMMERCE', 'E-commerce'],
  ['EDU', 'Education'],
  ['FINANCE', 'Finance & Banking'],
  ['HEALTH', 'Medical & Health'],
  ['HOTEL', 'Hotel & Lodging'],
  ['RESTAURANT', 'Food & Restaurant'],
  ['TRAVEL', 'Travel & Transportation'],
  ['BEAUTY', 'Beauty, Spa & Salon'],
  ['APPAREL', 'Clothing & Apparel'],
  ['AUTO', 'Automotive'],
  ['ENTERTAIN', 'Entertainment'],
  ['EVENT_PLAN', 'Event Planning & Service'],
  ['GROCERY', 'Grocery & Convenience Store'],
  ['GOVT', 'Public Service'],
  ['NONPROFIT', 'Non-profit'],
];

const LIMITS = { about: 139, description: 512, address: 256, email: 128, website: 256 };

export default function BusinessProfileCard() {
  const [form, setForm] = useState({
    about: '', description: '', address: '', email: '', vertical: '', website1: '', website2: '',
  });
  const [picture, setPicture] = useState('');
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/settings/profile')
      .then(({ data }) => {
        setForm({
          about:       data.about || '',
          description: data.description || '',
          address:     data.address || '',
          email:       data.email || '',
          vertical:    data.vertical && data.vertical !== 'UNDEFINED' ? data.vertical : '',
          website1:    data.websites?.[0] || '',
          website2:    data.websites?.[1] || '',
        });
        // Prefer our own served copy — WhatsApp's pps.whatsapp.net URL often won't render in a browser.
        setPicture(data.profilePictureUrl || data.profile_picture_url || '');
      })
      .catch((err) => toast.error(err.response?.data?.error || 'Failed to load business profile'))
      .finally(() => setFetching(false));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Please choose a JPEG or PNG image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      // Don't set Content-Type manually — the browser must add the multipart boundary.
      const { data } = await api.post('/settings/profile/photo', fd);
      // Cache-bust so the avatar refreshes immediately after re-upload.
      const url = data.profilePictureUrl || data.profile_picture_url || '';
      setPicture(url ? `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}` : '');
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const { data } = await api.put('/settings/profile', {
        about:       form.about,
        description: form.description,
        address:     form.address,
        email:       form.email,
        vertical:    form.vertical || undefined,
        websites:    [form.website1, form.website2],
      });
      setPicture(data.profile_picture_url || '');
      toast.success('Business profile updated');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update business profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Change profile photo"
          className="relative group w-12 h-12 rounded-full bg-whatsapp-green/10 flex items-center justify-center overflow-hidden flex-shrink-0"
        >
          {picture
            ? <img src={picture} alt="Profile" className="w-12 h-12 object-cover" onError={() => setPicture('')} />
            : <UserCircleIcon className="w-7 h-7 text-whatsapp-green" />}
          <span className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            {uploading
              ? <span className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
              : <CameraIcon className="w-5 h-5 text-white" />}
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhoto} />
        <div>
          <h2 className="font-semibold">Business Profile</h2>
          <p className="text-xs text-gray-400">What customers see about your business on WhatsApp · tap photo to change</p>
        </div>
      </div>

      {fetching ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-whatsapp-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">About</label>
              <span className="text-xs text-gray-400">{form.about.length}/{LIMITS.about}</span>
            </div>
            <input
              className="input" maxLength={LIMITS.about} value={form.about} onChange={set('about')}
              placeholder="e.g. Building affordable websites for small businesses"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Description</label>
              <span className="text-xs text-gray-400">{form.description.length}/{LIMITS.description}</span>
            </div>
            <textarea
              className="input resize-none" rows={3} maxLength={LIMITS.description}
              value={form.description} onChange={set('description')}
              placeholder="A longer description of your business and services"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select className="input" value={form.vertical} onChange={set('vertical')}>
                {VERTICALS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email" className="input" maxLength={LIMITS.email}
                value={form.email} onChange={set('email')} placeholder="hello@business.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              className="input" maxLength={LIMITS.address} value={form.address} onChange={set('address')}
              placeholder="Street, city, state"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Website 1</label>
              <input
                type="url" className="input text-sm" maxLength={LIMITS.website}
                value={form.website1} onChange={set('website1')} placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website 2</label>
              <input
                type="url" className="input text-sm" maxLength={LIMITS.website}
                value={form.website2} onChange={set('website2')} placeholder="https://store.example.com"
              />
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Tip: use a square JPEG or PNG (at least 192×192) for the profile photo.
          </p>

          <div className="pt-1">
            <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Saving…
                </span>
              ) : saved ? (
                <span className="flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4" /> Saved!
                </span>
              ) : (
                'Save Business Profile'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
