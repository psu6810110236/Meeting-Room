import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';

import Login from './pages/Login';      
import RoomList from './pages/RoomList'; 
import AdminDashboard from './AdminDashboard'; // ✅ ไฟล์อยู่ที่ src/
import AdminRoute from './AdminRoute'; // ✅ แก้ไข Path: อยู่ใน src/ ไม่ใช่ src/pages/

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><RoomList /></PrivateRoute>} />
          <Route 
            path="/admin" 
            element={<AdminRoute><AdminDashboard /></AdminRoute>} 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;