import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

/**
 * 注册页
 *
 * 同登录页：输入框使用非受控写法，避免手机密码管理器自动填充后
 * 被 React 的重新渲染刷回空值（自动填充不会触发 onChange）。
 */
export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (loading) return;
    const username = (usernameRef.current?.value || '').trim();
    const password = passwordRef.current?.value || '';

    if (!username) { toast.error(MSG.VALID_NAME_REQUIRED); usernameRef.current?.focus(); return; }
    if (!password) { toast.error('请输入密码'); passwordRef.current?.focus(); return; }

    setLoading(true);
    try {
      const res = await authApi.register({ username, password });
      // 注册接口本身返回 token，直接登录进首页，避免「注册完又回登录页」的割裂感
      if (res.data?.token) {
        login(res.data.token, res.data.user);
        toast.success(MSG.REGISTER_SUCCESS);
        navigate(ROUTES.HOME, { replace: true });
      } else {
        toast.success(MSG.REGISTER_SUCCESS);
        navigate(ROUTES.LOGIN, { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || MSG.REGISTER_FAIL);
    } finally {
      setLoading(false);
    }
  }, [navigate, login, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center auth-bg p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8 text-white drop-shadow-sm">注册账号</h1>
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reg-username">用户名</label>
              <input id="reg-username" name="username" type="text" ref={usernameRef} defaultValue=""
                autoComplete="username" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                className="input-field" placeholder="请输入用户名" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="reg-password">密码</label>
              <input id="reg-password" name="password" type="password" ref={passwordRef} defaultValue=""
                autoComplete="new-password"
                className="input-field" placeholder="请输入密码" required />
            </div>
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
