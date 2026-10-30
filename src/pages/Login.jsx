// src/pages/Login.jsx
// 登录页：左右分栏风格（左侧品牌区 + 右侧表单区），支持注册后自动回填账号密码
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../api/axios';
import { useAuth } from '../context/AuthContext';
import puppy from '../assets/puppy.jpg';

function Login() {
  // 从注册页跳转过来时，读取路由 state 自动回填账号密码
  const location = useLocation();
  const reg = location.state || {};

  const [form, setForm] = useState({
    username: reg.username || '',
    password: reg.password || '',
  });
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async () => {
    try {
      const res = await apiClient.post('/users/login', form);
      login(res.data.token);
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.msg || '登录失败，请检查用户名和密码';
      alert(msg);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
      {/* ===== 左侧品牌区 ===== */}
      <div
        style={{
          flex: '0 0 44%',
          background: 'linear-gradient(160deg, #e8f1ff 0%, #e7f7ef 100%)',
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#6366f1' }} />
          <span style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Feynman 平台</span>
        </div>

        <img
          src={puppy}
          alt="mascot"
          style={{
            width: '72%',
            maxWidth: 320,
            margin: '0 auto',
            borderRadius: 20,
            boxShadow: '0 14px 34px rgba(30,60,120,0.12)',
            background: '#fff',
          }}
        />

        <p
          style={{
            textAlign: 'center',
            marginTop: 28,
            color: '#4b5563',
            fontSize: 16,
            lineHeight: 1.7,
          }}
        >
          课程、复述、测验与复习进度集中管理
        </p>
      </div>

      {/* ===== 右侧表单区 ===== */}
      <div
        style={{
          flex: 1,
          background: '#fafaf8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <div style={{ width: 380 }}>
          <h2 style={{ margin: 0, fontSize: 30, color: '#111827' }}>登录</h2>
          <p style={{ color: '#9ca3af', margin: '10px 0 34px', fontSize: 15 }}>
            继续今天的学习与教学
          </p>

          <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
            用户名
          </label>
          <input
            placeholder="用户名或邮箱"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 15,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#fff',
              marginBottom: 20,
              outline: 'none',
            }}
          />

          <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
            密码
          </label>
          <input
            type="password"
            placeholder="请输入密码"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 15,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#fff',
              marginBottom: 28,
              outline: 'none',
            }}
          />

          <button
            onClick={handleSubmit}
            style={{
              width: '100%',
              padding: '13px 0',
              border: 'none',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontSize: 16,
              cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(99,102,241,0.3)',
            }}
          >
            登录
          </button>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 18,
              fontSize: 14,
            }}
          >
            <span style={{ color: '#9ca3af', cursor: 'pointer' }}>忘记密码</span>
            <Link to="/register" style={{ color: '#6366f1' }}>
              没有账号，立即注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
