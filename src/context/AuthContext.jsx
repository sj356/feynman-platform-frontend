// src/context/AuthContext.jsx
// 全局登录状态管理（React Context API）
import { createContext, useState, useContext, useEffect } from 'react';
import apiClient from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // 初始化：从 localStorage 读取已保存的 token（刷新页面登录态不丢失）
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null); // 当前登录用户信息（含 email）

  // token 变化时：同步 localStorage，并拉取当前登录用户信息
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      // 调用受保护接口 /users/info 拿到用户信息（请求拦截器会自动带 token）
      apiClient
        .get('/users/info')
        .then((res) => setUser(res.data))
        .catch((err) => {
          // 仅当 token 失效(401)时清除登录态，避免网络抖动误登出
          if (err.response && err.response.status === 401) {
            setToken(null);
            setUser(null);
          }
        });
    } else {
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  // 登录：把 token 存入全局状态（useEffect 会自动写入 localStorage）
  const login = (newToken) => setToken(newToken);

  // 退出登录：清空 token 和用户信息
  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// 自定义 Hook，供任意子组件读取全局登录状态
export function useAuth() {
  return useContext(AuthContext);
}
