import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { token } = useAuth()
  // 有token就渲染里面的路由，没有就跳登录
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

