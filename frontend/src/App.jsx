import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import Contacts from './pages/Contacts';
import Pipeline from './pages/Pipeline';
import Activities from './pages/Activities';
import TravelMap from './pages/TravelMap';
import SalesTools from './pages/SalesTools';
import WhatsApp from './pages/WhatsApp';
import Settings from './pages/Settings';
import BackupLogs from './pages/BackupLogs';
import Goals from './pages/Goals';
import Campaigns from './pages/Campaigns';
import InstagramLeads from './pages/InstagramLeads';
import TelegramLeads from './pages/TelegramLeads';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Carregando...</div>;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="activities" element={<Activities />} />
        <Route path="sales-tools" element={<SalesTools />} />
        <Route path="travel-map" element={<TravelMap />} />
        <Route path="whatsapp" element={<WhatsApp />} />
        <Route path="settings" element={<Settings />} />
        <Route path="goals" element={<Goals />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="instagram" element={<InstagramLeads />} />
        <Route path="telegram" element={<TelegramLeads />} />
        <Route path="backup-logs" element={<BackupLogs />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
