import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import {
  Box, CssBaseline, Drawer, AppBar, Toolbar, List, Typography, Divider, IconButton, 
  ListItemButton, ListItemIcon, ListItemText, Container, Grid, Paper, 
  Button, Card, CardContent, TextField, 
  MenuItem, Select, FormControl, CircularProgress, 
  Stack, Avatar, Menu, Tooltip, Chip, Tab, Tabs,
  Fade, Grow, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Menu as MenuIcon, Dashboard, History, Logout, 
  EventAvailable, LocationOn, Person, AdminPanelSettings,
  ChevronLeft, Edit, CalendarMonth, GridView, 
  Construction, Event, Schedule, Search, EventNote, Cancel
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

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const drawerWidth = 280;

// ✅ 1. Status Mapping (English)
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

const AppBarStyled = styled(AppBar, { shouldForwardProp: (prop) => prop !== 'open' })<{ open?: boolean }>(({ theme, open }) => ({
  background: 'rgba(255, 255, 255, 0.8)',
  backdropFilter: 'blur(12px)',
  color: '#1e293b',
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.03)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let userId: number | null = null;
      let userRole: string | null = null;

      if (token) {
        const decoded: any = jwtDecode(token);
        setIsAdmin(decoded.role === 'admin');
        userId = decoded.sub;
        userRole = decoded.role;
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
        if (userRole === 'admin') {
            const resAll = await api.get('/bookings');
            bookingsForCalendar = resAll.data;
        } else {
            const resMy = await api.get(`/bookings/my-history?userId=${userId}`);
            bookingsForCalendar = resMy.data;
        }
        const events = bookingsForCalendar.filter(b => b.status === 'approved' || b.status === 'pending' || b.status === 'completed').map(b => ({
                title: `${b.room?.name} (${statusMap[b.status] || b.status})`, 
                start: new Date(b.start_time), 
                end: new Date(b.end_time), 
                resource: b.status
            }));
        setCalendarEvents(events);
      } catch (e) {}
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
                    <Card sx={{ 
                        height: '100%', display: 'flex', flexDirection: 'column', 
                        borderRadius: 5, border: 'none', 
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', 
                        transition: '0.3s ease-in-out',
                        overflow: 'hidden',
                        '&:hover': { 
                            transform: 'translateY(-8px)', 
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' 
                        } 
                    }}>
                    <Box sx={{ 
                        height: 200, 
                        backgroundImage: room.image_url ? `url(${room.image_url})` : `linear-gradient(135deg, ${room.id%2===0 ? '#6366f1' : '#8b5cf6'} 0%, #4338ca 100%)`, 
                        backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', p: 2, position: 'relative' 
                    }}>
                        <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(0,0,0,0.6) 100%)' }} />
                        
                        {!room.image_url && <EventAvailable sx={{ fontSize: 80, color: 'rgba(255,255,255,0.2)', position: 'absolute', bottom: -10, left: -10 }} />}
                        
                        <Chip 
                            label={room.is_active ? "Available" : "Busy"} 
                            size="small" 
                            sx={{ 
                                fontWeight: 'bold', backdropFilter: 'blur(8px)', 
                                bgcolor: room.is_active ? 'rgba(220, 252, 231, 0.9)' : 'rgba(254, 226, 226, 0.9)', 
                                color: room.is_active ? '#15803d' : '#b91c1c',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }} 
                        />
                    </Box>
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                        <Typography variant="h6" fontWeight="800" gutterBottom sx={{color: '#1e293b'}}>{room.name}</Typography>
                        <Stack spacing={1.5} mt={1}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#64748b' }}>
                                <Avatar sx={{ width: 28, height: 28, bgcolor: '#f1f5f9', color: '#64748b' }}><LocationOn fontSize="small"/></Avatar>
                                <Typography variant="body2">{room.location}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#64748b' }}>
                                <Avatar sx={{ width: 28, height: 28, bgcolor: '#f1f5f9', color: '#64748b' }}><Person fontSize="small"/></Avatar>
                                <Typography variant="body2">Capacity: {room.capacity} ppl</Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                    <Box sx={{ p: 2, pt: 0 }}>
                        <Button 
                            fullWidth 
                            variant="contained" 
                            onClick={() => { setSelectedRoom(room); setIsModalOpen(true); }} 
                            sx={{ 
                                borderRadius: 3, py: 1.2, textTransform: 'none', fontWeight: 'bold', fontSize: '1rem',
                                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.3)',
                                '&:hover': { boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.4)' }
                            }}
                        >
                            Book Now
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
       <Paper 
        elevation={0}
        sx={{ 
            p: { xs: 3, md: 5 }, mb: 5, borderRadius: 5, 
            background: 'linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.7)), url(https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80)',
            backgroundSize: 'cover', backgroundPosition: 'center',
            color: 'white', position: 'relative', overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
        }}>
          <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 800 }}>
            <Typography variant="h3" fontWeight="900" gutterBottom sx={{ letterSpacing: '-1px' }}>
                Find Your Perfect Space 🏢
            </Typography>
            <Typography variant="h6" sx={{opacity:0.9, mb:4, fontWeight: 300}}>
                Easy and fast online meeting room booking with full facilities.
            </Typography>
            
            <Paper elevation={4} sx={{ p: 1, display: 'flex', alignItems: 'center', borderRadius: 4, width: '100%', maxWidth: 700 }}>
                 <IconButton sx={{ p: '10px' }} aria-label="search"><Search color="primary" /></IconButton>
                 <TextField 
                    fullWidth 
                    placeholder="Search for rooms or locations..." 
                    variant="standard" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    InputProps={{ disableUnderline: true, sx: { fontSize: '1.1rem' } }} 
                />
                <Divider sx={{ height: 28, m: 0.5 }} orientation="vertical" />
                <FormControl variant="standard" sx={{ m: 1, minWidth: 120 }}>
                    <Select 
                        disableUnderline 
                        value={capacityFilter} 
                        onChange={(e) => setCapacityFilter(e.target.value as number)} 
                        displayEmpty
                        sx={{ fontWeight: 'bold', color: '#475569' }}
                    >
                        <MenuItem value="">All (Capacity)</MenuItem><MenuItem value={4}>4+ ppl</MenuItem><MenuItem value={10}>10+ ppl</MenuItem><MenuItem value={20}>20+ ppl</MenuItem>
                    </Select>
                </FormControl>
            </Paper>
          </Box>
       </Paper>

       <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs value={dashboardTab} onChange={(_, v) => setDashboardTab(v)} textColor="primary" indicatorColor="primary">
             <Tab icon={<GridView />} label="Room List" iconPosition="start" sx={{ fontWeight: 'bold', fontSize: '1rem', textTransform: 'none' }} />
             <Tab icon={<CalendarMonth />} label="Booking Calendar" iconPosition="start" sx={{ fontWeight: 'bold', fontSize: '1rem', textTransform: 'none' }} />
          </Tabs>
       </Box>

       {dashboardTab === 0 ? renderRoomGrid() : (
         <Paper sx={{ p: 3, borderRadius: 4, height: 650, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <Calendar 
                localizer={localizer} 
                events={calendarEvents} 
                startAccessor="start" 
                endAccessor="end" 
                style={{ height: '100%', fontFamily: 'Inter' }} 
                eventPropGetter={(event) => ({
                    style: { 
                        backgroundColor: event.resource === 'approved' ? '#10b981' : event.resource === 'pending' ? '#f59e0b' : '#64748b',
                        borderRadius: '6px', border: 'none'
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
          
          <Box sx={{ flexGrow: 0 }}>
            <Tooltip title="Account settings">
              <IconButton onClick={(e) => setAnchorElUser(e.currentTarget)} sx={{ p: 0.5, border: '2px solid #e2e8f0', borderRadius: '50%' }}>
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
                backgroundColor: '#ffffff'
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
              <Paper sx={{ p: 4, borderRadius: 5, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minHeight: 600 }}>
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
      </Main>

      <BookingModal open={isModalOpen} handleClose={() => setIsModalOpen(false)} room={selectedRoom} onSuccess={() => { fetchData(); Swal.fire('Success!', 'Booking request sent successfully.', 'success'); }} />
      <Dialog open={editProfileOpen} onClose={() => setEditProfileOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}><DialogTitle sx={{ fontWeight: 'bold' }}>Edit Profile</DialogTitle><DialogContent dividers><Stack spacing={3} sx={{ mt: 1 }}><Box display="flex" justifyContent="center"><Avatar src={editForm.profile_picture} sx={{ width: 100, height: 100, border: '4px solid #f8fafc', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /></Box><TextField label="First Name" fullWidth value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} variant="outlined" /><TextField label="Last Name" fullWidth value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} variant="outlined" /><TextField label="Profile Picture URL" fullWidth value={editForm.profile_picture} onChange={e => setEditForm({...editForm, profile_picture: e.target.value})} variant="outlined" placeholder="https://..." /></Stack></DialogContent><DialogActions sx={{ p: 3 }}><Button onClick={() => setEditProfileOpen(false)} size="large" sx={{ color: '#64748b' }}>Cancel</Button><Button onClick={handleUpdateProfile} variant="contained" size="large" sx={{ borderRadius: 2, px: 4, background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' }}>Save Changes</Button></DialogActions></Dialog>
    </Box>
  );
};

export default RoomList;