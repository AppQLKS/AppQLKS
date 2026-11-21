import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RoomGrid from './pages/RoomGrid.jsx';
import Placeholder from './pages/Placeholder.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/rooms" replace />} />
        <Route path="/rooms" element={<RoomGrid />} />
        <Route path="/kitchen" element={<Placeholder title="F&B Kitchen Orders" branch="feature/staff-web-portal" />} />
        <Route path="/housekeeping" element={<Placeholder title="Housekeeping Queue" branch="feature/staff-web-portal" />} />
        <Route path="/knowledge" element={<Placeholder title="AI Knowledge Base" branch="feature/ai-chatbot" />} />
        <Route path="/analytics" element={<Placeholder title="Analytics & Reports" branch="(sau MVP)" />} />
        <Route path="*" element={<Placeholder title="Không tìm thấy trang" />} />
      </Route>
    </Routes>
  );
}
