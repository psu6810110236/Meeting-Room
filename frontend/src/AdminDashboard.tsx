import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api/axios'; 
import './App.css';
import type { Booking, Facility, MeetingRoom as Room } from './types';
import Swal from 'sweetalert2';
import NotificationBell from './components/NotificationBell';

import { 
  AppBar, Toolbar, Typography, Button, Container, Box, Grid, Chip, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, 
  Card, CardContent, Divider, Avatar, TextField, Tabs, Tab, Stack,
  Select, MenuItem, FormControl, InputLabel, Dialog, DialogTitle, DialogContent, DialogActions,
  TablePagination 
} from '@mui/material';

import { 
  ArrowBack, MeetingRoom, 
  EventNote, Assessment, Delete, 
  CheckCircle, Cancel, Reply, Dashboard as DashboardIcon, Edit, Image as ImageIcon
} from '@mui/icons-material';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

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
  
  // Filters & Sort State
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'start_time'>('created_at'); 
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Inputs
  const [newRoom, setNewRoom] = useState({ name: '', capacity: 0, location: '', image_url: '' });
  const [newFacility, setNewFacility] = useState({ name: '', stock: 1 });
  const [tabValue, setTabValue] = useState(0); 

  // Edit Modal State
  const [editRoomOpen, setEditRoomOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editFacilityOpen, setEditFacilityOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);

  const [statusStats, setStatusStats] = useState<{ name: string; value: number }[]>([]);
  const [roomStats, setRoomStats] = useState<{ name: string; count: number }[]>([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, activeRooms: 0 });

  const checkAndCancelExpiredBookings = async (allBookings: Booking[]) => {
    const now = new Date().getTime();
    const expiredBookings = allBookings.filter(b => 
      b.status === 'pending' && new Date(b.start_time).getTime() < now
    );

    if (expiredBookings.length > 0) {
      try {
        await Promise.all(expiredBookings.map(b => 
          api.patch(`/bookings/${b.id}/status`, { status: 'cancelled' })
        ));
        
        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true
        });
        Toast.fire({
            icon: 'info',
            title: `Auto-Cancelled ${expiredBookings.length} expired bookings`
        });
        return true; 
      } catch (error) { console.error("Auto-cancel failed", error); }
    }
    return false;
  };

  const fetchData = async () => {
    try {
      const resBookings = await api.get(`/bookings?limit=1000`); 
      let allBookings: Booking[] = resBookings.data.data || resBookings.data;

      const dataChanged = await checkAndCancelExpiredBookings(allBookings);
      if (dataChanged) {
          const updatedRes = await api.get(`/bookings?limit=1000`);
          allBookings = updatedRes.data.data || updatedRes.data;
      }

      setBookings(allBookings);

      const [resRooms, resFacilities] = await Promise.all([
        api.get('/rooms'),
        api.get('/facilities')
      ]);
      setRooms(resRooms.data);
      setFacilities(resFacilities.data);
      
      calculateStats(allBookings, resRooms.data);
    } catch (error) { console.error("Error fetching data:", error); }
  };

  useEffect(() => { fetchData(); }, []); 

  const calculateStats = (bookingData: Booking[], roomData: Room[]) => {
    const statusCount = bookingData.reduce((acc: Record<string, number>, curr) => { const s = curr.status || 'unknown'; acc[s] = (acc[s] || 0) + 1; return acc; }, {});
    setStatusStats(Object.keys(statusCount).map(key => ({ name: key.toUpperCase(), value: statusCount[key] })));
    const roomCount = bookingData.reduce((acc: Record<string, number>, curr) => { const n = curr.room?.name || 'Unknown'; acc[n] = (acc[n] || 0) + 1; return acc; }, {});
    setRoomStats(Object.keys(roomCount).map(key => ({ name: key, count: roomCount[key] })));
    setSummary({ total: bookingData.length, pending: bookingData.filter(b => b.status === 'pending').length, activeRooms: roomData.filter(r => r.is_active).length });
  };

  const getFilteredAndSortedBookings = () => {
    let result = [...bookings];
    if (filterRoom !== 'all') result = result.filter(b => b.room?.id === Number(filterRoom));
    if (filterStatus !== 'all') result = result.filter(b => b.status === filterStatus);
    
    result.sort((a, b) => {
        const dateA = new Date(sortBy === 'created_at' ? a.created_at : a.start_time).getTime();
        const dateB = new Date(sortBy === 'created_at' ? b.created_at : b.start_time).getTime();
        if (sortBy === 'created_at') return dateA - dateB; 
        return dateB - dateA; 
    });
    return result;
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const updateBookingStatus = async (id: number, status: string) => { try { await api.patch(`/bookings/${id}/status`, { status }); fetchData(); } catch(e) { Swal.fire('Error','Failed','error'); } };
  const handleDeleteBooking = async (id: number) => { Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(async (r) => { if(r.isConfirmed) { await api.delete(`/bookings/${id}`); fetchData(); } }); };
  const handleReturn = async (id: number) => { await api.patch(`/bookings/${id}/return`); fetchData(); };
  
  const handleCreateRoom = async (e: React.FormEvent) => { e.preventDefault(); await api.post('/rooms', { ...newRoom, capacity: Number(newRoom.capacity), is_active: true }); setNewRoom({name:'', capacity:0, location:'', image_url:''}); fetchData(); Swal.fire('Success', 'Room created', 'success'); };
  const handleDeleteRoom = (id: number) => { Swal.fire({title:'Delete Room?', showCancelButton:true, confirmButtonColor:'#d33'}).then(r=>{if(r.isConfirmed) api.delete(`/rooms/${id}`).then(fetchData)}); };
  
  const openEditRoom = (room: Room) => { setEditingRoom(room); setEditRoomOpen(true); };
  const handleUpdateRoom = async () => {
     if(!editingRoom) return;
     try { await api.patch(`/rooms/${editingRoom.id}`, editingRoom); setEditRoomOpen(false); fetchData(); Swal.fire('Updated', 'Success', 'success'); } catch(e) { Swal.fire('Error', 'Failed', 'error'); }
  };

  const handleCreateFacility = async (e: React.FormEvent) => { e.preventDefault(); await api.post('/facilities', { name: newFacility.name, total_stock: Number(newFacility.stock) }); setNewFacility({name:'', stock:1}); fetchData(); };
  const handleDeleteFacility = (id: number) => { Swal.fire({title:'Delete?', showCancelButton:true, confirmButtonColor:'#d33'}).then(r=>{if(r.isConfirmed) api.delete(`/facilities/${id}`).then(fetchData)}); };

  const openEditFacility = (fac: Facility) => { setEditingFacility(fac); setEditFacilityOpen(true); };
  const handleUpdateFacility = async () => {
     if(!editingFacility) return;
     try { await api.patch(`/facilities/${editingFacility.id}`, { name: editingFacility.name, total_stock: Number(editingFacility.total_stock) }); setEditFacilityOpen(false); fetchData(); Swal.fire('Updated', 'Success', 'success'); } catch(e) { Swal.fire('Error', 'Failed', 'error'); }
  };

  const KPICard = ({ title, value, icon, color }: any) => (
      <Paper elevation={0} sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 4, bgcolor: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9' }}>
          <Box><Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{textTransform:'uppercase'}}>{title}</Typography><Typography variant="h4" fontWeight="800" color="#1e293b" sx={{mt:1}}>{value}</Typography></Box>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>{icon}</Avatar>
      </Paper>
  );

  const filteredBookings = getFilteredAndSortedBookings();

  // ✅ แก้ไข: เพิ่ม useEffect เพื่อดีดหน้ากลับเมื่อข้อมูลหมด
  useEffect(() => {
    if (page > 0 && filteredBookings.length <= page * rowsPerPage) {
       setPage(Math.max(0, page - 1));
    }
  }, [filteredBookings.length, page, rowsPerPage]);

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', pb: 10 }}>
      <AppBar position="sticky" elevation={0} sx={{ background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <Toolbar>
          <Button startIcon={<ArrowBack />} sx={{ mr: 2, color: '#64748b' }} onClick={() => navigate('/')}>Back</Button>
          <DashboardIcon sx={{ color: '#3b82f6', mr: 1.5 }} />
          <Typography variant="h6" fontWeight="900" sx={{ flexGrow: 1, color: '#1e293b' }}>ADMIN DASHBOARD</Typography>
          <NotificationBell />
          <Chip label="Administrator" color="primary" size="small" sx={{ ml: 2, fontWeight: 'bold' }} />
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}> <KPICard title="Total Bookings" value={summary.total} icon={<EventNote/>} color="#3b82f6" /> </Grid>
            <Grid item xs={12} md={4}> <KPICard title="Pending Requests" value={summary.pending} icon={<Assessment/>} color="#f59e0b" /> </Grid>
            <Grid item xs={12} md={4}> <KPICard title="Active Rooms" value={summary.activeRooms} icon={<MeetingRoom/>} color="#10b981" /> </Grid>
        </Grid>

        <Grid container spacing={3}>
            {/* Left: Bookings Table & Charts */}
            <Grid item xs={12} lg={8}>
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={6}><Paper sx={{ p: 3, borderRadius: 4, height: 320 }}><Typography fontWeight="bold">Status Overview</Typography><Box sx={{ height: 250 }}><SafeResponsiveContainer><SafePieChart><SafePie data={statusStats} cx="50%" cy="50%" outerRadius={80} dataKey="value">{statusStats.map((_:any,i:number)=><SafeCell key={i} fill={COLORS[i%COLORS.length]}/>)}</SafePie><SafeTooltip/><SafeLegend/></SafePieChart></SafeResponsiveContainer></Box></Paper></Grid>
                    <Grid item xs={12} md={6}><Paper sx={{ p: 3, borderRadius: 4, height: 320 }}><Typography fontWeight="bold">Room Popularity</Typography><Box sx={{ height: 250 }}><SafeResponsiveContainer><SafeBarChart data={roomStats}><SafeCartesianGrid strokeDasharray="3 3" vertical={false}/><SafeXAxis dataKey="name"/><SafeYAxis/><SafeTooltip/><SafeBar dataKey="count" fill="#6366f1"/></SafeBarChart></SafeResponsiveContainer></Box></Paper></Grid>
                </Grid>

                <Paper sx={{ borderRadius: 4, overflow: 'hidden' }}>
                    <Box sx={{ p: 2.5, bgcolor: '#fff', borderBottom: '1px solid #f1f5f9' }}>
                        <Grid container alignItems="center" spacing={2}>
                            <Grid item xs><Typography variant="h6" fontWeight="bold">📋 Booking Management</Typography></Grid>
                            <Grid item>
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <InputLabel>Filter Room</InputLabel>
                                    <Select value={filterRoom} label="Filter Room" onChange={(e) => setFilterRoom(e.target.value)}>
                                        <MenuItem value="all">All Rooms</MenuItem>
                                        {rooms.map(r => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item>
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <InputLabel>Status</InputLabel>
                                    <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                                        <MenuItem value="all">All Status</MenuItem>
                                        <MenuItem value="pending">Pending</MenuItem>
                                        <MenuItem value="approved">Approved</MenuItem>
                                        <MenuItem value="rejected">Rejected</MenuItem>
                                        <MenuItem value="cancelled">Cancelled</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item>
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                    <InputLabel>Sort By</InputLabel>
                                    <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value as any)}>
                                        <MenuItem value="created_at">Booking Date (FIFO)</MenuItem>
                                        <MenuItem value="start_time">Meeting Date</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Box>

                    <TableContainer>
                        <Table stickyHeader size="small">
                            <TableHead><TableRow>
                                <TableCell>Queue Time</TableCell>
                                <TableCell>User</TableCell>
                                <TableCell>Room / Time</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Action</TableCell>
                            </TableRow></TableHead>
                            <TableBody>
                                {filteredBookings
                                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                  .map((b) => (
                                    <TableRow key={b.id} hover sx={{ bgcolor: b.status === 'pending' ? '#fffbeb' : 'inherit' }}>
                                        <TableCell>
                                            <Typography variant="caption" display="block" color="text.secondary">Booked at:</Typography>
                                            <Typography variant="body2" fontWeight="bold">{new Date(b.created_at).toLocaleString('en-US')}</Typography>
                                        </TableCell>
                                        <TableCell>{b.user?.username}</TableCell>
                                        <TableCell>
                                            <Box fontWeight="bold" color="primary.main">{b.room?.name}</Box>
                                            <Typography variant="caption">{new Date(b.start_time).toLocaleString('en-US')} - {new Date(b.end_time).toLocaleTimeString('en-US')}</Typography>
                                        </TableCell>
                                        <TableCell><Chip label={b.status.toUpperCase()} size="small" color={b.status==='approved'?'success':b.status==='pending'?'warning':b.status==='cancelled'?'error':'default'} sx={{fontWeight:'bold'}}/></TableCell>
                                        <TableCell align="right">
                                            <Box sx={{display:'flex', justifyContent:'flex-end', gap:0.5}}>
                                                {b.status==='pending' && <><IconButton size="small" color="success" onClick={()=>updateBookingStatus(b.id,'approved')} title="Approve"><CheckCircle/></IconButton><IconButton size="small" color="error" onClick={()=>updateBookingStatus(b.id,'rejected')} title="Reject"><Cancel/></IconButton></>}
                                                {b.status==='approved' && <IconButton size="small" color="warning" onClick={()=>handleReturn(b.id)}><Reply/></IconButton>}
                                                <IconButton size="small" onClick={()=>handleDeleteBooking(b.id)}><Delete/></IconButton>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={filteredBookings.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                    />
                </Paper>
            </Grid>

            {/* Right: Manage Rooms & Facilities */}
            <Grid item xs={12} lg={4}>
                <Card sx={{ borderRadius: 4, height: '100%' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}><Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth"><Tab label="Rooms" /><Tab label="Facilities" /></Tabs></Box>
                    <CardContent>
                        {tabValue === 0 ? (
                            <Box>
                                <Typography fontWeight="bold" gutterBottom>Add New Room</Typography>
                                <Stack spacing={2} component="form" onSubmit={handleCreateRoom} sx={{mb:3}}>
                                    <TextField size="small" label="Room Name" value={newRoom.name} onChange={e=>setNewRoom({...newRoom, name:e.target.value})} required/>
                                    <Stack direction="row" spacing={1}><TextField size="small" label="Capacity" type="number" value={newRoom.capacity} onChange={e=>setNewRoom({...newRoom, capacity:Number(e.target.value)})}/><TextField size="small" fullWidth label="Location" value={newRoom.location} onChange={e=>setNewRoom({...newRoom, location:e.target.value})}/></Stack>
                                    <TextField size="small" label="Image URL" value={newRoom.image_url} onChange={e=>setNewRoom({...newRoom, image_url:e.target.value})}/>
                                    <Button type="submit" variant="contained">Create Room</Button>
                                </Stack>
                                <Divider sx={{ my: 2 }}>Edit Rooms</Divider>
                                <Stack spacing={1}>
                                    {rooms.map(r => (
                                        <Paper key={r.id} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Avatar 
                                                    variant="rounded" 
                                                    src={r.image_url} 
                                                    sx={{ width: 50, height: 50, bgcolor: '#e2e8f0' }}
                                                >
                                                    <ImageIcon sx={{ color: '#94a3b8' }} />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight="bold">{r.name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{r.capacity} ppl • {r.location}</Typography>
                                                </Box>
                                            </Box>
                                            <Box>
                                                <IconButton size="small" color="primary" onClick={()=>openEditRoom(r)}><Edit/></IconButton>
                                                <IconButton size="small" color="error" onClick={()=>handleDeleteRoom(r.id)}><Delete/></IconButton>
                                            </Box>
                                        </Paper>
                                    ))}
                                </Stack>
                            </Box>
                        ) : (
                            <Box>
                                <Typography fontWeight="bold" gutterBottom>Add New Facility</Typography>
                                <Stack spacing={2} component="form" onSubmit={handleCreateFacility} sx={{mb:3}}>
                                    <TextField size="small" label="Facility Name" value={newFacility.name} onChange={e=>setNewFacility({...newFacility, name:e.target.value})} required/>
                                    <TextField size="small" label="Total Stock" type="number" value={newFacility.stock} onChange={e=>setNewFacility({...newFacility, stock:Number(e.target.value)})} required/>
                                    <Button type="submit" variant="contained" color="secondary">Add Facility</Button>
                                </Stack>
                                <Divider sx={{ my: 2 }}>Edit Facilities</Divider>
                                <Stack spacing={1}>
                                    {facilities.map(f => (
                                        <Paper key={f.id} variant="outlined" sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="body2">{f.name} (Stock: {f.total_stock})</Typography>
                                            <Box>
                                                <IconButton size="small" color="primary" onClick={()=>openEditFacility(f)}><Edit/></IconButton>
                                                <IconButton size="small" color="error" onClick={()=>handleDeleteFacility(f.id)}><Delete/></IconButton>
                                            </Box>
                                        </Paper>
                                    ))}
                                </Stack>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Grid>
        </Grid>

        {/* Modal: Edit Room */}
        <Dialog open={editRoomOpen} onClose={()=>setEditRoomOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>Edit Room</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{mt:1}}>
                    <TextField label="Room Name" fullWidth value={editingRoom?.name||''} onChange={e=>setEditingRoom({...editingRoom!, name:e.target.value})}/>
                    <TextField label="Capacity" type="number" fullWidth value={editingRoom?.capacity||0} onChange={e=>setEditingRoom({...editingRoom!, capacity:Number(e.target.value)})}/>
                    <TextField label="Location" fullWidth value={editingRoom?.location||''} onChange={e=>setEditingRoom({...editingRoom!, location:e.target.value})}/>
                    <TextField label="Image URL" fullWidth value={editingRoom?.image_url||''} onChange={e=>setEditingRoom({...editingRoom!, image_url:e.target.value})}/>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={()=>setEditRoomOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={handleUpdateRoom}>Save Changes</Button>
            </DialogActions>
        </Dialog>

        {/* Modal: Edit Facility */}
        <Dialog open={editFacilityOpen} onClose={()=>setEditFacilityOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>Edit Facility</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{mt:1}}>
                    <TextField label="Facility Name" fullWidth value={editingFacility?.name||''} onChange={e=>setEditingFacility({...editingFacility!, name:e.target.value})}/>
                    <TextField label="Total Stock" type="number" fullWidth value={editingFacility?.total_stock||0} onChange={e=>setEditingFacility({...editingFacility!, total_stock:Number(e.target.value)})}/>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={()=>setEditFacilityOpen(false)}>Cancel</Button>
                <Button variant="contained" onClick={handleUpdateFacility}>Save Changes</Button>
            </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}

export default AdminDashboard;