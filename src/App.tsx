import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { DemographicsPage } from './pages/DemographicsPage';
import { FoodDesertsPage } from './pages/FoodDesertsPage';
import { PantryInteractionsPage } from './pages/PantryInteractionsPage';
import { MostRequestedPage } from './pages/MostRequestedPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { mockCurrentUser } from './data/mockData';
import type { AgencyUser } from './types';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AgencyUser>(mockCurrentUser);
  const navigate = useNavigate();

  const handleLogin = (email: string) => {
    setIsAuthenticated(true);
    setUser((prev) => ({ ...prev, email }));
    navigate('/');
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <DashboardLayout user={user} onSignOut={handleSignOut}>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/demographics" element={<DemographicsPage />} />
        <Route path="/food-deserts" element={<FoodDesertsPage />} />
        <Route path="/interactions" element={<PantryInteractionsPage />} />
        <Route path="/most-requested" element={<MostRequestedPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage user={user} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
