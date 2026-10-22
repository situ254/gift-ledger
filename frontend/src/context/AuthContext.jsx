import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));

  const login = useCallback((newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setLoading(false);
  }, []);

  // 校验本地 token 是否仍然有效
  //
  // 注意：只有服务端明确返回 401 才清除登录态。
  // 之前这里对任何异常都直接 logout，遇到网络抖动 / 反向代理 5xx /
  // 刚登录时接口还没就绪等情况，会把用户「刚登录就弹回登录页」。
  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    authApi.getMe()
      .then(res => {
        if (cancelled) return;
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      })
      .catch(err => {
        if (cancelled) return;
        if (err.response?.status === 401 || err.response?.status === 403) {
          logout();
        }
        // 其余错误：保留本地登录态，等下次请求再判断
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [token, logout]);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
