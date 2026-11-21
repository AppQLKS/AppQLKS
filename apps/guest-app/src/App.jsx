import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import Dining from './pages/Dining.jsx';
import Placeholder from './pages/Placeholder.jsx';
import TabLayout from './components/TabLayout.jsx';

export default function App() {
  return (
    <div className="phone">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<TabLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/dining" element={<Dining />} />
          <Route path="/housekeeping" element={<Placeholder title="Housekeeping" branch="feature/housekeeping" />} />
          <Route path="/concierge" element={<Placeholder title="AI Concierge" branch="feature/ai-chatbot" />} />
          <Route path="/checkout" element={<Placeholder title="Express Checkout" branch="feature/express-checkout" />} />
        </Route>
        <Route path="*" element={<Placeholder title="Không tìm thấy trang" />} />
      </Routes>
    </div>
  );
}
