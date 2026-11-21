import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { StaffProvider } from './staff.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <StaffProvider>
        <App />
      </StaffProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
