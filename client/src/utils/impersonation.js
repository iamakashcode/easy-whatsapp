// Lets an admin view the app as a customer. The admin's own token is stashed so we can restore it.
const ADMIN_KEY = 'adminToken';
const NAME_KEY = 'impersonating';

export const startImpersonation = (clientToken, clientName) => {
  const adminToken = localStorage.getItem('token');
  if (adminToken) localStorage.setItem(ADMIN_KEY, adminToken);
  localStorage.setItem('token', clientToken);
  localStorage.setItem(NAME_KEY, clientName || 'client');
};

export const isImpersonating = () => !!localStorage.getItem(NAME_KEY);
export const impersonatedName = () => localStorage.getItem(NAME_KEY);

export const stopImpersonation = () => {
  const adminToken = localStorage.getItem(ADMIN_KEY);
  if (adminToken) localStorage.setItem('token', adminToken);
  localStorage.removeItem(ADMIN_KEY);
  localStorage.removeItem(NAME_KEY);
};
