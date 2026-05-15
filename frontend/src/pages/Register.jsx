import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

export default function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.register({ username, password });
      toast.success(MSG.REGISTER_SUCCESS);
      navigate(ROUTES.LOGIN);
    } catch (err) { toast.error(err.response?.data?.error || MSG.REGISTER_FAIL); }
    finally { setLoading(false); }
  }, [username, password, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8 text-primary-500">注册账号</h1>
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">用户名</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="input-field" placeholder="请输入用户名" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">密码</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" placeholder="请输入密码" required /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? '注册中...' : '注册'}</button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={() => navigate(ROUTES.LOGIN)} className="text-sm text-primary-500 hover:underline">已有账号？去登录</button>
          </div>
        </div>
      </div>
    </div>
  );
}
