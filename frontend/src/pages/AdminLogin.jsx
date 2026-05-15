import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.login({ username, password });
      login(res.data.token, res.data.user);
      if (res.data.user.role === 'admin') { toast.success(MSG.LOGIN_SUCCESS); navigate(ROUTES.ADMIN.USERS); }
      else { toast.error('非管理员账号'); }
    } catch (err) { toast.error(err.response?.data?.error || MSG.LOGIN_FAIL); }
    finally { setLoading(false); }
  }, [username, password, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8 text-red-500">管理员登录</h1>
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">用户名</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="input-field" placeholder="请输入管理员用户名" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">密码</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" placeholder="请输入密码" required /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? '登录中...' : '登录'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
