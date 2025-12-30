import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';

import Login from './pages/Login';      
import Register from './pages/Register'; // ✅ 1. เพิ่ม Import
import RoomList from './pages/RoomList'; 
import AdminDashboard from './AdminDashboard'; 
import AdminRoute from './AdminRoute'; 

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
          <Route path="/register" element={<Register />} /> {/* ✅ 2. เพิ่ม Route */}
          
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