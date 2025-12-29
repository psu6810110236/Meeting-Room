import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // ✅ Import ตัวช่วยแกะรหัส
import './App.css';

// กำหนดหน้าตาข้อมูลใน Token
interface JwtPayload {
  role: string;
}

function Home() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // 1. ดึง Token มาเช็คตอนเข้าหน้าเว็บ
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        // 2. ถ้า role เป็น admin ให้ตั้งค่า isAdmin = true
        if (decoded.role === 'admin') {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error("Token invalid");
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    alert('ออกจากระบบเรียบร้อย 👋');
    navigate('/login');
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>🏠 ยินดีต้อนรับสู่ระบบจองห้องประชุม</h1>
      <p>คุณเข้าสู่ระบบสำเร็จแล้ว!</p>

      {/* ✅ ส่วนนี้จะโชว์เฉพาะ Admin เท่านั้น */}
      {isAdmin && (
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={() => navigate('/admin')}
            style={{ 
              backgroundColor: '#ff9800', 
              color: 'white', 
              padding: '10px 20px', 
              fontSize: '16px',
              cursor: 'pointer',
              marginBottom: '10px'
            }}
          >
            👮‍♂️ ไปที่ Admin Dashboard
          </button>
        </div>
      )}
      
      <div className="card">
        <button 
          onClick={handleLogout}
          style={{ backgroundColor: '#ff4444', color: 'white' }}
        >
          Logout (ออกจากระบบ)
        </button>
      </div>
    </div>
  );
}

export default Home;