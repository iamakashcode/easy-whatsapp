import { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  // Platform-wide flag: whether clients are charged per message. Drives whether per-message cost UI
  // (spend, usage, Costs page) is shown anywhere in the customer app.
  const [usageBilling, setUsageBilling] = useState(true);

  const loadPlatform = () =>
    api.get('/platform/pricing')
      .then((r) => setUsageBilling(r.data.usageBillingEnabled !== false))
      .catch(() => {});

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then((r) => setUser(r.data))
      .catch((err) => {
        // Only drop the session for a genuinely invalid/expired token (401). Transient errors
        // (429 rate-limit, network blips, 5xx) must NOT log the user out.
        if (err.response?.status === 401) localStorage.removeItem('token');
      })
      .finally(() => setLoading(false));
    loadPlatform();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    loadPlatform();
    return data.user;
  };

  const register = async (username, email, password) => {
    const { data } = await api.post('/auth/register', { username, email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    loadPlatform();
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, usageBilling, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
