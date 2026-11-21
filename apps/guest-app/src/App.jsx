import { Routes, Route } from 'react-router-dom';
import { BottomNav } from './components/ui.jsx';
import { RequireGuest } from './auth.jsx';
import Login from './pages/guest/Login.jsx';
import Home from './pages/guest/Home.jsx';
import Dining from './pages/guest/Dining.jsx';
import Housekeeping from './pages/guest/Housekeeping.jsx';
import Concierge from './pages/guest/Concierge.jsx';
import StaffLogin from './pages/staff/StaffLogin.jsx';
import TaskQueue from './pages/staff/TaskQueue.jsx';
import TaskDetail from './pages/staff/TaskDetail.jsx';
import ReceptionRooms from './pages/staff/ReceptionRooms.jsx';
import ShiftProfile from './pages/staff/ShiftProfile.jsx';
import { RequireStaff } from './staffAuth.jsx';
import Placeholder from './pages/Placeholder.jsx';

const GUEST_NAV = [
  { to: '/home', label: 'Home', icon: 'home' },
  { to: '/dining', label: 'Dining', icon: 'room_service' },
  { to: '/housekeeping', label: 'Suite Care', icon: 'cleaning_services' },
  { to: '/concierge', label: 'Concierge', icon: 'auto_awesome' },
];

export default function App() {
  return (
    <Routes>
      {/* Khách */}
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<RequireGuest><Home /><BottomNav items={GUEST_NAV} /></RequireGuest>} />
      <Route path="/dining" element={<RequireGuest><Dining /></RequireGuest>} />
      <Route path="/housekeeping" element={<RequireGuest><Housekeeping /></RequireGuest>} />
      <Route path="/concierge" element={<RequireGuest><Concierge /></RequireGuest>} />

      {/* Nhân viên (mobile) */}
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/staff/tasks" element={<RequireStaff><TaskQueue /></RequireStaff>} />
      <Route path="/staff/tasks/:id" element={<RequireStaff><TaskDetail /></RequireStaff>} />
      <Route path="/staff/rooms" element={<RequireStaff><ReceptionRooms /></RequireStaff>} />
      <Route path="/staff/profile" element={<RequireStaff><ShiftProfile /></RequireStaff>} />

      <Route path="*" element={<Placeholder title="Page not found" />} />
    </Routes>
  );
}
