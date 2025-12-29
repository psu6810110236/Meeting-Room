// frontend/src/pages/Login.tsx

// เปลี่ยนจาก import axios from 'axios' เป็น:
import api from '../api/axios'; 

// ... (ส่วนอื่นเหมือนเดิม)

// ในฟังก์ชัน handleLogin แก้บรรทัดยิง API เป็น:
const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // ✅ ไม่ต้องใส่ http://localhost:3000 และใช้ api ตัวกลาง
      const response = await api.post('/auth/login', { username, password });
      
      localStorage.setItem('token', response.data.accessToken);
      navigate('/'); // ล็อกอินผ่านให้ไปหน้าแรก
    } catch (err) {
      // ... จัดการ Error
    }
};