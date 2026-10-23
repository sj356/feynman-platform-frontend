import { useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

function Register() {
  const [form, setForm] = useState({username:"", email:"", password:""})
  const handleSubmit = async () => {
    try {
      const res = await axios.post("http://localhost:3000/api/users/register", form)
      console.log(res.data)
      alert("注册成功")
    } catch (err) {
      console.error(err)
      alert("注册失败")
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

      <h2 style={{textAlign:"center", fontSize:"42px"}}>用户注册</h2>
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
            placeholder="邮箱"
            value={form.email}
            onChange={e=>setForm({...form, email:e.target.value})}
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
          >注册</button>
        </div>
      </div>
    </div>
  )
}
export default Register
