import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, loadSession, saveSession, setUnauthorizedHandler } from './api.js';

const StaffContext = createContext(null);

export function StaffProvider({ children }) {
  const [session, setSession] = useState(loadSession);
  const [expired, setExpired] = useState(false);

  const update = useCallback((next) => {
    saveSession(next);
    setSession(next);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      update(null);
      setExpired(true);
    });
  }, [update]);

  // Kiểm tra phiên còn hạn khi mở trang
  useEffect(() => {
    if (session?.token) api('/auth/staff/me').then(({ staff }) => update({ ...session, staff })).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (login, password) => {
    const data = await api('/auth/staff', { method: 'POST', body: JSON.stringify({ login, password }) });
    setExpired(false);
    update(data);
  };

  const logout = async () => {
    await api('/auth/staff/logout', { method: 'POST' }).catch(() => {});
    update(null);
  };

  const staff = session?.staff ?? null;
  const value = { session, staff, login, logout, expired };
  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}

export const useStaff = () => useContext(StaffContext);

export function RequireStaff({ children }) {
  const { session } = useStaff();
  const location = useLocation();
  if (!session?.token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
