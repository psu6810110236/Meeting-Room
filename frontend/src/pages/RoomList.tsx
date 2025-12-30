import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import {
  Box, CssBaseline, Drawer, AppBar, Toolbar, List, Typography, Divider, IconButton, 
  ListItemButton, ListItemIcon, ListItemText, Container, Grid, Paper, 
  Button, Card, CardContent, CardActions, Chip, TextField, 
  MenuItem, Select, InputLabel, FormControl, CircularProgress,
  Stack
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, History, Logout, 
  EventAvailable, LocationOn, Person, AdminPanelSettings,
  Inventory2, AccessTime 
} from '@mui/icons-material';
import api from '../api/axios';
import type { MeetingRoom, Booking } from '../types';
import BookingModal from '../components/BookingModal';

const drawerWidth = 260;

const RoomList = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'history'>('dashboard');
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [capacityFilter, setCapacityFilter] = useState<number | ''>('');

  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const decoded: any = jwtDecode(token);
        setIsAdmin(decoded.role === 'admin');
        const resHistory = await api.get(`/bookings/my-history?userId=${decoded.sub}`);
        setMyBookings(resHistory.data);
      }
      const resRooms = await api.get('/rooms?active=true');
      setRooms(resRooms.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLogout = () => {
    if (confirm('ยืนยันการออกจากระบบ?')) {
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const renderDashboard = () => {
    const filteredRooms = rooms.filter(room => {
      const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            room.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCapacity = capacityFilter === '' || room.capacity >= capacityFilter;
      return matchesSearch && matchesCapacity;
    });

    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField 
                  fullWidth 
                  placeholder="🔍 ค้นหาห้อง..." 
                  variant="outlined" 
                  size="small"
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>ความจุ</InputLabel>
                  <Select 
                    value={capacityFilter} 
                    label="ความจุ" 
                    onChange={(e) => setCapacityFilter(e.target.value as number)}
                  >
                    <MenuItem value="">ทั้งหมด</MenuItem>
                    <MenuItem value={4}>4+</MenuItem>
                    <MenuItem value={10}>10+</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={3}>
                 <Button fullWidth variant="contained" onClick={fetchData}>Refresh</Button>
              </Grid>
            </Grid>
          </Paper>

          <Grid container spacing={2}>
            {filteredRooms.map((room) => (
              <Grid item key={room.id} xs={12} sm={6} md={4} lg={3}>
                <Card sx={{ 
                  height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, 
                  transition: '0.2s', border: '1px solid #eee',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 25px rgba(0,0,0,0.1)' } 
                }}>
                  <Box sx={{ 
                    height: 120, 
                    background: `linear-gradient(135deg, ${room.id % 2 === 0 ? '#3f51b5' : '#673ab7'} 0%, #1976d2 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                      <EventAvailable sx={{ fontSize: 50, color: 'white', opacity: 0.8 }} />
                  </Box>
                  <CardContent sx={{ flexGrow: 1, p: 2 }}>
                    <Typography variant="h6" fontWeight="bold" noWrap>{room.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                       <LocationOn fontSize="inherit"/> {room.location}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                       <Person fontSize="small" color="action" />
                       <Typography variant="body2">{room.capacity} ที่นั่ง</Typography>
                    </Stack>
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ p: 1.5 }}>
                    <Button fullWidth variant="contained" size="small" onClick={() => { setSelectedRoom(room); setIsModalOpen(true); }}>
                      จองห้องนี้
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    );
  };

  const renderHistory = () => (
    <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 3, p: 3 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        📜 ประวัติการจองของฉัน
      </Typography>
      <Divider sx={{ mb: 3 }} />
      {myBookings.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>ยังไม่มีประวัติการจอง</Typography>
      ) : (
        <Stack spacing={2}>
          {myBookings.map((b) => (
            <Paper key={b.id} variant="outlined" sx={{ 
              p: 2.5, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start', 
              borderRadius: 2,
              transition: '0.3s',
              '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
            }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" fontWeight="bold" color="primary" sx={{ mb: 1 }}>
                  {b.room?.name || 'ห้องที่จอง'}
                </Typography>
                
                <Stack spacing={0.5} sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTime sx={{ fontSize: 16, color: '#2e7d32' }} /> 
                    <strong>เริ่ม:</strong> {new Date(b.start_time).toLocaleString('th-TH')}
                  </Typography>
                  <Typography variant="body2" color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTime sx={{ fontSize: 16, color: '#d32f2f' }} /> 
                    <strong>สิ้นสุด:</strong> {new Date(b.end_time).toLocaleString('th-TH')}
                  </Typography>
                </Stack>
                
                {b.booking_facilities && b.booking_facilities.length > 0 && (
                  <Box sx={{ 
                    mt: 1, 
                    mb: 2, 
                    p: 1.5, 
                    bgcolor: '#f8fafc', 
                    borderRadius: 2, 
                    border: '1px solid #e2e8f0', 
                    borderLeft: '4px solid #3b82f6',
                    maxWidth: '450px' 
                  }}>
                    <Typography variant="caption" fontWeight="bold" color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Inventory2 sx={{ fontSize: 14, color: '#b45309' }} /> รายการอุปกรณ์ที่ยืม:
                    </Typography>
                    {b.booking_facilities.map((bf: any) => (
                      <Typography key={bf.id} variant="caption" display="block" color="text.secondary" sx={{ ml: 2.5 }}>
                        • {bf.facility?.name} (จำนวน {bf.quantity} ชิ้น)
                      </Typography>
                    ))}
                  </Box>
                )}

                <Typography variant="body2">
                  <strong>วัตถุประสงค์:</strong> {b.purpose || 'ไม่ได้ระบุ'}
                </Typography>
              </Box>

              <Stack alignItems="flex-end" spacing={1}>
                <Chip 
                  label={b.status.toUpperCase()} 
                  color={
                    b.status === 'approved' ? 'success' : 
                    b.status === 'completed' ? 'primary' : 
                    b.status === 'rejected' ? 'error' : 'warning'
                  } 
                  size="small"
                  sx={{ 
                    fontWeight: 'bold', 
                    minWidth: '100px',
                    // ✅ แก้ไข: ลบไอคอนสี่เหลี่ยมสีออกแล้ว ใช้เป็น String ธรรมดา
                    bgcolor: b.status === 'completed' ? '#e0f2fe' : undefined,
                    color: b.status === 'completed' ? '#0369a1' : undefined,
                    border: b.status === 'completed' ? '1px solid #bae6fd' : 'none'
                  }}
                />
                <Typography variant="caption" color="text.disabled" sx={{ mt: 1 }}>
                  Booking ID: #{b.id}
                </Typography>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Paper>
  );

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f0f2f5', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="absolute" open={open} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#1a2035' }}>
        <Toolbar sx={{ pr: '24px' }}>
          <IconButton edge="start" color="inherit" onClick={() => setOpen(!open)} sx={{ mr: 2 }}><MenuIcon /></IconButton>
          <Typography component="h1" variant="h6" color="inherit" noWrap sx={{ flexGrow: 1 }}>
            🏢 Meeting Room System
          </Typography>
          
          {isAdmin && (
            <Button 
              variant="contained" 
              color="warning" 
              startIcon={<AdminPanelSettings />} 
              onClick={() => navigate('/admin')}
              sx={{ mr: 2 }}
            >
              Admin Dashboard
            </Button>
          )}
          
          <Typography variant="subtitle2" sx={{ mr: 2 }}>{isAdmin ? 'Admin' : 'User'}</Typography>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" open={open} sx={{ '& .MuiDrawer-paper': { position: 'relative', whiteSpace: 'nowrap', width: drawerWidth, transition: 'width 0.3s', boxSizing: 'border-box' } }}>
        <Toolbar />
        <List component="nav" sx={{ mt: 2 }}>
          <ListItemButton selected={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')}>
            <ListItemIcon><Dashboard /></ListItemIcon>
            <ListItemText primary="จองห้องประชุม" />
          </ListItemButton>
          <ListItemButton selected={currentView === 'history'} onClick={() => setCurrentView('history')}>
            <ListItemIcon><History /></ListItemIcon>
            <ListItemText primary="ประวัติการจอง" />
          </ListItemButton>
          <Divider sx={{ my: 2 }} />
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon><Logout color="error" /></ListItemIcon>
            <ListItemText primary="ออกจากระบบ" primaryTypographyProps={{ color: 'error' }} />
          </ListItemButton>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, height: '100vh', overflow: 'auto', pt: 10, px: 3 }}>
        <Container maxWidth={false}>
          {loading ? <Box display="flex" justifyContent="center"><CircularProgress /></Box> : (
            currentView === 'dashboard' ? renderDashboard() : renderHistory()
          )}
        </Container>
      </Box>

      <BookingModal open={isModalOpen} handleClose={() => setIsModalOpen(false)} room={selectedRoom} onSuccess={fetchData} />
    </Box>
  );
};

export default RoomList;