import UpdatePrompt from './components/UpdatePrompt';
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import TrackingPage from './pages/TrackingPage';
import CouriersPage from './pages/CouriersPage';
import ClinicsPage from './pages/ClinicsPage';
import CourierDetailPage from './pages/CourierDetailPage';
import ClinicDetailPage from './pages/ClinicDetailPage';
import RedZonesPage from './pages/RedZonesPage';
import ReportsPage from './pages/ReportsPage';
import OrderDetailPage from './pages/OrderDetailPage';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { setupPushNotifications } from './lib/firebase';

function App() {
  // Sesión ya iniciada: asegura que este navegador esté registrado para push
  useEffect(() => {
    if (localStorage.getItem('auth_token')) {
      setupPushNotifications();
    }
  }, []);

  return (
    <>
      <UpdatePrompt />
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/orders/:id" element={<OrderDetailPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/couriers" element={<CouriersPage />} />
          <Route path="/couriers/:id" element={<CourierDetailPage />} />
          <Route path="/clinics" element={<ClinicsPage />} />
          <Route path="/clinics/:id" element={<ClinicDetailPage />} />
          <Route path="/red-zones" element={<RedZonesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

export default App;