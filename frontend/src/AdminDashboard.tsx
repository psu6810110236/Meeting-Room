import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api/axios'; 
import './App.css';
import type { Booking, Facility, MeetingRoom as Room } from './types';
import Swal from 'sweetalert2';

// MUI Imports
import { 
  AppBar, Toolbar, Typography, Button, Container, Box, Grid, Chip, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, 
  Card, CardContent, Divider, Avatar, TextField, InputAdornment, Tabs, Tab, Stack
} from '@mui/material';
import { 
  ArrowBack, MeetingRoom, Inventory, 
  EventNote, AddCircle, Assessment, Construction, Delete, 
  CheckCircle, Cancel, Reply, Image, Search, Dashboard as DashboardIcon
} from '@mui/icons-material';

// Charts
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';

// ✅ Fix Recharts for React 18+
const SafeResponsiveContainer = ResponsiveContainer as any;
const SafePieChart = PieChart as any;
const SafePie = Pie as any;
const SafeBarChart = BarChart as any;
const SafeBar = Bar as any;
const SafeXAxis = XAxis as any;
const SafeYAxis = YAxis as any;
const SafeTooltip = RechartsTooltip as any;
const SafeLegend = Legend as any;
const SafeCartesianGrid = CartesianGrid as any;
const SafeCell = Cell as any; 

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function AdminDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  
  // State for Inputs
  const [newRoom, setNewRoom] = useState({ name: '', capacity: 0, location: '', image_url: '' });
  const [newFacility, setNewFacility] = useState({ name: '', stock: 1 });
  const [tabValue, setTabValue] = useState(0); // 0 = Rooms, 1 = Facilities

  // Stats
  const [statusStats, setStatusStats] = useState<{ name: string; value: number }[]>([]);
  const [roomStats, setRoomStats] = useState<{ name: string; count: number }[]>([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, activeRooms: 0 });

  const fetchData = async () => {
    try {
      const [resBookings, resRooms, resFacilities] = await Promise.all([
        api.get('/bookings'),
        api.get('/rooms'),
        api.get('/facilities')
      ]);
      setBookings(resBookings.data);
      setRooms(resRooms.data);
      setFacilities(resFacilities.data);
      calculateStats(resBookings.data, resRooms.data);
    } catch (error) { console.error("Error fetching data:", error); }
  };

  useEffect(() => { fetchData(); }, []);

  const calculateStats = (bookingData: Booking[], roomData: Room[]) => {
    // 1. Status Pie Chart
    const statusCount = bookingData.reduce((acc: Record<string, number>, curr) => { 
      const status = curr.status || 'unknown';
      acc[status] = (acc[status] || 0) + 1; 
      return acc; 
    }, {});
    setStatusStats(Object.keys(statusCount).map(key => ({ name: key.toUpperCase(), value: statusCount[key] })));

    // 2. Room Popularity Bar Chart
    const roomCount = bookingData.reduce((acc: Record<string, number>, curr) => { 
      const n = curr.room?.name || 'Unknown'; 
      acc[n] = (acc[n] || 0) + 1; 
      return acc; 
    }, {});
    setRoomStats(Object.keys(roomCount).map(key => ({ name: key, count: roomCount[key] })));

    // 3. KPI Summary
    setSummary({
        total: bookingData.length,
        pending: bookingData.filter(b => b.status === 'pending').length,
        activeRooms: roomData.filter(r => r.is_active).length
    });
  };

  const handleDeleteBooking = async (id: number) => {
    Swal.fire({ title: 'ลบประวัติ?', text: "ข้อมูลจะหายไปถาวร!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(async (r) => {
        if(r.isConfirmed) {
           try { await api.delete(`/bookings/${id}`); fetchData(); Swal.fire('ลบแล้ว','','success'); } 
           catch (e) { Swal.fire('Error','ลบไม่ได้ อาจติด Foreign Key','error'); }
        }
    });
  };

  const updateBookingStatus = async (id: number, status: string) => {
    try { await api.patch(`/bookings/${id}/status`, { status }); fetchData(); } catch(e) { Swal.fire('Error','Failed','error'); }
  };

  const handleReturn = async (id: number) => {
    try { await api.patch(`/bookings/${id}/return`); fetchData(); Swal.fire('คืนของสำเร็จ','','success'); } catch(e) { Swal.fire('Error','Failed','error'); }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try { 
        await api.post('/rooms', { ...newRoom, capacity: Number(newRoom.capacity), is_active: true }); 
        setNewRoom({name:'', capacity:0, location:'', image_url:''}); 
        fetchData(); 
        Swal.fire('Success','สร้างห้องสำเร็จ','success'); 
    } catch(e){ Swal.fire('Error','สร้างห้องไม่สำเร็จ','error'); }
  };

  const handleDeleteRoom = (id: number) => {
    Swal.fire({ title: 'ลบห้อง?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(async (r) => { if(r.isConfirmed) { try { await api.delete(`/rooms/${id}`); fetchData(); } catch(e) { Swal.fire('Error','ลบไม่ได้','error'); } } });
  };

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post('/facilities', { name: newFacility.name, total_stock: Number(newFacility.stock) }); setNewFacility({name:'', stock:1}); fetchData(); } catch(e){ Swal.fire('Error','','error'); }
  };

  const handleDeleteFacility = (id: number) => {
    Swal.fire({ title: 'ลบอุปกรณ์?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(async (r) => { if(r.isConfirmed) { try { await api.delete(`/facilities/${id}`); fetchData(); } catch(e) { Swal.fire('Error','','error'); } } });
  };

  // Components for cleaner code
  const KPICard = ({ title, value, icon, color }: any) => (
      <Paper elevation={0} sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 4, bgcolor: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
          <Box>
              <Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{textTransform:'uppercase', letterSpacing:1}}>{title}</Typography>
              <Typography variant="h4" fontWeight="800" color="#1e293b" sx={{mt:1}}>{value}</Typography>
          </Box>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56, boxShadow: `0 4px 12px ${color}40` }}>{icon}</Avatar>
      </Paper>
  );

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', pb: 10 }}>
      <AppBar position="sticky" elevation={0} sx={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <Toolbar>
          <Button startIcon={<ArrowBack />} sx={{ mr: 2, borderRadius: 2, color: '#64748b', fontWeight: 'bold' }} onClick={() => navigate('/')}>Back</Button>
          <DashboardIcon sx={{ color: '#3b82f6', mr: 1.5 }} />
          <Typography variant="h6" fontWeight="900" sx={{ flexGrow: 1, color: '#1e293b', letterSpacing: -0.5 }}>
            ADMIN <span style={{fontWeight:400}}>DASHBOARD</span>
          </Typography>
          <Chip label="Administrator" color="primary" size="small" sx={{ fontWeight: 'bold' }} />
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        
        {/* 1️⃣ KPI Section */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}> <KPICard title="Total Bookings" value={summary.total} icon={<EventNote/>} color="#3b82f6" /> </Grid>
            <Grid item xs={12} md={4}> <KPICard title="Pending Requests" value={summary.pending} icon={<Assessment/>} color="#f59e0b" /> </Grid>
            <Grid item xs={12} md={4}> <KPICard title="Active Rooms" value={summary.activeRooms} icon={<MeetingRoom/>} color="#10b981" /> </Grid>
        </Grid>

        <Grid container spacing={3}>
            {/* 2️⃣ Left Column: Statistics & Bookings (Width 8) */}
            <Grid item xs={12} lg={8}>
                <Stack spacing={3}>
                    {/* Charts Row */}
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, borderRadius: 4, height: 320, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>สถานะการจอง</Typography>
                                <Box sx={{ width: '100%', height: 250 }}>
                                    <SafeResponsiveContainer>
                                        <SafePieChart>
                                            <SafePie data={statusStats} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                                {statusStats.map((_entry: any, index: number) => <SafeCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                            </SafePie>
                                            <SafeTooltip />
                                            <SafeLegend verticalAlign="bottom" height={36}/>
                                        </SafePieChart>
                                    </SafeResponsiveContainer>
                                </Box>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, borderRadius: 4, height: 320, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>ห้องยอดนิยม</Typography>
                                <Box sx={{ width: '100%', height: 250 }}>
                                    <SafeResponsiveContainer>
                                        <SafeBarChart data={roomStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <SafeCartesianGrid strokeDasharray="3 3" vertical={false}/>
                                            <SafeXAxis dataKey="name" tick={{fontSize: 12}} />
                                            <SafeYAxis allowDecimals={false} />
                                            <SafeTooltip />
                                            <SafeBar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                                        </SafeBarChart>
                                    </SafeResponsiveContainer>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Booking Table */}
                    <Paper sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                        <Box sx={{ p: 2.5, bgcolor: '#fff', borderBottom: '1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <Typography variant="h6" fontWeight="bold" color="#1e293b">📋 รายการจองล่าสุด</Typography>
                            <Chip label={`${bookings.length} รายการ`} size="small" />
                        </Box>
                        <TableContainer sx={{ maxHeight: 600 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{bgcolor:'#f8fafc', fontWeight:'bold'}}>ID</TableCell>
                                        <TableCell sx={{bgcolor:'#f8fafc', fontWeight:'bold'}}>User</TableCell>
                                        <TableCell sx={{bgcolor:'#f8fafc', fontWeight:'bold'}}>Room</TableCell>
                                        <TableCell sx={{bgcolor:'#f8fafc', fontWeight:'bold'}}>Date/Time</TableCell>
                                        <TableCell sx={{bgcolor:'#f8fafc', fontWeight:'bold'}} align="center">Status</TableCell>
                                        <TableCell sx={{bgcolor:'#f8fafc', fontWeight:'bold'}} align="right">Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {bookings.map((b) => (
                                        <TableRow key={b.id} hover>
                                            <TableCell>#{b.id}</TableCell>
                                            <TableCell sx={{fontWeight:'bold'}}>{b.user?.username}</TableCell>
                                            <TableCell>
                                                <Box>{b.room?.name}</Box>
                                                {b.booking_facilities?.map((bf:any, i) => (
                                                    <Chip key={i} label={`${bf.facility?.name} x${bf.quantity}`} size="small" sx={{fontSize:'0.65rem', height:20, mr:0.5}} />
                                                ))}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{new Date(b.start_time).toLocaleDateString()}</Typography>
                                                <Typography variant="caption" color="text.secondary">{new Date(b.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}-{new Date(b.end_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip label={b.status} size="small" color={b.status==='approved'?'success':b.status==='pending'?'warning':'default'} sx={{textTransform:'uppercase', fontWeight:'bold', fontSize:'0.7rem'}}/>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Box sx={{display:'flex', justifyContent:'flex-end', gap:0.5}}>
                                                    {b.status === 'pending' && (
                                                        <>
                                                        <IconButton size="small" color="success" onClick={()=>updateBookingStatus(b.id,'approved')}><CheckCircle/></IconButton>
                                                        <IconButton size="small" color="error" onClick={()=>updateBookingStatus(b.id,'rejected')}><Cancel/></IconButton>
                                                        </>
                                                    )}
                                                    {b.status === 'approved' && <IconButton size="small" color="warning" onClick={()=>handleReturn(b.id)} title="คืนของ"><Reply/></IconButton>}
                                                    <IconButton size="small" onClick={()=>handleDeleteBooking(b.id)} sx={{color:'#cbd5e1', '&:hover':{color:'#ef4444'}}}><Delete/></IconButton>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Stack>
            </Grid>

            {/* 3️⃣ Right Column: Management (Width 4) */}
            <Grid item xs={12} lg={4}>
                <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth" indicatorColor="primary">
                            <Tab icon={<MeetingRoom/>} label="Rooms" iconPosition="start" />
                            <Tab icon={<Inventory/>} label="Facilities" iconPosition="start" />
                        </Tabs>
                    </Box>
                    
                    <CardContent sx={{ flexGrow: 1, overflowY: 'auto', p: 0 }}>
                        {tabValue === 0 ? (
                            // 🏨 Room Management Tab
                            <Box sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight="bold" gutterBottom>เพิ่มห้องประชุม</Typography>
                                <Stack spacing={2} component="form" onSubmit={handleCreateRoom} sx={{ mb: 4 }}>
                                    <TextField label="ชื่อห้อง" fullWidth size="small" value={newRoom.name} onChange={e=>setNewRoom({...newRoom, name:e.target.value})} required variant="outlined" />
                                    <Stack direction="row" spacing={2}>
                                        <TextField label="ความจุ" type="number" size="small" value={newRoom.capacity||''} onChange={e=>setNewRoom({...newRoom, capacity:Number(e.target.value)})} required sx={{width:'40%'}} />
                                        <TextField label="สถานที่" size="small" fullWidth value={newRoom.location} onChange={e=>setNewRoom({...newRoom, location:e.target.value})} required />
                                    </Stack>
                                    {/* ✅ ช่องกรอก URL รูปภาพ */}
                                    <TextField 
                                        label="URL รูปภาพ (Optional)" 
                                        fullWidth size="small" 
                                        value={newRoom.image_url} 
                                        onChange={e=>setNewRoom({...newRoom, image_url:e.target.value})} 
                                        InputProps={{ startAdornment: <InputAdornment position="start"><Image fontSize="small" color="action"/></InputAdornment> }}
                                    />
                                    <Button type="submit" variant="contained" fullWidth sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }} startIcon={<AddCircle/>}>Create Room</Button>
                                </Stack>

                                <Divider sx={{ my: 2 }}>รายการห้องปัจจุบัน</Divider>

                                <Stack spacing={1}>
                                    {rooms.map(r => (
                                        <Paper key={r.id} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 3 }}>
                                            <Avatar src={r.image_url} variant="rounded" sx={{ width: 50, height: 50, bgcolor: '#f1f5f9' }}><MeetingRoom color="action"/></Avatar>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="subtitle2" fontWeight="bold">{r.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{r.location} • {r.capacity} คน</Typography>
                                            </Box>
                                            <IconButton size="small" color="error" onClick={()=>handleDeleteRoom(r.id)}><Delete/></IconButton>
                                        </Paper>
                                    ))}
                                </Stack>
                            </Box>
                        ) : (
                            // 🛠️ Facility Management Tab
                            <Box sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight="bold" gutterBottom>เพิ่มอุปกรณ์</Typography>
                                <Stack spacing={2} component="form" onSubmit={handleCreateFacility} sx={{ mb: 4 }}>
                                    <TextField label="ชื่ออุปกรณ์" fullWidth size="small" value={newFacility.name} onChange={e=>setNewFacility({...newFacility, name:e.target.value})} required />
                                    <TextField label="จำนวนในคลัง (Stock)" type="number" fullWidth size="small" value={newFacility.stock} onChange={e=>setNewFacility({...newFacility, stock:Number(e.target.value)})} required />
                                    <Button type="submit" variant="contained" color="secondary" fullWidth sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }} startIcon={<AddCircle/>}>Add Item</Button>
                                </Stack>

                                <Divider sx={{ my: 2 }}>รายการอุปกรณ์</Divider>

                                <Stack spacing={1}>
                                    {facilities.map(f => (
                                        <Paper key={f.id} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent:'space-between', borderRadius: 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar sx={{ bgcolor: '#eff6ff', color: '#3b82f6' }}><Inventory fontSize="small"/></Avatar>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight="bold">{f.name}</Typography>
                                                    <Chip label={`Stock: ${f.total_stock}`} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                                                </Box>
                                            </Box>
                                            <IconButton size="small" color="error" onClick={()=>handleDeleteFacility(f.id)}><Delete/></IconButton>
                                        </Paper>
                                    ))}
                                </Stack>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default AdminDashboard;