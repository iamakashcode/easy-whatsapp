import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/axios';
import { isImpersonating, impersonatedName, stopImpersonation } from '../utils/impersonation';

// Context strip shown above the customer app: impersonation, admin-return, suspended, or a billing block.
export default function AccountBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const impersonating = isImpersonating();
  const [billing, setBilling] = useState(null);

  useEffect(() => {
    if (user?.role === 'CUSTOMER' || impersonating) {
      api.get('/billing').then((r) => setBilling(r.data)).catch(() => {});
    }
  }, [user, impersonating]);

  if (impersonating) {
    return (
      <div className="bg-amber-500 text-white text-sm px-4 py-2 flex items-center justify-between">
        <span>Viewing as <strong>{impersonatedName()}</strong> (admin impersonation)</span>
        <button
          onClick={() => { stopImpersonation(); window.location.href = '/admin'; }}
          className="underline font-medium"
        >
          Exit
        </button>
      </div>
    );
  }

  if (user?.status === 'SUSPENDED') {
    return (
      <div className="bg-red-600 text-white text-sm px-4 py-2 text-center">
        Your account is suspended — sending is disabled. Please contact the platform admin.
      </div>
    );
  }

  if (billing?.blocked) {
    return (
      <div className="bg-red-600 text-white text-sm px-4 py-2 flex items-center justify-between">
        <span>
          {billing.hasOverdue
            ? 'Sending paused — you have an unpaid invoice past its due date.'
            : 'Sending paused — you have reached your credit limit.'}
        </span>
        <button onClick={() => navigate('/billing')} className="underline font-medium">View billing</button>
      </div>
    );
  }

  if (user?.role === 'ADMIN') {
    return (
      <div className="bg-slate-900 text-slate-200 text-sm px-4 py-2 flex items-center justify-between">
        <span>You&apos;re viewing the customer app as an admin.</span>
        <button onClick={() => navigate('/admin')} className="underline font-medium">Back to Admin Console</button>
      </div>
    );
  }

  return null;
}
