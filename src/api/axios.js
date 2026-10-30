// src/api/axios.js
// 统一封装 axios 实例 + 请求/响应拦截器
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api', // 后端 API 基础路径
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ========== 请求拦截器 ==========
// 每次请求自动把 localStorage 里的 token 放进请求头（JWT 规范：Bearer + token）
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ========== 响应拦截器 ==========
// 成功：返回完整 response，组件里统一用 res.data 取数据
// 失败：token 失效(401)时统一清理登录态并跳回登录页
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
