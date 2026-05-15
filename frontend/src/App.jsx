import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { LoadingSpinner } from './components/UI';
import * as Pages from './components/RoutePages';
import { ROUTES } from './constants/routes';

const noLayoutPaths = ['/login', '/register', '/admin'];

function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: ROUTES.HOME, label: '主页', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg> },
    { path: ROUTES.GIVEN.LIST, label: '随礼', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg> },
    { path: ROUTES.GIFT_BOOKS.LIST, label: '礼簿', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
    { path: ROUTES.QUERY, label: '统计', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { path: ROUTES.PROFILE, label: '更多', icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
  ];

  const isActive = (path) => path === ROUTES.HOME ? location.pathname === ROUTES.HOME : location.pathname.startsWith(path);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50">
      <div className="max-w-lg mx-auto flex justify-around items-center h-14">
        {tabs.map(tab => (
          <button key={tab.path} onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive(tab.path) ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}>
            <span className={isActive(tab.path) ? 'text-primary-500' : ''}>{tab.icon}</span>
            <span className="text-xs mt-0.5 font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function Layout() {
  const location = useLocation();
  const showNav = !noLayoutPaths.some(p => location.pathname.startsWith(p));
  return (
    <div className="max-w-lg mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      <Suspense fallback={<LoadingSpinner />}>
        <Outlet />
      </Suspense>
      {showNav && <BottomNav />}
    </div>
  );
}

function AuthGuard({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to={ROUTES.LOGIN} />;
}

function AdminGuard({ children }) {
  const { token, isAdmin } = useAuth();
  if (!token) return <Navigate to={ROUTES.LOGIN} />;
  if (!isAdmin) return <Navigate to={ROUTES.HOME} />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path={ROUTES.LOGIN} element={<Pages.Login />} />
              <Route path={ROUTES.REGISTER} element={<Pages.Register />} />
              <Route path={ROUTES.HOME} element={<AuthGuard><Layout /></AuthGuard>}>
                <Route index element={<Pages.Home />} />
                <Route path="given" element={<Pages.GiftsGiven />} />
                <Route path="given/year/:year" element={<Pages.GiftsGivenDetail />} />
                <Route path="given/new" element={<Pages.GiftGivenForm />} />
                <Route path="given/:id/edit" element={<Pages.GiftGivenForm />} />
                <Route path="received" element={<Pages.GiftsReceived />} />
                <Route path="received/year/:year" element={<Pages.GiftsReceivedDetail />} />
                <Route path="received/new" element={<Pages.GiftReceivedForm />} />
                <Route path="received/:id/edit" element={<Pages.GiftReceivedForm />} />
                <Route path="contacts" element={<Pages.ContactsList />} />
                <Route path="contacts/new" element={<Pages.ContactForm />} />
                <Route path="contacts/:id/edit" element={<Pages.ContactForm />} />
                <Route path="contacts/:name" element={<Pages.ContactDetail />} />
                <Route path="gift-books" element={<Pages.GiftBookList />} />
                <Route path="gift-books/:id" element={<Pages.GiftBookDetail />} />
                <Route path="gift-books/new" element={<Pages.GiftBookForm />} />
                <Route path="gift-books/:id/edit" element={<Pages.GiftBookForm />} />
                <Route path="query" element={<Pages.Query />} />
                <Route path="profile" element={<Pages.Profile />} />
                <Route path="import" element={<Pages.ImportPage />} />
                <Route path="export" element={<Pages.ExportPage />} />
                <Route path="backup" element={<Pages.BackupPage />} />
                <Route path="reasons" element={<Pages.ReasonsList />} />
                <Route path="reasons/new" element={<Pages.ReasonForm />} />
                <Route path="reasons/:id/edit" element={<Pages.ReasonForm />} />
                <Route path="contact-types" element={<Pages.ContactTypesList />} />
                <Route path="contact-types/new" element={<Pages.ContactTypeForm />} />
                <Route path="contact-types/:id/edit" element={<Pages.ContactTypeForm />} />
              </Route>
              <Route path={ROUTES.ADMIN.LOGIN} element={<Pages.AdminLogin />} />
              <Route path={ROUTES.ADMIN.USERS} element={<AdminGuard><Pages.AdminUsers /></AdminGuard>} />
              <Route path={ROUTES.ADMIN.SYSTEM} element={<AdminGuard><Pages.AdminSystem /></AdminGuard>} />
              <Route path="*" element={<Navigate to={ROUTES.HOME} />} />
            </Routes>
          </Suspense>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
