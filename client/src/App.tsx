import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Header } from './components/Header';
import { RequireAdmin, RequireAuth } from './components/guards';
import { ImportDoPage } from './pages/ImportDoPage';
import { HistoryPage } from './pages/HistoryPage';
import { UsersPage } from './pages/UsersPage';
import { LoginPage } from './pages/LoginPage';

/** Authenticated app shell (header + content). */
function AppLayout() {
  return (
    <div className="min-h-full">
      <Header />
      <main className="mx-auto max-w-[1400px] px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/import-do" replace />} />
          <Route path="/import-do" element={<ImportDoPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/import-do" replace />} />
    </Routes>
  );
}
