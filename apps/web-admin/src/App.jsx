import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import QueuePage from './pages/QueuePage.jsx';
import Placeholder from './pages/Placeholder.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/rooms" replace />} />
        <Route path="/rooms" element={<Dashboard />} />
        <Route path="/kitchen" element={<QueuePage department="kitchen" />} />
        <Route path="/housekeeping" element={<QueuePage department="housekeeping" />} />
        <Route path="/knowledge" element={<Placeholder title="AI Knowledge Base" branch="feature/ai-chatbot" />} />
        <Route path="/analytics" element={<Placeholder title="Analytics & Reports" branch="(after MVP)" />} />
        <Route path="*" element={<Placeholder title="Page not found" />} />
      </Route>
    </Routes>
  );
}
