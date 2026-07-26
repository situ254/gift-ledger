import { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { LoadingSpinner } from './components/UI';
import * as Pages from './components/RoutePages';
import { ROUTES } from './constants/routes';

const noLayoutPaths = ['/login', '/register', '/admin'];

/* 侧边栏图标 */
const ICONS = {
  home: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>,
  received: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l7-7m-7 7l-7-7" /></svg>,
  given: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" /></svg>,
  book: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  stat: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 1 0 01-2 2h-2a2 1 0 01-2-2z" /></svg>,
  contacts: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
};

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => path === ROUTES.HOME ? location.pathname === ROUTES.HOME : location.pathname.startsWith(path);

  const mainItems = [
    { path: ROUTES.HOME, label: '主页', icon: ICONS.home },
    { path: ROUTES.RECEIVED.LIST, label: '收礼', icon: ICONS.received },
    { path: ROUTES.GIVEN.LIST, label: '随礼', icon: ICONS.given },
    { path: ROUTES.GIFT_BOOKS.LIST, label: '礼簿', icon: ICONS.book },
    { path: ROUTES.QUERY, label: '统计', icon: ICONS.stat },
    { path: ROUTES.CONTACTS.LIST, label: '亲友录', icon: ICONS.contacts },
  ];
  const footItems = [
    { path: ROUTES.IMPORT, label: '导入', icon: '📤' },
    { path: ROUTES.EXPORT, label: '导出', icon: '📥' },
    { path: ROUTES.PROFILE, label: '更多', icon: '⚙️' },
  ];

  const Item = ({ item, active }) => (
    <button onClick={() => navigate(item.path)}
      className={`nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-[background-color,color,transform] duration-150 ease-snap ${active ? 'nav-item-active' : 'text-gray-600 hover:bg-gray-100 active:scale-95'}`}>
      <span className={active ? 'text-white' : 'text-gray-400'}>{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-gray-100 bg-white/85 backdrop-blur z-40">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-gray-100 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-800 flex items-center justify-center text-white font-bold shadow-sm">礼</div>
        <span className="font-bold text-gray-800 text-lg">人情记账</span>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto no-scrollbar">
        {mainItems.map(it => <Item key={it.path} item={it} active={isActive(it.path)} />)}
      </nav>
      <div className="p-3 border-t border-gray-100 space-y-1 shrink-0">
        {footItems.map(it => <Item key={it.path} item={it} active={isActive(it.path)} />)}
      </div>
    </aside>
  );
}

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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-lg mx-auto flex justify-around items-center h-14">
        {tabs.map(tab => (
          <button key={tab.path} onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive(tab.path) ? 'text-primary-500' : 'text-gray-400 hover:text-gray-600'}`}>
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
    <div className="relative min-h-screen">
      <div className="app-bg" aria-hidden />
      <Sidebar />
      <main className="md:pl-60 min-h-screen">
        <div className="mx-auto w-full max-w-lg md:max-w-5xl xl:max-w-6xl md:px-8">
          <div key={location.pathname} className="page-enter">
            <Suspense fallback={<LoadingSpinner />}>
              <Outlet />
            </Suspense>
          </div>
          {showNav && <BottomNav />}
        </div>
      </main>
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
      </AuthProvider>
    </BrowserRouter>
  );
}
