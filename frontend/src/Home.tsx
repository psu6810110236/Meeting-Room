import { useNavigate } from 'react-router-dom';
import './App.css';

function Home() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    alert('ออกจากระบบเรียบร้อย 👋');
    navigate('/login');
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>🏠 ยินดีต้อนรับสู่ระบบจองห้องประชุม</h1>
      <p>คุณเข้าสู่ระบบสำเร็จแล้ว!</p>
      
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