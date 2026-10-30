// src/App.jsx
// 路由配置：所有页面共用 Layout 顶部导航栏（根据登录态切换显示）；
// Dashboard 额外由 ProtectedRoute 守卫保护
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';

function App() {
  return (
    <Routes>
      {/* 外层 Layout：全部页面共用顶部导航栏 */}
      <Route element={<Layout />}>
        {/* 公共路由：无需登录 */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* 受保护路由：必须登录 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
