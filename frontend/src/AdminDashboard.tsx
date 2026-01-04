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
  EventNote, AddCircle, Assessment, Delete, 
  CheckCircle, Cancel, Reply, Image, Dashboard as DashboardIcon, AccessTime
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
    Swal.fire({ title: 'Delete History?', text: "Data will be lost permanently!", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(async (r) => {
        if(r.isConfirmed) {
           try { await api.delete(`/bookings/${id}`); fetchData(); Swal.fire('Deleted','','success'); } 
           catch (e) { Swal.fire('Error','Cannot delete, data might be referenced.','error'); }
        }
    });
  };

  const updateBookingStatus = async (id: number, status: string) => {
    try { await api.patch(`/bookings/${id}/status`, { status }); fetchData(); } catch(e) { Swal.fire('Error','Failed to update status','error'); }
  };

  const handleReturn = async (id: number) => {
    try { await api.patch(`/bookings/${id}/return`); fetchData(); Swal.fire('Returned','Stock updated.','success'); } catch(e) { Swal.fire('Error','Failed to return items','error'); }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try { 
        await api.post('/rooms', { ...newRoom, capacity: Number(newRoom.capacity), is_active: true }); 
        setNewRoom({name:'', capacity:0, location:'', image_url:''}); 
        fetchData(); 
        Swal.fire('Success','Room created successfully','success'); 
    } catch(e){ Swal.fire('Error','Failed to create room','error'); }
  };

  const handleDeleteRoom = (id: number) => {
    Swal.fire({ title: 'Delete Room?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(async (r) => { if(r.isConfirmed) { try { await api.delete(`/rooms/${id}`); fetchData(); } catch(e) { Swal.fire('Error','Cannot delete','error'); } } });
  };

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.post('/facilities', { name: newFacility.name, total_stock: Number(newFacility.stock) }); setNewFacility({name:'', stock:1}); fetchData(); } catch(e){ Swal.fire('Error','Failed to add item','error'); }
  };

  const handleDeleteFacility = (id: number) => {
    Swal.fire({ title: 'Delete Item?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(async (r) => { if(r.isConfirmed) { try { await api.delete(`/facilities/${id}`); fetchData(); } catch(e) { Swal.fire('Error','Cannot delete','error'); } } });
  };

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
        
        <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}> <KPICard title="Total Bookings" value={summary.total} icon={<EventNote/>} color="#3b82f6" /> </Grid>
            <Grid item xs={12} md={4}> <KPICard title="Pending Requests" value={summary.pending} icon={<Assessment/>} color="#f59e0b" /> </Grid>
            <Grid item xs={12} md={4}> <KPICard title="Active Rooms" value={summary.activeRooms} icon={<MeetingRoom/>} color="#10b981" /> </Grid>
        </Grid>

        <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
                <Stack spacing={3}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, borderRadius: 4, height: 320, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Booking Status</Typography>
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
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Popular Rooms</Typography>
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

                    <Paper sx={{ borderRadius: 4, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                        <Box sx={{ p: 2.5, bgcolor: '#fff', borderBottom: '1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <Typography variant="h6" fontWeight="bold" color="#1e293b">📋 Recent Bookings</Typography>
                            <Chip label={`${bookings.length} items`} size="small" />
                        </Box>
                        <TableContainer sx={{ maxHeight: 600 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{bgcolor:'#f8fafc', fontWeight:'bold'}}>ID</TableCell>
                                        <TableCell sx={{bgcolor:'#f8fafc', fontWeight:'bold'}}>User</TableCell>
                                        <TableCell sx={{bgcolor:'#f8fafc', fontWeight:'bold'}}>Room</TableCell>
                                        {/* ✅ แก้ไข Header ให้ชัดเจน */}
                                        <TableCell sx={{bgcolor:'#f8fafc', fontWeight:'bold'}}>Booking Period (Start - End)</TableCell>
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
                                            {/* ✅ แก้ไขการแสดงผลเวลาให้ชัดเจน แยกบรรทัด Start/End */}
                                            <TableCell>
                                                <Stack spacing={0.5}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#15803d' }}>
                                                        <AccessTime sx={{ fontSize: 16 }} />
                                                        <Typography variant="caption" fontWeight="bold">Start:</Typography>
                                                        <Typography variant="caption">
                                                            {new Date(b.start_time).toLocaleDateString()} {new Date(b.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#b91c1c' }}>
                                                        <AccessTime sx={{ fontSize: 16 }} />
                                                        <Typography variant="caption" fontWeight="bold">End:&nbsp;&nbsp;</Typography>
                                                        <Typography variant="caption">
                                                            {new Date(b.end_time).toLocaleDateString()} {new Date(b.end_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </TableCell>
                                            <TableCell align="center">
                                                <Chip label={b.status} size="small" color={b.status==='approved'?'success':b.status==='pending'?'warning':'default'} sx={{textTransform:'uppercase', fontWeight:'bold', fontSize:'0.7rem'}}/>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Box sx={{display:'flex', justifyContent:'flex-end', gap:0.5}}>
                                                    {b.status === 'pending' && (
                                                        <>
                                                        <IconButton size="small" color="success" onClick={()=>updateBookingStatus(b.id,'approved')} title="Approve"><CheckCircle/></IconButton>
                                                        <IconButton size="small" color="error" onClick={()=>updateBookingStatus(b.id,'rejected')} title="Reject"><Cancel/></IconButton>
                                                        </>
                                                    )}
                                                    {b.status === 'approved' && <IconButton size="small" color="warning" onClick={()=>handleReturn(b.id)} title="Return Items"><Reply/></IconButton>}
                                                    <IconButton size="small" onClick={()=>handleDeleteBooking(b.id)} sx={{color:'#cbd5e1', '&:hover':{color:'#ef4444'}}} title="Delete"><Delete/></IconButton>
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
                            <Box sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight="bold" gutterBottom>Add New Room</Typography>
                                <Stack spacing={2} component="form" onSubmit={handleCreateRoom} sx={{ mb: 4 }}>
                                    <TextField label="Room Name" fullWidth size="small" value={newRoom.name} onChange={e=>setNewRoom({...newRoom, name:e.target.value})} required variant="outlined" />
                                    <Stack direction="row" spacing={2}>
                                        <TextField label="Capacity" type="number" size="small" value={newRoom.capacity||''} onChange={e=>setNewRoom({...newRoom, capacity:Number(e.target.value)})} required sx={{width:'40%'}} />
                                        <TextField label="Location" size="small" fullWidth value={newRoom.location} onChange={e=>setNewRoom({...newRoom, location:e.target.value})} required />
                                    </Stack>
                                    <TextField 
                                        label="Image URL (Optional)" 
                                        fullWidth size="small" 
                                        value={newRoom.image_url} 
                                        onChange={e=>setNewRoom({...newRoom, image_url:e.target.value})} 
                                        InputProps={{ startAdornment: <InputAdornment position="start"><Image fontSize="small" color="action"/></InputAdornment> }}
                                    />
                                    <Button type="submit" variant="contained" fullWidth sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }} startIcon={<AddCircle/>}>Create Room</Button>
                                </Stack>

                                <Divider sx={{ my: 2 }}>Current Rooms</Divider>

                                <Stack spacing={1}>
                                    {rooms.map(r => (
                                        <Paper key={r.id} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 3 }}>
                                            <Avatar src={r.image_url} variant="rounded" sx={{ width: 50, height: 50, bgcolor: '#f1f5f9' }}><MeetingRoom color="action"/></Avatar>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="subtitle2" fontWeight="bold">{r.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{r.location} • {r.capacity} ppl</Typography>
                                            </Box>
                                            <IconButton size="small" color="error" onClick={()=>handleDeleteRoom(r.id)}><Delete/></IconButton>
                                        </Paper>
                                    ))}
                                </Stack>
                            </Box>
                        ) : (
                            <Box sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight="bold" gutterBottom>Add Facility</Typography>
                                <Stack spacing={2} component="form" onSubmit={handleCreateFacility} sx={{ mb: 4 }}>
                                    <TextField label="Facility Name" fullWidth size="small" value={newFacility.name} onChange={e=>setNewFacility({...newFacility, name:e.target.value})} required />
                                    <TextField label="Stock Amount" type="number" fullWidth size="small" value={newFacility.stock} onChange={e=>setNewFacility({...newFacility, stock:Number(e.target.value)})} required />
                                    <Button type="submit" variant="contained" color="secondary" fullWidth sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 'bold' }} startIcon={<AddCircle/>}>Add Item</Button>
                                </Stack>

                                <Divider sx={{ my: 2 }}>Current Facilities</Divider>

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