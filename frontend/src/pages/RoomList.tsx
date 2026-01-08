import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import {
  Box, CssBaseline, Drawer, AppBar, Toolbar, List, Typography, Divider, IconButton, 
  ListItemButton, ListItemIcon, ListItemText, Container, Grid, Paper, 
  Button, Card, CardContent, TextField, 
  MenuItem, Select, FormControl, CircularProgress, 
  Stack, Avatar, Menu, Tooltip, Chip, Tab, Tabs,
  Fade, Grow, Dialog, DialogTitle, DialogContent, DialogActions,
  OutlinedInput, InputLabel, Checkbox
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, History, Logout, LocationOn, Person, AdminPanelSettings,
  ChevronLeft, Edit, CalendarMonth, GridView, 
  Construction, Event, Schedule, Search, EventNote, Cancel,
  Bolt // เพิ่มไอคอนเท่ๆ
} from '@mui/icons-material';
import { styled } from '@mui/material/styles'; 
import Swal from 'sweetalert2';

import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import api from '../api/axios';
import type { MeetingRoom, Booking } from '../types';
import BookingModal from '../components/BookingModal';
import NotificationBell from '../components/NotificationBell';
import ChatWidget from '../components/ChatWidget';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const drawerWidth = 280;

const statusMap: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed'
};

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })<{ open?: boolean }>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create('margin', { easing: theme.transitions.easing.easeOut, duration: theme.transitions.duration.enteringScreen }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && { marginLeft: 0 }),
}));

// ✨ AppBar แบบ Glassmorphism
const AppBarStyled = styled(AppBar, { shouldForwardProp: (prop) => prop !== 'open' })<{ open?: boolean }>(({ theme, open }) => ({
  background: 'rgba(255, 255, 255, 0.7)', // โปร่งแสง
  backdropFilter: 'blur(20px)', // เบลอฉากหลัง
  color: '#1e293b',
  boxShadow: 'none',
  borderBottom: '1px solid rgba(255, 255, 255, 0.5)',
  transition: theme.transitions.create(['margin', 'width'], { easing: theme.transitions.easing.easeOut, duration: theme.transitions.duration.enteringScreen }),
  ...(open && { width: `calc(100% - ${drawerWidth}px)`, marginLeft: drawerWidth }),
}));

const RoomList = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'history'>('dashboard');
  const [dashboardTab, setDashboardTab] = useState(0); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', profile_picture: '' });

  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]); 
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [capacityFilter, setCapacityFilter] = useState<number | ''>('');
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [calendarRoomFilter, setCalendarRoomFilter] = useState<number[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let userId: number | null = null;

      if (token) {
        const decoded: any = jwtDecode(token);
        setIsAdmin(decoded.role === 'admin');
        userId = decoded.sub;
        
        try {
            const resProfile = await api.get('/auth/profile');
            setUserProfile(resProfile.data);
            setEditForm({first_name: resProfile.data.first_name || '', last_name: resProfile.data.last_name || '', profile_picture: resProfile.data.profile_picture || ''});
        } catch (e) {}
        try {
            const resHistory = await api.get(`/bookings/my-history?userId=${userId}`);
            setMyBookings(resHistory.data);
        } catch (e) {}
      }
      try {
        const resRooms = await api.get('/rooms?active=true');
        setRooms(resRooms.data);
      } catch (e) {}
      
      try {
        let bookingsForCalendar: Booking[] = [];
        const resAll = await api.get('/bookings?limit=1000');
        
        if (resAll.data && Array.isArray(resAll.data.data)) {
            bookingsForCalendar = resAll.data.data;
        } else if (Array.isArray(resAll.data)) {
            bookingsForCalendar = resAll.data;
        }

        const events = bookingsForCalendar
            .filter(b => ['approved', 'pending'].includes(b.status))
            .map(b => ({
                title: `${b.room?.name} - ${b.user?.first_name || 'User'} (${statusMap[b.status] || b.status})`, 
                start: new Date(b.start_time), 
                end: new Date(b.end_time), 
                resource: b.status,
                roomId: b.room?.id
            }));
        setCalendarEvents(events);
      } catch (e) { console.error("Calendar fetch error:", e); }

    } catch (err) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleLogout = () => {
    Swal.fire({
      title: 'Are you sure?', text: 'Do you want to logout?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Yes, Logout', cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    });
  };

  const handleCancelBooking = async (id: number) => {
    Swal.fire({
      title: 'Cancel Booking?',
      text: "Are you sure you want to cancel this booking?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, Cancel it',
      cancelButtonText: 'No'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.patch(`/bookings/${id}/cancel`); 
          Swal.fire('Cancelled!', 'Your booking has been cancelled.', 'success');
          fetchData(); 
        } catch (error: any) {
          Swal.fire('Error', error.response?.data?.message || 'Failed to cancel booking.', 'error');
        }
      }
    });
  };

  const handleUpdateProfile = async () => {
    try { await api.patch('/auth/profile', editForm); Swal.fire('Success!', 'Profile updated successfully.', 'success'); setEditProfileOpen(false); fetchData(); } catch (error) { Swal.fire('Error!', 'Failed to update profile.', 'error'); }
  };

  const getVisibleCalendarEvents = () => {
    if (calendarRoomFilter.length === 0) return calendarEvents; 
    return calendarEvents.filter(event => calendarRoomFilter.includes(event.roomId));
  };

  const renderRoomGrid = () => {
    const filteredRooms = rooms.filter(room => {
      const matchesSearch = room.name.toLowerCase().includes(searchTerm.toLowerCase()) || room.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCapacity = capacityFilter === '' || room.capacity >= capacityFilter;
      return matchesSearch && matchesCapacity;
    });

    return (
      <Grid container spacing={3}>
        {filteredRooms.length === 0 ? (
            <Grid item xs={12}><Typography variant="h6" align="center" color="text.secondary" sx={{ mt: 4 }}>No rooms found matching your search.</Typography></Grid>
        ) : (
            filteredRooms.map((room, index) => (
            <Grow in={true} timeout={(index + 1) * 200} key={room.id}>
                <Grid item xs={12} sm={6} md={4} lg={3}>
                    {/* ✨ Modern Card Design V2: เน้นรูปภาพใหญ่ๆ ตัวหนังสือทับภาพ */}
                    <Card sx={{ 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        borderRadius: '28px', // โค้งมนสะใจ
                        border: '1px solid rgba(255, 255, 255, 0.6)', 
                        bgcolor: 'rgba(255, 255, 255, 0.6)', // Glassmorphism
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', 
                        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)', // Animation เด้งๆ
                        overflow: 'hidden',
                        position: 'relative',
                        cursor: 'pointer',
                        '&:hover': { 
                            transform: 'translateY(-12px)', // ลอยขึ้นสูง
                            boxShadow: '0 20px 25px -5px rgba(99, 102, 241, 0.2)',
                            borderColor: '#818cf8',
                            '& .room-image': { transform: 'scale(1.1)' },
                            '& .book-btn': { width: '90%', opacity: 1 } 
                        } 
                    }}>
                        <Box sx={{ position: 'relative', height: 260, overflow: 'hidden' }}>
                            <Box 
                                className="room-image"
                                sx={{ 
                                    width: '100%', height: '100%', 
                                    backgroundImage: room.image_url ? `url(${room.image_url})` : `linear-gradient(135deg, #6366f1 0%, #ec4899 100%)`, 
                                    backgroundSize: 'cover', backgroundPosition: 'center',
                                    transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                                }} 
                            />
                            {/* Gradient Overlay ด้านล่างเพื่อให้ตัวหนังสือชัด */}
                            <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '70%', background: 'linear-gradient(to top, rgba(15, 23, 42, 0.9) 0%, transparent 100%)' }} />
                            
                            {/* Status Tag */}
                            <Chip 
                                icon={room.is_active ? <Bolt sx={{color:'#fff !important'}}/> : undefined}
                                label={room.is_active ? "Available" : "Busy"} 
                                size="small" 
                                sx={{ 
                                    position: 'absolute', top: 16, right: 16,
                                    fontWeight: '800', 
                                    backdropFilter: 'blur(12px)', 
                                    bgcolor: room.is_active ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)', 
                                    color: 'white',
                                    borderRadius: '50px',
                                    px: 0.5,
                                    border: '1px solid rgba(255,255,255,0.3)'
                                }} 
                            />
                            
                            {/* ชื่อห้อง และ Location อยู่บนรูป */}
                            <Box sx={{ position: 'absolute', bottom: 16, left: 20, right: 20 }}>
                                <Typography variant="h5" sx={{ color: 'white', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.5)', lineHeight: 1.2, mb: 0.5 }}>
                                    {room.name}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.9 }}>
                                    <LocationOn sx={{ color: '#94a3b8', fontSize: 16 }} />
                                    <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 500 }}>{room.location}</Typography>
                                </Box>
                            </Box>
                        </Box>

                        <CardContent sx={{ flexGrow: 1, p: 2, pt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ p: 1, borderRadius: '50%', bgcolor: '#f1f5f9', display: 'flex' }}>
                                    <Person sx={{ fontSize: 20, color: '#64748b' }}/>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold">CAPACITY</Typography>
                                    <Typography variant="body2" fontWeight="700" color="#334155">{room.capacity} People</Typography>
                                </Box>
                           </Box>
                           {/* Rating หรือ Feature อื่นๆ (Mockup) */}
                           
                        </CardContent>
                        
                        {/* ปุ่มจอง ลอยขึ้นมาเมื่อ Hover */}
                        <Box sx={{ p: 2, pt: 0, display: 'flex', justifyContent: 'center' }}>
                            <Button 
                                className="book-btn"
                                fullWidth 
                                variant="contained" 
                                onClick={() => { setSelectedRoom(room); setIsModalOpen(true); }} 
                                sx={{ 
                                    borderRadius: '50px', 
                                    py: 1.5, 
                                    textTransform: 'none', 
                                    fontWeight: '700', 
                                    fontSize: '1rem',
                                    background: 'linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%)', // Gradient ม่วง-น้ำเงิน
                                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                                    transition: 'all 0.3s ease',
                                    width: '100%', // ปกติเต็ม
                                    '&:hover': { 
                                        background: 'linear-gradient(135deg, #4338ca 0%, #7c3aed 100%)',
                                        boxShadow: '0 8px 25px rgba(99, 102, 241, 0.6)',
                                        transform: 'scale(1.05)'
                                    }
                                }}
                            >
                                Book This Space
                            </Button>
                        </Box>
                    </Card>
                </Grid>
            </Grow>
            ))
        )}
      </Grid>
    );
  };

  const renderDashboard = () => (
    <Box>
       {/* ✨ Header Banner แบบใหม่ */}
       <Paper 
        elevation={0}
        sx={{ 
            p: { xs: 3, md: 6 }, mb: 5, borderRadius: '32px', 
            background: 'linear-gradient(120deg, #1e293b 0%, #0f172a 100%)',
            position: 'relative', overflow: 'hidden',
            boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.3)',
            border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Abstract Pattern พื้นหลัง */}
          <Box sx={{ position: 'absolute', top: -50, right: -50, width: 300, height: 300, background: 'radial-gradient(circle, rgba(99,102,241,0.4) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)' }} />
          <Box sx={{ position: 'absolute', bottom: -50, left: 100, width: 250, height: 250, background: 'radial-gradient(circle, rgba(236,72,153,0.3) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(40px)' }} />

          <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <Typography variant="h2" fontWeight="900" sx={{ 
                background: 'linear-gradient(to right, #fff, #cbd5e1)', 
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                letterSpacing: '-1.5px', mb: 1
            }}>
                Find Your Flow 🌊
            </Typography>
            <Typography variant="h6" sx={{ color: '#94a3b8', mb: 5, fontWeight: 400, maxWidth: 600, mx: 'auto' }}>
                Discover the perfect space for your next meeting, brainstorming session, or quiet work time.
            </Typography>
            
            <Paper 
                elevation={10} 
                sx={{ 
                    p: 1, display: 'flex', alignItems: 'center', borderRadius: '50px', 
                    width: '100%', maxWidth: 600, mx: 'auto',
                    bgcolor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    border: '4px solid rgba(255,255,255,0.2)'
                }}
            >
                 <IconButton sx={{ p: '12px', ml: 1 }} aria-label="search"><Search color="primary" /></IconButton>
                 <TextField 
                    fullWidth 
                    placeholder="Search rooms..." 
                    variant="standard" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    InputProps={{ disableUnderline: true, sx: { fontSize: '1rem', fontWeight: 500 } }} 
                />
                <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
                <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
                    <Select 
                        disableUnderline 
                        value={capacityFilter} 
                        onChange={(e) => setCapacityFilter(e.target.value as number)} 
                        displayEmpty
                        sx={{ fontWeight: '700', color: '#475569', fontSize: '0.9rem', textAlign: 'center' }}
                    >
                        <MenuItem value="">Any Size</MenuItem><MenuItem value={4}>Small (4+)</MenuItem><MenuItem value={10}>Medium (10+)</MenuItem><MenuItem value={20}>Large (20+)</MenuItem>
                    </Select>
                </FormControl>
            </Paper>
          </Box>
       </Paper>

       <Box sx={{ borderBottom: 1, borderColor: 'rgba(0,0,0,0.05)', mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Tabs value={dashboardTab} onChange={(_, v) => setDashboardTab(v)} textColor="primary" indicatorColor="primary" sx={{ '& .MuiTab-root': { fontSize: '1rem', fontWeight: 700, borderRadius: 2 } }}>
             <Tab icon={<GridView />} label="All Rooms" iconPosition="start" />
             <Tab icon={<CalendarMonth />} label="Availability Calendar" iconPosition="start" />
          </Tabs>

          {dashboardTab === 1 && (
             <FormControl sx={{ minWidth: 250, mr: 2 }} size="small">
                <InputLabel id="calendar-room-filter-label">Filter by Rooms</InputLabel>
                <Select
                  labelId="calendar-room-filter-label"
                  multiple
                  value={calendarRoomFilter}
                  onChange={(e) => {
                    const { value } = e.target;
                    setCalendarRoomFilter(typeof value === 'string' ? value.split(',').map(Number) : value as number[]);
                  }}
                  input={<OutlinedInput label="Filter by Rooms" sx={{borderRadius: 3}} />}
                  renderValue={(selected) => {
                      if (selected.length === 0) return "All Rooms";
                      return rooms.filter(r => selected.includes(r.id)).map(r => r.name).join(', ');
                  }}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 300, borderRadius: 3 } } }}
                >
                  <MenuItem disabled value="">
                    <em>Select Rooms to View</em>
                  </MenuItem>
                  {rooms.map((room) => (
                    <MenuItem key={room.id} value={room.id}>
                      <Checkbox checked={calendarRoomFilter.indexOf(room.id) > -1} />
                      <ListItemText primary={room.name} />
                    </MenuItem>
                  ))}
                </Select>
             </FormControl>
          )}
       </Box>

       {dashboardTab === 0 ? renderRoomGrid() : (
         <Paper sx={{ p: 3, borderRadius: '24px', height: 650, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0' }}>
            <Calendar 
                localizer={localizer} 
                events={getVisibleCalendarEvents()} 
                startAccessor="start" 
                endAccessor="end" 
                style={{ height: '100%', fontFamily: 'Plus Jakarta Sans' }} 
                eventPropGetter={(event) => ({
                    style: { 
                        backgroundColor: event.resource === 'approved' ? '#10b981' : event.resource === 'pending' ? '#f59e0b' : '#64748b',
                        borderRadius: '8px', border: 'none', fontWeight: 600, fontSize: '0.85rem'
                    }
                })}
            />
         </Paper>
       )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBarStyled position="fixed" open={open}>
        <Toolbar sx={{ height: 70 }}>
          <IconButton color="inherit" onClick={() => setOpen(true)} edge="start" sx={{ mr: 2, ...(open && { display: 'none' }) }}><MenuIcon /></IconButton>
          
          <Typography variant="h5" noWrap sx={{ flexGrow: 1, fontWeight: '900', letterSpacing: '-0.5px', background: 'linear-gradient(90deg, #4f46e5, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Meeting<span style={{fontWeight: 300}}>Room</span>
          </Typography>

          {isAdmin && <Button variant="outlined" color="primary" startIcon={<AdminPanelSettings />} onClick={() => navigate('/admin')} sx={{ mr: 2, borderRadius: 2, textTransform: 'none', border: '2px solid' }}>Admin Console</Button>}
          
          <NotificationBell />

          <Box sx={{ flexGrow: 0, ml: 1 }}>
            <Tooltip title="Account settings">
              <IconButton onClick={(e) => setAnchorElUser(e.currentTarget)} sx={{ p: 0.5, border: '2px solid #e2e8f0', borderRadius: '50%', bgcolor: 'white' }}>
                <Avatar src={userProfile?.profile_picture} sx={{ width: 40, height: 40 }}>{userProfile?.first_name?.[0]}</Avatar>
              </IconButton>
            </Tooltip>
            <Menu 
                anchorEl={anchorElUser} 
                open={Boolean(anchorElUser)} 
                onClose={() => setAnchorElUser(null)} 
                sx={{ mt: 1.5 }}
                PaperProps={{ elevation: 4, sx: { borderRadius: 3, minWidth: 200 } }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle2" fontWeight="bold">{userProfile?.username}</Typography>
                <Typography variant="caption" color="text.secondary">User</Typography>
              </Box>
              <Divider />
              <MenuItem onClick={() => { setEditProfileOpen(true); setAnchorElUser(null); }}> <ListItemIcon><Edit fontSize="small" /></ListItemIcon> Edit Profile </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: '#ef4444' }}> <ListItemIcon><Logout fontSize="small" sx={{ color: '#ef4444' }} /></ListItemIcon> Logout </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBarStyled>

      <Drawer 
        sx={{ 
            width: drawerWidth, 
            flexShrink: 0, 
            '& .MuiDrawer-paper': { 
                width: drawerWidth, boxSizing: 'border-box', borderRight: 'none', 
                boxShadow: '4px 0 24px rgba(0,0,0,0.02)',
                backgroundColor: 'rgba(255,255,255,0.8)', // Glassmorphism Drawer
                backdropFilter: 'blur(10px)'
            } 
        }} 
        variant="persistent" anchor="left" open={open}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3, height: 70 }}>
          <Typography variant="h6" fontWeight="800" color="#334155">MAIN MENU</Typography>
          <IconButton onClick={() => setOpen(false)} sx={{ bgcolor: '#f1f5f9' }}><ChevronLeft /></IconButton>
        </Box>
        <List sx={{ px: 2, pt: 2 }}>
          <ListItemButton selected={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} sx={{ borderRadius: 3, mb: 1, py: 1.5, '&.Mui-selected': { bgcolor: '#e0e7ff', color: '#4338ca' } }}>
            <ListItemIcon><Dashboard sx={{ color: currentView === 'dashboard' ? '#4338ca' : '#94a3b8' }} /></ListItemIcon> 
            <ListItemText primary="Book a Room" primaryTypographyProps={{fontWeight: 'bold'}} />
          </ListItemButton>
          <ListItemButton selected={currentView === 'history'} onClick={() => setCurrentView('history')} sx={{ borderRadius: 3, mb: 1, py: 1.5, '&.Mui-selected': { bgcolor: '#e0e7ff', color: '#4338ca' } }}>
            <ListItemIcon><History sx={{ color: currentView === 'history' ? '#4338ca' : '#94a3b8' }} /></ListItemIcon> 
            <ListItemText primary="Booking History" primaryTypographyProps={{fontWeight: 'bold'}} />
          </ListItemButton>
        </List>
      </Drawer>

      <Main open={open}>
        <Toolbar sx={{ height: 70 }} />
        <Container maxWidth="xl" sx={{ mt: 4, mb: 10 }}>
          {loading ? (
             <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" mt={10}>
                <CircularProgress size={60} thickness={4} sx={{ color: '#6366f1' }} />
                <Typography sx={{ mt: 2, color: '#64748b', fontWeight: 'bold' }}>Loading data...</Typography>
             </Box>
          ) : (
            currentView === 'dashboard' ? renderDashboard() : (
              <Fade in={true}>
              <Paper sx={{ p: 4, borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minHeight: 600, border: '1px solid #f1f5f9' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#e0e7ff', color: '#4338ca', width: 56, height: 56 }}><History fontSize="large"/></Avatar>
                    <Box>
                        <Typography variant="h5" fontWeight="800" color="#1e293b">My Booking History</Typography>
                        <Typography variant="body2" color="text.secondary">All your booking requests and history.</Typography>
                    </Box>
                </Box>
                
                {myBookings.length === 0 ? <Box sx={{ textAlign: 'center', py: 10, opacity: 0.6 }}><EventNote fontSize="large" sx={{ fontSize: 80, color: '#cbd5e1', mb: 2 }}/><Typography variant="h6" color="text.secondary">No booking history found.</Typography></Box> : 
                <Grid container spacing={3}>
                    {myBookings.map((b) => (
                    <Grid item xs={12} key={b.id}>
                        <Paper variant="outlined" sx={{ p: 3, borderRadius: 4, border: '1px solid #e2e8f0', transition: 'all 0.2s', '&:hover': { borderColor: '#6366f1', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.1)' } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box>
                                    <Typography variant="h6" fontWeight="bold" color="#1e293b">{b.room?.name}</Typography>
                                    {b.purpose && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>📝 "{b.purpose}"</Typography>}
                                </Box>
                                <Chip 
                                    label={statusMap[b.status] || b.status} 
                                    color={b.status==='approved'?'success':b.status==='completed'?'info':b.status==='pending'?'warning':'error'} 
                                    variant={b.status==='pending'?'outlined':'filled'} 
                                    sx={{fontWeight:'800', borderRadius: 2}} 
                                />
                            </Box>
                            <Divider sx={{ borderStyle: 'dashed', my: 2 }} />
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Stack direction="row" spacing={4}>
                                        <Box><Typography variant="caption" color="text.secondary" fontWeight="bold">DATE</Typography><Typography variant="body1" fontWeight="600" sx={{display:'flex', alignItems:'center', gap:1}}><Event color="primary" fontSize="small"/> {new Date(b.start_time).toLocaleDateString('en-GB')}</Typography></Box>
                                        <Box><Typography variant="caption" color="text.secondary" fontWeight="bold">TIME</Typography><Typography variant="body1" fontWeight="600" sx={{display:'flex', alignItems:'center', gap:1}}><Schedule color="primary" fontSize="small"/> {new Date(b.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(b.end_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Typography></Box>
                                    </Stack>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block" sx={{mb:1}}>ADD-ONS</Typography>
                                    {b.booking_facilities?.length ? <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{b.booking_facilities.map((bf:any, i:number)=><Chip key={i} icon={<Construction style={{fontSize:14}}/>} label={`${bf.facility?.name} x${bf.quantity}`} size="small" sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 600 }} />)}</Box> : <Typography variant="body2" color="text.secondary">-</Typography>}
                                </Grid>
                            </Grid>
                            
                            {['pending', 'approved'].includes(b.status) && (
                              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', pt: 2 }}>
                                <Button 
                                  variant="outlined" 
                                  color="error" 
                                  size="small"
                                  startIcon={<Cancel />}
                                  onClick={() => handleCancelBooking(b.id)}
                                  sx={{ borderRadius: 2, fontWeight: 'bold', textTransform: 'none', border: '2px solid' }}
                                >
                                  Cancel Booking
                                </Button>
                              </Box>
                            )}

                        </Paper>
                    </Grid>
                    ))}
                </Grid>
                }
              </Paper>
              </Fade>
            )
          )}
        </Container>

        {userProfile && (
            <ChatWidget 
                userId={userProfile.id} 
                role={userProfile.role || 'user'} 
            />
        )}

      </Main>

      <BookingModal open={isModalOpen} handleClose={() => setIsModalOpen(false)} room={selectedRoom} onSuccess={() => { fetchData(); Swal.fire('Success!', 'Booking request sent successfully.', 'success'); }} />
      <Dialog open={editProfileOpen} onClose={() => setEditProfileOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}><DialogTitle sx={{ fontWeight: 'bold' }}>Edit Profile</DialogTitle><DialogContent dividers><Stack spacing={3} sx={{ mt: 1 }}><Box display="flex" justifyContent="center"><Avatar src={editForm.profile_picture} sx={{ width: 100, height: 100, border: '4px solid #f8fafc', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /></Box><TextField label="First Name" fullWidth value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} variant="outlined" /><TextField label="Last Name" fullWidth value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} variant="outlined" /><TextField label="Profile Picture URL" fullWidth value={editForm.profile_picture} onChange={e => setEditForm({...editForm, profile_picture: e.target.value})} variant="outlined" placeholder="https://..." /></Stack></DialogContent><DialogActions sx={{ p: 3 }}><Button onClick={() => setEditProfileOpen(false)} size="large" sx={{ color: '#64748b' }}>Cancel</Button><Button onClick={handleUpdateProfile} variant="contained" size="large" sx={{ borderRadius: 2, px: 4, background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' }}>Save Changes</Button></DialogActions></Dialog>
    </Box>
  );
};

export default RoomList;