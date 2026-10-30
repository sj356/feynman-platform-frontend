// src/pages/Home.jsx
// 控制台 Dashboard（受保护页面，需登录访问）
import { useState } from 'react';
import apiClient from '../api/axios';
import { useAuth } from '../context/AuthContext';

function Home() {
  const { user } = useAuth();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  // 测试带 Token 请求（验证 axios 请求拦截器自动携带 Authorization 头）
  const testTokenReq = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/users/info');
      setInfo(res.data);
      alert('token 有效，成功获取用户信息！');
    } catch (err) {
      alert('请求失败：token 校验失败，或后端 /users/info 接口未配置');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 0' }}>
      <h1 style={{ fontSize: 30, margin: '0 0 8px', color: '#1f2937' }}>
        控制台 Dashboard
      </h1>
      <p style={{ color: '#6b7280', fontSize: 16, margin: 0 }}>
        欢迎使用 Feynman 平台，后续内容将在这里展示。
      </p>

      <div
        style={{
          marginTop: 28,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
          padding: 24,
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#1f2937' }}>
          登录状态测试
        </h3>
        <p style={{ margin: '0 0 16px', color: '#374151', fontSize: 14 }}>
          当前登录账号：
          <strong style={{ color: '#7c3aed' }}>{user?.email || '已登录'}</strong>
        </p>
        <button
          onClick={testTokenReq}
          disabled={loading}
          style={{
            padding: '10px 22px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {loading ? '请求中…' : '测试带 Token 请求'}
        </button>

        {info && (
          <pre
            style={{
              marginTop: 16,
              background: '#f9fafb',
              padding: 14,
              borderRadius: 8,
              fontSize: 13,
              whiteSpace: 'pre-wrap',
            }}
          >
            {JSON.stringify(info, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

export default Home;
