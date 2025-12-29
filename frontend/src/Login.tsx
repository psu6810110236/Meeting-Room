import React, { useState } from 'react'; // ✅ เพิ่ม React ตรงนี้
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './App.css';

function Login() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const navigate = useNavigate();

  // ✅ ตรงนี้ต้องใช้ React.FormEvent ซึ่งต้องมี import ด้านบนก่อน
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); 
    try {
      const response = await axios.post('http://localhost:3000/auth/login', {
        username,
        password
      });

      const token = response.data.accessToken;
      localStorage.setItem('token', token);
      
      alert('Login สำเร็จ! 🎉');
      
      navigate('/'); 

    } catch (error) {
      console.error(error);
      alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง! ❌');
    }
  };

  return (
    <div className="card" style={{ maxWidth: '400px', margin: 'auto' }}>
      <h2>🔐 เข้าสู่ระบบ</h2>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="text" 
          placeholder="Username (เช่น user01)" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: '10px' }}
          required
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '10px' }}
          required
        />
        <button type="submit" style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#646cff', color: 'white' }}>
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;