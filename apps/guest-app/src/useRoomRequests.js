import { useAuth } from './auth.jsx';

/** Yêu cầu của phòng đang đăng nhập, tự cập nhật realtime (luồng nằm ở AuthProvider). */
export function useRoomRequests() {
  return useAuth().requests;
}
