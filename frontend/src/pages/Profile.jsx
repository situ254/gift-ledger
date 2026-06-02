import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/UI';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';

const MENU_ITEMS = [
  { label: '亲友录',       path: ROUTES.CONTACTS.LIST,  icon: '👥' },
  { label: '礼簿管理',    path: ROUTES.GIFT_BOOKS.LIST, icon: '📖' },
  { label: '事由管理',    path: ROUTES.REASONS.LIST,  icon: '🏷️' },
  { label: '亲友类型管理', path: ROUTES.CONTACT_TYPES.LIST, icon: '📁' },
  { label: '数据导入',    path: ROUTES.IMPORT,  icon: '📤' },
  { label: '数据导出',    path: ROUTES.EXPORT,  icon: '📥' },
  { label: '云端备份',    path: ROUTES.BACKUP, icon: '☁️' },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => {
    if (window.confirm(MSG.CONFIRM_LOGOUT)) { logout(); navigate(ROUTES.LOGIN); }
  };

  return (
    <div>
      <PageHeader title="更多" variant="rounded" />
      <div className="page-container -mt-4">
        {/* 用户信息卡片 */}
        <div className="card mb-4 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #FFE082 0%, #D4AF37 50%, #C49A48 100%)' }}>
          <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center text-white text-xl font-bold backdrop-blur-sm">
            {user?.username?.[0] || '?'}
          </div>
          <div>
            <div className="font-bold text-white text-lg">{user?.username}</div>
            <div className="text-white/80 text-sm">{isAdmin ? '管理员' : '普通用户'}</div>
          </div>
        </div>

        {/* 菜单列表 */}
        <div className="space-y-1">
          {MENU_ITEMS.map(item => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:bg-primary-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-50 text-primary-500 text-sm">{item.icon}</span>
                <span className="text-gray-800">{item.label}</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          ))}
        </div>

        {/* 退出登录 */}
        <button onClick={handleLogout}
          className="w-full mt-4 py-3 text-red-500 font-medium bg-white rounded-xl border border-gray-100 hover:bg-red-50 transition-colors"
        >
          退出登录
        </button>

        {isAdmin && (
          <button onClick={() => navigate(ROUTES.ADMIN.USERS)}
            className="w-full mt-2 py-3 text-primary-500 font-medium bg-white rounded-xl border border-gray-100 hover:bg-primary-50 transition-colors"
          >
            管理后台
          </button>
        )}
      </div>
    </div>
  );
}
