import React, { useState, useEffect, useRef } from 'react';
import { IconButton, Badge, Menu, MenuItem, Typography, Box, Divider, Button } from '@mui/material';
import { Notifications as NotificationsIcon, Circle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom'; // ✅ เพิ่ม useNavigate
import api from '../api/axios';

const NotificationBell = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isMounted = useRef(true);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) return; // ถ้าไม่มี Token ไม่ต้องทำงาน

    try {
      const [resList, resCount] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count')
      ]);
      
      if (isMounted.current) {
        setNotifications(resList.data);
        setUnreadCount(resCount.data);
      }
    } catch (error: any) {
      console.error("Noti Error", error);
      // ถ้า Token หมดอายุ (401) ให้เด้งออกไปหน้า Login ทันที กันบัคค้าง
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;
    fetchNotifications();
    
    // ตั้งเวลาดึงข้อมูลใหม่ทุก 1 นาที (60000 ms)
    const interval = setInterval(fetchNotifications, 60000); 
    
    return () => { 
        clearInterval(interval); 
        isMounted.current = false; 
    };
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications(); // อัปเดตข้อมูลทันทีที่กดเปิด
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) { console.error(e); }
  };
  
  const handleItemClick = async (id: number, isRead: boolean) => {
    handleClose();
    if (!isRead) {
        try {
            await api.patch(`/notifications/${id}/read`);
            // อัปเดต State แบบ Manual เพื่อความลื่นไหล ไม่ต้องรอ fetch ใหม่
            setUnreadCount(prev => Math.max(0, prev - 1));
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (e) {}
    }
  };

  return (
    <>
      {/* ✅ แก้ไข: กำหนดสีเทาเข้ม (color: '#64748b') แทน inherit เพื่อให้มองเห็นบนพื้นขาวแน่นอน */}
      <IconButton 
        onClick={handleClick} 
        sx={{ mr: 2, color: '#64748b', '&:hover': { bgcolor: '#f1f5f9' } }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        disableScrollLock={true} // ✅ ป้องกันหน้าเว็บขยับเวลากดเปิด
        PaperProps={{ 
            sx: { 
                width: 360, 
                maxHeight: 500, 
                mt: 1.5,
                borderRadius: 3,
                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)',
                overflow: 'hidden' // กัน scrollbar ซ้อน
            } 
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        sx={{ zIndex: 10000 }} // ✅ บังคับให้เมนูลอยเหนือทุกเลเยอร์ (แก้บัคเมนูจม)
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fff' }}>
          <Typography variant="subtitle1" fontWeight="bold">Notifications</Typography>
          {unreadCount > 0 && <Button size="small" onClick={handleMarkAllRead} sx={{ fontSize: '0.75rem' }}>Mark all read</Button>}
        </Box>
        <Divider />
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {notifications.length === 0 ? (
            <MenuItem disabled sx={{ justifyContent: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">No new notifications</Typography>
            </MenuItem>
          ) : (
            notifications.map((n) => (
              <MenuItem 
                  key={n.id} 
                  onClick={() => handleItemClick(n.id, n.is_read)}
                  sx={{ 
                      whiteSpace: 'normal', 
                      bgcolor: n.is_read ? 'white' : '#f0f9ff', 
                      borderBottom: '1px solid #f8fafc',
                      py: 2,
                      alignItems: 'flex-start',
                      transition: '0.2s',
                      '&:hover': { bgcolor: '#f8fafc' }
                  }}
              >
                 <Box sx={{ mt: 0.5, mr: 2, display: 'flex', alignItems: 'center' }}>
                     {!n.is_read ? <Circle color="primary" sx={{ fontSize: 10 }} /> : <NotificationsIcon sx={{ fontSize: 20, color: '#cbd5e1' }} />}
                 </Box>
                 <Box sx={{ flexGrow: 1 }}>
                   <Typography variant="body2" fontWeight={n.is_read ? 'normal' : '600'} sx={{ fontSize: '0.9rem', lineHeight: 1.5, color: '#1e293b' }}>
                      {n.message}
                   </Typography>
                   <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.75rem' }}>
                      {new Date(n.created_at).toLocaleString('th-TH')}
                   </Typography>
                 </Box>
              </MenuItem>
            ))
          )}
        </Box>
      </Menu>
    </>
  );
};

export default NotificationBell;