import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { DashboardFilterProvider } from './context/DashboardFilterProvider';
import { PresetProvider } from './context/PresetProvider';
import { RequireAuth } from './components/routing/RequireAuth';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './hooks/useAuth';

// Pages load on demand so Recharts and the county geometry stay out of the
// bundle an unauthenticated visitor downloads. They use named exports, hence
// the `.then` shim. LoginPage stays eager — it is the first paint.
const OverviewPage = lazy(() => import('./pages/OverviewPage').then((m) => ({ default: m.OverviewPage })));
const DemographicsPage = lazy(() =>
  import('./pages/DemographicsPage').then((m) => ({ default: m.DemographicsPage })),
);
const FoodDesertsPage = lazy(() =>
  import('./pages/FoodDesertsPage').then((m) => ({ default: m.FoodDesertsPage })),
);
const PantryInteractionsPage = lazy(() =>
  import('./pages/PantryInteractionsPage').then((m) => ({ default: m.PantryInteractionsPage })),
);
const MostRequestedPage = lazy(() =>
  import('./pages/MostRequestedPage').then((m) => ({ default: m.MostRequestedPage })),
);
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const BillingPage = lazy(() => import('./pages/BillingPage').then((m) => ({ default: m.BillingPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

// Purchasable analytics modules. Each renders its own gate, so an agency
// without the entitlement still gets a route and a preview rather than a 404.
const SdohModulePage = lazy(() =>
  import('./pages/modules/SdohModulePage').then((m) => ({ default: m.SdohModulePage })),
);
const ChnaModulePage = lazy(() =>
  import('./pages/modules/ChnaModulePage').then((m) => ({ default: m.ChnaModulePage })),
);
const CsrModulePage = lazy(() =>
  import('./pages/modules/CsrModulePage').then((m) => ({ default: m.CsrModulePage })),
);
const DisasterModulePage = lazy(() =>
  import('./pages/modules/DisasterModulePage').then((m) => ({ default: m.DisasterModulePage })),
);

interface AttemptedLocation {
  pathname: string;
  search?: string;
  hash?: string;
}

function LoginRoute() {
  const { status, signIn } = useAuth();
  const location = useLocation();

  if (status === 'authenticated') {
    const from = (location.state as { from?: AttemptedLocation } | null)?.from;
    // Carry the query string and hash back too — they hold the filter state,
    // so dropping them would land the user on an unfiltered view.
    const target = from ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/';
    return <Navigate to={target} replace />;
  }

  return <LoginPage onLogin={signIn} />;
}

/**
 * Everything behind the login. Nesting the pages under a layout route means
 * the layout renders them through an <Outlet />, so shared state travels by
 * context rather than by cloning props onto <Routes>.
 */
function ProtectedShell() {
  return (
    <RequireAuth>
      <PresetProvider>
        <DashboardFilterProvider>
          <DashboardLayout />
        </DashboardFilterProvider>
      </PresetProvider>
    </RequireAuth>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<ProtectedShell />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/demographics" element={<DemographicsPage />} />
            <Route path="/food-deserts" element={<FoodDesertsPage />} />
            <Route path="/interactions" element={<PantryInteractionsPage />} />
            <Route path="/most-requested" element={<MostRequestedPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/modules/sdoh" element={<SdohModulePage />} />
            <Route path="/modules/chna" element={<ChnaModulePage />} />
            <Route path="/modules/csr" element={<CsrModulePage />} />
            <Route path="/modules/disaster" element={<DisasterModulePage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
