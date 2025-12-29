import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, CssBaseline, Drawer, AppBar, Toolbar, List, Typography, Divider, IconButton, 
  ListItemButton, ListItemIcon, ListItemText, Container, Grid, Paper, 
  Button, Card, CardContent, CardActions, Chip, Avatar, TextField, 
  MenuItem, Select, InputLabel, FormControl, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack,
  Tooltip
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, History, Settings, Logout, Search, 
  EventAvailable, LocationOn, Person, Wifi, Tv, Videocam, AcUnit, EventSeat, 
  Add, Star, AccessTime, EventNote, NotificationsActive
} from '@mui/icons-material';
import api from '../api/axios';
import type { MeetingRoom, Booking } from '../types';
import BookingModal from '../components/BookingModal';
import CreateRoomModal from '../components/CreateRoomModal';

// --- Configuration ---
const drawerWidth = 260;

// --- Helper Functions ---
const getFacilityIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('wifi')) return <Wifi fontSize="small" />;
  if (n.includes('projector') || n.includes('tv')) return <Tv fontSize="small" />;
  if (n.includes('cam')) return <Videocam fontSize="small" />;
  if (n.includes('air')) return <AcUnit fontSize="small" />;
  return <EventAvailable fontSize="small" />;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('th-TH', { 
    year: 'numeric', month: 'short', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
};

const RoomList = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'history' | 'settings'>('dashboard');
  
  // Data States
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [capacityFilter, setCapacityFilter] = useState<number | ''>('');

  // Modal States
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // --- Initial Fetch ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const resRooms = await api.get('/rooms?active=true');
      let fetchedRooms = resRooms.data;

      // 🟡 MOCK DATA: จำลองห้องเพิ่มเพื่อให้เห็น Layout เต็มจอ
      if (fetchedRooms.length < 5) {
        const mockRooms = [
          { id: 991, name: "Meeting A (Glass Room)", capacity: 10, location: "Floor 2", is_active: true, room_facilities: [{id:1, facility:{id:1, name:"WiFi"}}] },
          { id: 992, name: "Meeting B (Creative)", capacity: 6, location: "Floor 3", is_active: true, room_facilities: [{id:2, facility:{id:2, name:"TV"}}] },
          { id: 993, name: "Executive Hall", capacity: 20, location: "Floor 1", is_active: true, room_facilities: [{id:3, facility:{id:3, name:"Projector"}}] },
          { id: 994, name: "Focus Room 1", capacity: 2, location: "Floor 2", is_active: true, room_facilities: [{id:4, facility:{id:4, name:"Quiet Zone"}}] },
          { id: 995, name: "Focus Room 2", capacity: 2, location: "Floor 2", is_active: true, room_facilities: [{id:4, facility:{id:4, name:"Quiet Zone"}}] }
        ];
        fetchedRooms = [...fetchedRooms, ...mockRooms];
      }
      setRooms(fetchedRooms);

      // Mock History
      setBookings([
        { id: 1, start_time: new Date().toISOString(), end_time: new Date().toISOString(), purpose: 'Team Meeting', status: 'confirmed', room: fetchedRooms[0] },
      ]);

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLogout = () => {
    if (window.confirm('ยืนยันการออกจากระบบ?')) {
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  // --- 1. Dashboard View (Full Width) ---
  const DashboardView = () => {
    const filteredRooms = rooms.filter(room => {
      const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            room.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCapacity = capacityFilter === '' || room.capacity >= capacityFilter;
      return matchesSearch && matchesCapacity;
    });

    return (
      <Grid container spacing={3}>
        {/* === Top Stats Bar === */}
        <Grid item xs={12}>
           <Paper sx={{ p: 2, borderRadius: 3, display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mr: 2 }}>📊 Overview:</Typography>
              <Chip icon={<EventAvailable />} label={`ห้องว่าง: ${filteredRooms.length}`} color="success" variant="outlined" />
              <Chip icon={<AccessTime />} label="เวลา: 09:00 - 18:00" color="primary" variant="outlined" />
              <Box sx={{ flexGrow: 1 }} />
              <Button startIcon={<NotificationsActive />} size="small">การแจ้งเตือน (2)</Button>
           </Paper>
        </Grid>

        {/* === Left Content: Room Grid === */}
        <Grid item xs={12} lg={9} xl={10}>
          <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField 
                  fullWidth placeholder="🔍 ค้นหาห้อง..." variant="outlined" size="small"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>ความจุ</InputLabel>
                  <Select value={capacityFilter} label="ความจุ" onChange={(e) => setCapacityFilter(e.target.value as number)}>
                    <MenuItem value="">ทั้งหมด</MenuItem>
                    <MenuItem value={4}>4+</MenuItem>
                    <MenuItem value={10}>10+</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={2}>
                 <Button fullWidth variant="contained" onClick={fetchData}>Refresh</Button>
              </Grid>
            </Grid>
          </Paper>

          <Grid container spacing={2}>
            {filteredRooms.map((room) => (
              // ✅ ปรับ Grid ให้รองรับหน้าจอใหญ่พิเศษ (xl={3} คือโชว์ 4 ใบต่อแถว)
              <Grid item key={room.id} xs={12} sm={6} md={4} lg={4} xl={3}>
                <Card sx={{ 
                  height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, 
                  transition: '0.2s', border: '1px solid #eee',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 25px rgba(0,0,0,0.1)' } 
                }}>
                  <Box sx={{ 
                    height: 140, 
                    background: `linear-gradient(135deg, ${room.id % 2 === 0 ? '#3f51b5 0%, #2196f3 100%' : '#673ab7 0%, #9c27b0 100%'})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                  }}>
                      <EventAvailable sx={{ fontSize: 60, color: 'white', opacity: 0.8 }} />
                      <Tooltip title="Available">
                        <Box sx={{ width: 12, height: 12, bgcolor: '#4caf50', borderRadius: '50%', position: 'absolute', top: 12, right: 12, border: '2px solid white' }} />
                      </Tooltip>
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
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {room.room_facilities?.slice(0,3).map((rf, i) => (
                        <Chip key={i} label={rf.facility.name} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                      ))}
                    </Box>
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ p: 1.5 }}>
                    <Button fullWidth variant="contained" size="small" onClick={() => { setSelectedRoom(room); setIsModalOpen(true); }}>
                      จองทันที
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* === Right Sidebar: Schedule & Updates (Sticky) === */}
        <Grid item xs={12} lg={3} xl={2}>
          <Box sx={{ position: { lg: 'sticky' }, top: 20 }}>
            <Paper sx={{ p: 2, borderRadius: 3, mb: 3, bgcolor: '#fff3e0', border: '1px solid #ffe0b2' }}>
              <Typography variant="subtitle1" fontWeight="bold" color="#e65100" gutterBottom>
                📢 ประกาศด่วน
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ห้องประชุมชั้น 3 จะปิดปรับปรุงระบบไฟ วันเสาร์นี้ (09:00 - 12:00)
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventNote color="primary" /> ตารางของฉัน
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List disablePadding>
                 <Box sx={{ p: 1.5, mb: 1, borderRadius: 2, borderLeft: '4px solid #2196f3', bgcolor: '#f5f9ff' }}>
                    <Typography variant="caption" color="text.secondary">09:30 - 10:30</Typography>
                    <Typography variant="subtitle2" fontWeight="bold">Weekly Sync</Typography>
                    <Typography variant="caption">ห้อง Meeting A</Typography>
                 </Box>
                 <Box sx={{ p: 1.5, borderRadius: 2, borderLeft: '4px solid #4caf50', bgcolor: '#f0f9f0' }}>
                    <Typography variant="caption" color="text.secondary">14:00 - 15:30</Typography>
                    <Typography variant="subtitle2" fontWeight="bold">Interview Candidate</Typography>
                    <Typography variant="caption">ห้อง Focus 1</Typography>
                 </Box>
              </List>
              <Button fullWidth sx={{ mt: 2 }} size="small">ดูตารางทั้งหมด</Button>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    );
  };

  // --- 2. History View ---
  const HistoryView = () => (
    <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 3, p: 3 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>📜 ประวัติการจอง</Typography>
      <Divider sx={{ mb: 3 }} />
      <TableContainer>
        <Table>
          <TableHead sx={{ bgcolor: '#f5f5f5' }}>
            <TableRow>
              <TableCell>ห้อง</TableCell>
              <TableCell>วันที่ & เวลา</TableCell>
              <TableCell>จุดประสงค์</TableCell>
              <TableCell align="center">สถานะ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bookings.map((row) => (
              <TableRow key={row.id}>
                <TableCell fontWeight="bold">{row.room?.name}</TableCell>
                <TableCell>
                  <Typography variant="body2">{formatDate(row.start_time)}</Typography>
                  <Typography variant="caption" color="text.secondary">ถึง {formatDate(row.end_time)}</Typography>
                </TableCell>
                <TableCell>{row.purpose}</TableCell>
                <TableCell align="center"><Chip label={row.status} color="success" size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );

  // --- 3. Settings View ---
  const SettingsView = () => (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>⚙️ ตั้งค่าระบบ</Typography>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={4}>
          <Grid item xs={12} md={4} textAlign="center">
            <Avatar sx={{ width: 100, height: 100, mx: 'auto', mb: 2, bgcolor: '#1976d2' }}>AD</Avatar>
            <Button variant="outlined" size="small">Upload Photo</Button>
          </Grid>
          <Grid item xs={12} md={8}>
            <Stack spacing={2}>
              <TextField label="Display Name" defaultValue="Admin User" fullWidth />
              <TextField label="Email" defaultValue="admin@company.com" fullWidth />
              <TextField label="Department" defaultValue="IT Support" fullWidth />
              <Button variant="contained" size="large" sx={{ mt: 2 }}>Save Changes</Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );

  // --- Main Render ---
  return (
    <Box sx={{ display: 'flex', bgcolor: '#f0f2f5', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="absolute" open={open} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#1a2035', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <Toolbar sx={{ pr: '24px' }}>
          <IconButton edge="start" color="inherit" onClick={() => setOpen(!open)} sx={{ mr: 2 }}><MenuIcon /></IconButton>
          <Typography component="h1" variant="h6" color="inherit" noWrap sx={{ flexGrow: 1, fontWeight: 'bold', letterSpacing: 0.5 }}>
            🏢 Meeting Room System
          </Typography>
          <Button variant="contained" color="success" startIcon={<Add />} onClick={() => setIsCreateOpen(true)} sx={{ borderRadius: 20, px: 3 }}>
            New Room
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" open={open} sx={{ '& .MuiDrawer-paper': { position: 'relative', whiteSpace: 'nowrap', width: drawerWidth, transition: 'width 0.3s', boxSizing: 'border-box', borderRight: 'none', boxShadow: '2px 0 10px rgba(0,0,0,0.05)', ...( !open && { width: (theme) => theme.spacing(9), overflowX: 'hidden' }), } }}>
        <Toolbar />
        <List component="nav" sx={{ mt: 2 }}>
          <ListItemButton selected={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} sx={{ mb: 1, mx: 1, borderRadius: 2 }}>
            <ListItemIcon><Dashboard color={currentView === 'dashboard' ? 'primary' : 'inherit'} /></ListItemIcon>
            <ListItemText primary="Dashboard" primaryTypographyProps={{ fontWeight: currentView === 'dashboard' ? 'bold' : 'medium' }} />
          </ListItemButton>
          <ListItemButton selected={currentView === 'history'} onClick={() => setCurrentView('history')} sx={{ mb: 1, mx: 1, borderRadius: 2 }}>
            <ListItemIcon><History color={currentView === 'history' ? 'primary' : 'inherit'} /></ListItemIcon>
            <ListItemText primary="History" primaryTypographyProps={{ fontWeight: currentView === 'history' ? 'bold' : 'medium' }} />
          </ListItemButton>
          <ListItemButton selected={currentView === 'settings'} onClick={() => setCurrentView('settings')} sx={{ mb: 1, mx: 1, borderRadius: 2 }}>
            <ListItemIcon><Settings color={currentView === 'settings' ? 'primary' : 'inherit'} /></ListItemIcon>
            <ListItemText primary="Settings" primaryTypographyProps={{ fontWeight: currentView === 'settings' ? 'bold' : 'medium' }} />
          </ListItemButton>
        </List>
        <Box sx={{ flexGrow: 1 }} />
        <Divider sx={{ my: 1 }} />
        <List>
          <ListItemButton onClick={handleLogout} sx={{ mx: 1, borderRadius: 2, '&:hover': { bgcolor: '#ffebee' } }}>
            <ListItemIcon><Logout color="error" /></ListItemIcon>
            <ListItemText primary="Sign Out" primaryTypographyProps={{ color: 'error', fontWeight: 'bold' }} />
          </ListItemButton>
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, height: '100vh', overflow: 'auto', pt: 4, px: 3 }}>
        <Toolbar />
        {/* ✅ ใช้ maxWidth={false} เพื่อให้เต็มจอจริงๆ */}
        <Container maxWidth={false} sx={{ mt: 3, mb: 4 }}>
          {loading ? <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box> : (
            <>
              {currentView === 'dashboard' && <DashboardView />}
              {currentView === 'history' && <HistoryView />}
              {currentView === 'settings' && <SettingsView />}
            </>
          )}
        </Container>
      </Box>

      <BookingModal open={isModalOpen} handleClose={() => setIsModalOpen(false)} room={selectedRoom} onSuccess={fetchData} />
      <CreateRoomModal open={isCreateOpen} handleClose={() => setIsCreateOpen(false)} onSuccess={fetchData} />
    </Box>
  );
};

export default RoomList;