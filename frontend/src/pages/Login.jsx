import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../constants/routes';
import { MSG } from '../constants/messages';
import toast from 'react-hot-toast';

/**
 * 登录页
 *
 * 输入框刻意使用「非受控」写法（defaultValue + ref）：
 * 手机密码管理器 / 浏览器自动填充是直接写 DOM 的，不会触发 React 的 onChange。
 * 若用受控组件，state 里仍是空字符串，一旦组件重新渲染（点击登录、loading 变化等），
 * React 就会把输入框刷回空值 —— 表现为"密码管理器填完后账号密码闪一下变空"。
 * 非受控写法下 React 不会覆盖 DOM 里的值，提交时也从 DOM 读取真实值。
 */
export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, token } = useAuth();
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);
  const [loading, setLoading] = useState(false);

  // 已登录用户直接回到目标页，避免「已经登录却停在登录页」
  const redirectTo = searchParams.get('redirect');
  useEffect(() => {
    if (!token) return;
    const target = redirectTo && redirectTo.startsWith('/') ? redirectTo : ROUTES.HOME;
    navigate(target, { replace: true });
  }, [token, redirectTo, navigate]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (loading) return;

    // 从 DOM 读取：无论手输还是密码管理器填充，都能拿到真实值
    const username = (usernameRef.current?.value || '').trim();
    const password = passwordRef.current?.value || '';

    if (!username) { toast.error(MSG.VALID_NAME_REQUIRED); usernameRef.current?.focus(); return; }
    if (!password) { toast.error('请输入密码'); passwordRef.current?.focus(); return; }

    setLoading(true);
    try {
      const res = await authApi.login({ username, password });
      login(res.data.token, res.data.user);
      toast.success(MSG.LOGIN_SUCCESS);
      const target = redirectTo && redirectTo.startsWith('/') ? redirectTo : ROUTES.HOME;
      navigate(target, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.error || MSG.LOGIN_FAIL);
    } finally {
      setLoading(false);
    }
  }, [login, navigate, redirectTo, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center auth-bg p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-8 text-white drop-shadow-sm">人情记账</h1>
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="login-username">用户名</label>
              <input id="login-username" name="username" type="text" ref={usernameRef} defaultValue=""
                autoComplete="username" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                className="input-field" placeholder="请输入用户名" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="login-password">密码</label>
              <input id="login-password" name="password" type="password" ref={passwordRef} defaultValue=""
                autoComplete="current-password"
                className="input-field" placeholder="请输入密码" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? '登录中...' : '登录'}</button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={() => navigate(ROUTES.REGISTER)} className="text-sm text-primary-500 hover:underline">没有账号？去注册</button>
          </div>
        </div>
      </div>
    </div>
  );
}
