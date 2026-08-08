import { Navigate, Route, Routes } from 'react-router-dom';
import { legacyRouteMap } from './lib/routes';
import { AdminPage } from './pages/AdminPage';
import { AppPage } from './pages/AppPage';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/AuthPages';
import { LandingPage } from './pages/LandingPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/app" element={<AppPage />} />
      <Route path="/admin" element={<AdminPage />} />
      {Object.entries(legacyRouteMap).map(([from, to]) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
