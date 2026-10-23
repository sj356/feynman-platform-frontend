import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

function Home() {
  const [msg, setMsg] = useState("")
  useEffect(() => {
    axios.get("http://localhost:3000/")
      .then(res => {
        setMsg(res.data)
      })
      .catch(err => {
        console.log("请求失败", err)
      })
  }, [])
  return (
    <div style={{padding: "30px"}}>
      {/* ========== 左上角导航按钮 ========== */}
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
      {/* ================================== */}
      <h1>费曼平台首页</h1>
      <p>后端返回消息：{msg}</p>
    </div>
  )
}
export default Home
