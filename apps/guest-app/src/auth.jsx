import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, loadSession, saveSession, setUnauthorizedHandler } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);
  const [expired, setExpired] = useState(false);

  const update = useCallback((next) => {
    saveSession(next);
    setSession(next);
  }, []);

  /** Phiên hết hiệu lực (lễ tân đổi mã cửa...) -> về trang nhập mã. */
  const expire = useCallback(() => {
    update(null);
    setExpired(true);
  }, [update]);

  useEffect(() => {
    setUnauthorizedHandler(expire);
  }, [expire]);

  // Kiểm tra lại phiên khi mở app (mã có thể đã bị lễ tân đổi/thu hồi)
  useEffect(() => {
    if (session?.token) api('/me').then((me) => update({ ...session, ...me })).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (code) => {
    const data = await api('/auth/guest', { method: 'POST', body: JSON.stringify({ code }) });
    setExpired(false);
    update(data);
    return data;
  };

  const logout = async () => {
    await api('/auth/guest/logout', { method: 'POST' }).catch(() => {});
    update(null);
  };

  return <AuthContext.Provider value={{ session, login, logout, expired, expire }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** Chặn các trang của khách khi chưa đăng nhập. */
export function RequireGuest({ children }) {
  const { session } = useAuth();
  const location = useLocation();
  if (!session?.token) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  return children;
}
