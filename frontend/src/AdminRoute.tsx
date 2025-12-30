import React from 'react';
import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  role: string;
  exp: number;
}

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" />;
  }

  try {
    const decoded = jwtDecode<JwtPayload>(token);
    
    // 👮‍♂️ เช็คว่าเป็น Admin ไหม? (ถ้าไม่ใช่ ดีดกลับไปหน้าแรก)
    if (decoded.role !== 'admin') {
      alert('หยุด! พื้นที่สำหรับ Admin เท่านั้น 🛑');
      return <Navigate to="/" />;
    }

    return children; // ผ่านได้ ✅

  } catch (error) {
    localStorage.removeItem('token');
    return <Navigate to="/login" />;
  }
};

export default AdminRoute;