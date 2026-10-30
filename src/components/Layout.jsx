// src/components/Layout.jsx
// 共享布局：顶部导航栏根据登录状态显示不同内容
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Layout() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();

  // 退出登录：调用 Context 的 logout，清空登录态后跳登录页
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ===== 顶部导航栏 ===== */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          padding: '0 32px',
          background: '#ffffff',
          boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        {/* 品牌标识 */}
        <div style={{ fontSize: 20, fontWeight: 700, color: '#7c3aed' }}>
          Feynman 平台
        </div>

        {/* 右侧导航：根据登录状态切换 */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {token ? (
            <>
              {/* 已登录：显示 首页 + 账号邮箱 + 退出登录 */}
              <Link to="/" style={{ color: '#374151', fontSize: 15 }}>
                首页
              </Link>
              <span style={{ color: '#9ca3af', fontSize: 14 }}>
                {user?.email || '已登录'}
              </span>
              <button
                onClick={handleLogout}
                style={{
                  padding: '7px 18px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                退出登录
              </button>
            </>
          ) : (
            <>
              {/* 未登录：显示 登录 + 注册 */}
              <Link
                to="/login"
                style={{
                  padding: '7px 22px',
                  borderRadius: 6,
                  background: '#7c3aed',
                  color: '#fff',
                  fontSize: 14,
                }}
              >
                登录
              </Link>
              <Link
                to="/register"
                style={{
                  padding: '7px 22px',
                  borderRadius: 6,
                  border: '1px solid #7c3aed',
                  color: '#7c3aed',
                  fontSize: 14,
                }}
              >
                注册
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* ===== 页面主体：渲染当前路由内容 ===== */}
      <main style={{ padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
