import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import QueuePage from './pages/QueuePage.jsx';
import Placeholder from './pages/Placeholder.jsx';
import Login from './pages/Login.jsx';
import KnowledgeBase from './pages/KnowledgeBase.jsx';
import { RequireStaff } from './staff.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireStaff>
            <Layout />
          </RequireStaff>
        }
      >
        <Route index element={<Navigate to="/rooms" replace />} />
        <Route path="/rooms" element={<Dashboard />} />
        <Route path="/kitchen" element={<QueuePage department="kitchen" />} />
        <Route path="/housekeeping" element={<QueuePage department="housekeeping" />} />
        <Route path="/knowledge" element={<KnowledgeBase />} />
        <Route path="/analytics" element={<Placeholder titleKey="page.analytics" branchKey="page.afterMvp" />} />
        <Route path="*" element={<Placeholder titleKey="page.notFound" />} />
      </Route>
    </Routes>
  );
}
