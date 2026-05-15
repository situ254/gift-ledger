import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';

const MENU_ITEMS = [
  { label: '亲友录', path: ROUTES.CONTACTS.LIST, icon: '👥' },
  { label: '礼簿管理', path: ROUTES.GIFT_BOOKS.LIST, icon: '📖' },
  { label: '事由管理', path: ROUTES.REASONS.LIST, icon: '🏷️' },
  { label: '亲友类型管理', path: ROUTES.CONTACT_TYPES.LIST, icon: '📁' },
  { label: '数据导入', path: ROUTES.IMPORT, icon: '📤' },
  { label: '数据导出', path: ROUTES.EXPORT, icon: '📥' },
  { label: '云端备份', path: ROUTES.BACKUP, icon: '☁️' },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const { dark, toggleTheme } = useTheme();

  const handleLogout = () => {
    if (confirm(MSG.CONFIRM_LOGOUT)) { logout(); navigate(ROUTES.LOGIN); }
  };

  return (
    <div>
      <PageHeader title="更多" variant="rounded" />
      <div className="page-container -mt-4">
        <div className="card mb-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white text-xl font-bold">{user?.username?.[0] || '?'}</div>
          <div>
            <div className="font-bold text-gray-800 dark:text-white">{user?.username}</div>
            <div className="text-sm text-gray-500">{isAdmin ? '管理员' : '普通用户'}</div>
          </div>
        </div>
        <div className="space-y-1">
          {MENU_ITEMS.map(item => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-500 flex-shrink-0">{item.icon}</span>
                <span className="text-gray-800 dark:text-white">{item.label}</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          ))}
        </div>
        <div className="card mt-4 flex items-center justify-between">
          <span className="text-gray-800 dark:text-white">深色模式</span>
          <button onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${dark ? 'bg-primary-500' : 'bg-gray-300'}`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${dark ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
        <button onClick={handleLogout} className="w-full mt-4 py-3 text-red-500 font-medium bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-gray-700 transition-colors">退出登录</button>
        {isAdmin && (
          <button onClick={() => navigate(ROUTES.ADMIN.USERS)} className="w-full mt-2 py-3 text-primary-500 font-medium bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors">管理后台</button>
        )}
      </div>
    </div>
  );
}
