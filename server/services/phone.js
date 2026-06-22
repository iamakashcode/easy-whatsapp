// Canonical phone format for the whole app: "+" followed by digits only (E.164-ish).
// Used by contact create/update/import AND the webhook, so a contact saved by any path matches the
// number Meta reports on inbound messages — no duplicate contacts, correct conversation threading.
const normalizePhone = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits ? '+' + digits : '';
};

module.exports = { normalizePhone };
