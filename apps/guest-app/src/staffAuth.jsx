import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { loadSession, saveSession, setUnauthorizedHandler, staffApi } from './api.js';

export const DEPARTMENT_LABEL = {
  reception: 'Reception',
  kitchen: 'Kitchen / F&B',
  housekeeping: 'Housekeeping',
  manager: 'Manager',
};

const StaffAuthContext = createContext(null);

export function StaffAuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession('staff'));
  const [expired, setExpired] = useState(false);

  const update = useCallback((next) => {
    saveSession(next, 'staff');
    setSession(next);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      update(null);
      setExpired(true);
    }, 'staff');
  }, [update]);

  useEffect(() => {
    if (session?.token) staffApi('/auth/staff/me').then(({ staff }) => update({ ...session, staff })).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async ({ login, password, department }) => {
    const data = await staffApi('/auth/staff', { method: 'POST', body: JSON.stringify({ login, password, department }) });
    setExpired(false);
    update(data);
    return data.staff;
  };

  const logout = async () => {
    await staffApi('/auth/staff/logout', { method: 'POST' }).catch(() => {});
    update(null);
  };

  return (
    <StaffAuthContext.Provider value={{ session, staff: session?.staff ?? null, login, logout, expired }}>
      {children}
    </StaffAuthContext.Provider>
  );
}

export const useStaffAuth = () => useContext(StaffAuthContext);

export function RequireStaff({ children }) {
  const { session } = useStaffAuth();
  const location = useLocation();
  if (!session?.token) return <Navigate to="/staff/login" replace state={{ from: location.pathname }} />;
  return children;
}

export const initialsOf = (name = '') => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
