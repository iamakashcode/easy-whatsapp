// Dynamic-value sources for template placeholders. Mirrors the server token
// resolver in server/services/templateSend.js so the live preview matches what
// actually gets sent. Each non-custom source maps to a {token} understood there.

export const VALUE_SOURCES = [
  { key: 'name',   label: "Contact's name", token: 'name', allowFallback: true },
  { key: 'custom', label: 'Custom text',    token: null,   allowFallback: false },
];

const sampleContact = { name: 'Rahul Sharma', phone: '+91 98765 43210' };

// Resolve a single token against a contact (with optional |fallback). Returns null
// for unknown tokens so the original text is left untouched (matches the server).
const resolveToken = (token, fallback, contact) => {
  const key = token.trim().toLowerCase();
  let val = '';
  if (key === 'first_name') val = (contact?.name || '').trim().split(/\s+/)[0] || '';
  else if (key === 'name')  val = contact?.name || '';
  else if (key === 'phone') val = contact?.phone || '';
  else return null;
  return val || fallback || '';
};

// Resolve all {token} / {token|fallback} occurrences in a param string for preview.
export const resolveTokens = (str, contact = sampleContact) =>
  String(str ?? '').replace(/\{([a-z_]+)(?:\|([^}]*))?\}/gi, (whole, token, fallback) => {
    const resolved = resolveToken(token, fallback, contact);
    return resolved === null ? whole : resolved;
  });

// Build the param string the backend expects from the picker's state.
export const buildParam = ({ source, customText, fallback }) => {
  if (source === 'custom' || !source) return customText || '';
  const def = VALUE_SOURCES.find((s) => s.key === source);
  if (!def?.token) return customText || '';
  return fallback?.trim() ? `{${def.token}|${fallback.trim()}}` : `{${def.token}}`;
};

// Parse an existing param string back into picker state (so values re-open correctly).
export const parseParam = (str) => {
  const m = String(str ?? '').match(/^\{([a-z_]+)(?:\|([^}]*))?\}$/i);
  if (m) {
    const key = m[1].toLowerCase();
    const def = VALUE_SOURCES.find((s) => s.token === key);
    if (def) return { source: def.key, customText: '', fallback: m[2] || '' };
  }
  return { source: 'custom', customText: str || '', fallback: '' };
};

export { sampleContact };
