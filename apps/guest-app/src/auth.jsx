import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, loadSession, saveSession, setUnauthorizedHandler } from './api.js';
import { mergeRequest, subscribeRequests } from './live.js';

const AuthContext = createContext(null);
const FAREWELL_KEY = 'apphotel.farewell';

const loadFarewell = () => {
  try {
    return JSON.parse(sessionStorage.getItem(FAREWELL_KEY)) ?? null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession('guest'));
  const [expired, setExpired] = useState(false);
  const [farewell, setFarewell] = useState(loadFarewell); // thông tin trả phòng để hiện lời cảm ơn
  const [requests, setRequests] = useState(null); // yêu cầu của phòng, cập nhật realtime
  const [stayVersion, setStayVersion] = useState(0); // tăng mỗi khi có sự kiện lưu trú (xin/huỷ trả phòng)

  const update = useCallback((next) => {
    saveSession(next, 'guest');
    setSession(next);
  }, []);

  /** Phiên hết hiệu lực (lễ tân đổi mã cửa...) -> về trang nhập mã. */
  const expire = useCallback(() => {
    update(null);
    setExpired(true);
  }, [update]);

  /** Lễ tân đã duyệt trả phòng -> xoá phiên, hiện trang cảm ơn. */
  const finishStay = useCallback(
    (event) => {
      const info = { roomNumber: event.roomNumber, guestName: event.guestName, total: event.folioTotal, at: event.at };
      try {
        sessionStorage.setItem(FAREWELL_KEY, JSON.stringify(info));
      } catch {
        /* bỏ qua */
      }
      setFarewell(info);
      update(null);
    },
    [update],
  );

  const dismissFarewell = () => {
    try {
      sessionStorage.removeItem(FAREWELL_KEY);
    } catch {
      /* bỏ qua */
    }
    setFarewell(null);
  };

  useEffect(() => {
    setUnauthorizedHandler(expire, 'guest');
  }, [expire]);

  // Kiểm tra lại phiên khi mở app (mã có thể đã bị lễ tân đổi/thu hồi)
  useEffect(() => {
    if (session?.token) api('/me').then((me) => update({ ...session, ...me })).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Một luồng realtime duy nhất cho cả app khách
  useEffect(() => {
    if (!session?.token) {
      setRequests(null);
      return undefined;
    }
    let alive = true;
    api('/me/requests')
      .then((list) => alive && setRequests(list))
      .catch(() => alive && setRequests([]));
    const unsubscribe = subscribeRequests('/me/events', {
      token: session.token,
      onRequest: (r) => setRequests((list) => mergeRequest(list ?? [], r)),
      onStay: () => setStayVersion((v) => v + 1),
      onCheckout: finishStay,
      onUnauthorized: expire,
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [session?.token, finishStay, expire]);

  const login = async (code) => {
    const data = await api('/auth/guest', { method: 'POST', body: JSON.stringify({ code }) });
    setExpired(false);
    dismissFarewell();
    update(data);
    return data;
  };

  const logout = async () => {
    await api('/auth/guest/logout', { method: 'POST' }).catch(() => {});
    update(null);
  };

  return (
    <AuthContext.Provider value={{ session, login, logout, expired, expire, requests, stayVersion, farewell, dismissFarewell }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Chặn các trang của khách khi chưa đăng nhập (hoặc vừa trả phòng). */
export function RequireGuest({ children }) {
  const { session, farewell } = useAuth();
  const location = useLocation();
  if (!session?.token) {
    return <Navigate to={farewell ? '/goodbye' : '/'} replace state={{ from: location.pathname }} />;
  }
  return children;
}
