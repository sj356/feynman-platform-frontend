import { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
function Login() {
  // 删掉email，只保留用户名和密码
  const [form, setForm] = useState({username:"", password:""})
  const navigate = useNavigate();
  const handleSubmit = async () => {
    try {
      // 请求只发送 username + password，后端不需要email
      const res = await axios.post("http://localhost:3000/api/users/login", form)
      // 前端控制台打印全部返回信息 token、账号、邮箱
      console.log("====登录返回信息====")
      console.log("token：", res.data.token)
      console.log("username：", res.data.user.username)
      console.log("email：", res.data.user.email)
      console.log("原始返回完整数据：", res.data)

      alert("登录成功")
      // 保存token到本地存储
      localStorage.setItem("token", res.data.token)
      // 登录成功跳转到首页
      navigate("/")
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.msg || "登录失败"
      alert(msg)
    }
  }
  return (
    <div style={{padding: "30px"}}>
      {/* 左上角导航按钮 */}
      <div style={{marginBottom:"40px"}}>
        <Link to="/">
          <button style={{padding:"8px 16px", marginRight:"10px"}}>首页</button>
        </Link>
        <Link to="/register">
          <button style={{padding:"8px 16px", marginRight:"10px"}}>注册</button>
        </Link>
        <Link to="/login">
          <button style={{padding:"8px 16px"}}>登录</button>
        </Link>
      </div>
      <h2 style={{textAlign:"center", fontSize:"42px"}}>用户登录</h2>
      <div style={{width:"60%", margin:"0 auto"}}>
        <div>
          <input
            placeholder="用户名"
            value={form.username}
            onChange={e=>setForm({...form, username:e.target.value})}
            style={{width:"100%", padding:"12px", fontSize:"20px", margin:"8px 0", borderRadius:"6px"}}
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="密码"
            value={form.password}
            onChange={e=>setForm({...form, password:e.target.value})}
            style={{width:"100%", padding:"12px", fontSize:"20px", margin:"8px 0", borderRadius:"6px"}}
          />
        </div>
        <div style={{textAlign:"center", marginTop:"12px"}}>
          <button
            onClick={handleSubmit}
            style={{padding:"12px 30px", fontSize:"24px"}}
          >登录</button>
        </div>
      </div>
    </div>
  )
}
export default Login
