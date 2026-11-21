import { useEffect, useState } from 'react';
import { api, loadSession } from './api.js';
import { useAuth } from './auth.jsx';
import { mergeRequest, subscribeRequests } from './live.js';

/** Yêu cầu của phòng đang đăng nhập, tự cập nhật realtime. */
export function useRoomRequests() {
  const { session, expire } = useAuth();
  const [requests, setRequests] = useState(null);

  useEffect(() => {
    let alive = true;
    api('/me/requests')
      .then((list) => alive && setRequests(list))
      .catch(() => alive && setRequests([]));

    const token = loadSession('guest')?.token;
    const unsubscribe = subscribeRequests('/me/events', {
      token,
      onRequest: (r) => setRequests((list) => mergeRequest(list ?? [], r)),
      onUnauthorized: expire,
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [session?.token]); // eslint-disable-line react-hooks/exhaustive-deps

  return requests;
}
