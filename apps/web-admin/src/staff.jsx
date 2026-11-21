import { createContext, useContext, useState } from 'react';

// Vai trò demo cho tới khi có đăng nhập nhân viên thật (feature/staff-web-portal)
export const ROLES = [
  { role: 'Reception', id: 'RC-01', name: 'Maya Lin' },
  { role: 'Kitchen', id: 'KT-02', name: 'Marco Rossi' },
  { role: 'Housekeeping', id: 'HK-05', name: 'Soraia Silva' },
  { role: 'Manager', id: 'MG-01', name: 'David Park' },
];

const StaffContext = createContext(null);

export function StaffProvider({ children }) {
  const [staff, setStaff] = useState(ROLES[0]);
  return <StaffContext.Provider value={{ staff, setStaff }}>{children}</StaffContext.Provider>;
}

export const useStaff = () => useContext(StaffContext);
