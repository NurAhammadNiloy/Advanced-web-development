import { BrowserRouter, Routes, Route } from "react-router-dom";

import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import HomePage from './pages/HomePage.jsx'
import RegisterPage from './pages/RegisterPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ResourcesPage from './pages/ResourcesPage.jsx'
import ReservationsPage from './pages/ReservationsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx';
import { useState, useCallback } from 'react';
import LegalPage from './pages/LegalPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ServerErrorPage from './pages/ServerErrorPage.jsx';

function App() {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'info', ms = 3000) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), ms);
  }, []);

  return (
    <BrowserRouter>
      <Header showToast={showToast} />
      <main id="main-content" className="mx-auto max-w-7xl px-4 sm:px-6 flex-grow py-6 w-full">
        <Routes>
          <Route path="/" element={<HomePage showToast={showToast} />} />
          <Route path="/register" element={<RegisterPage showToast={showToast} />} />
          <Route path="/login" element={<LoginPage showToast={showToast} />} />
          <Route path="/resources" element={<ResourcesPage showToast={showToast} />} />
          <Route path="/reservations" element={<ReservationsPage showToast={showToast} />} />
          <Route path="/profile" element={<ProfilePage showToast={showToast} />} />
          <Route path="/help" element={<LegalPage type="help" />} />
          <Route path="/privacy" element={<LegalPage type="privacy" />} />
          <Route path="/terms" element={<LegalPage type="terms" />} />
          <Route path="/500" element={<ServerErrorPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      {toast && (
        <div role="status" aria-live="polite" className={`fixed right-4 top-20 z-50 max-w-[calc(100vw-2rem)] px-5 py-3 rounded-xl shadow-lg text-white font-bold text-sm ${toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-emerald-700' : 'bg-slate-950'}`}>
          {toast.msg}
        </div>
      )}
    </BrowserRouter>
  )
}

export default App
