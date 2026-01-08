import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api/axios';
import './App.css';
import type { Booking, Facility, MeetingRoom as Room } from './types';
import Swal from 'sweetalert2';
import NotificationBell from './components/NotificationBell';
import ChatWidget from './components/ChatWidget';
import { jwtDecode } from 'jwt-decode';

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
    CheckCircle, Cancel, Reply, Dashboard as DashboardIcon, Edit, Image as ImageIcon,
    Visibility, AccessTime
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

const formatDateForInput = (dateString: any) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
};

function AdminDashboard() {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [facilities, setFacilities] = useState<Facility[]>([]);

    const [filterRoom, setFilterRoom] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'created_at' | 'start_time'>('created_at');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [newRoom, setNewRoom] = useState({ name: '', capacity: 0, location: '', image_url: '' });
    const [newFacility, setNewFacility] = useState({ name: '', stock: 1 });
    const [tabValue, setTabValue] = useState(0);

    const [editRoomOpen, setEditRoomOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [editFacilityOpen, setEditFacilityOpen] = useState(false);
    const [editingFacility, setEditingFacility] = useState<Facility | null>(null);

    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    
    const [editBookingOpen, setEditBookingOpen] = useState(false);
    const [editingBooking, setEditingBooking] = useState<any | null>(null);
    const [editDurationStr, setEditDurationStr] = useState('');

    const [statusStats, setStatusStats] = useState<{ name: string; value: number }[]>([]);
    const [roomStats, setRoomStats] = useState<{ name: string; count: number }[]>([]);
    const [summary, setSummary] = useState({ total: 0, pending: 0, activeRooms: 0 });

    const token = localStorage.getItem('token');
    let adminId: number | null = null;
    if (token) {
        try {
            const decoded: any = jwtDecode(token);
            adminId = decoded.sub;
        } catch (e) { }
    }

    const fetchData = async () => {
        try {
            const timestamp = new Date().getTime();
            const resBookings = await api.get(`/bookings?limit=2000&t=${timestamp}`);
            const allBookings: Booking[] = resBookings.data.data || resBookings.data;
            setBookings(allBookings);

            const [resRooms, resFacilities] = await Promise.all([
                api.get(`/rooms?t=${timestamp}`),
                api.get(`/facilities?t=${timestamp}`)
            ]);
            setRooms(resRooms.data);
            setFacilities(resFacilities.data);
            calculateStats(allBookings, resRooms.data);
        } catch (error) { console.error("Error fetching data:", error); }
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        if (editingBooking?.start_time && editingBooking?.end_time) {
            const start = new Date(editingBooking.start_time).getTime();
            const end = new Date(editingBooking.end_time).getTime();
            const diffMs = end - start;
            
            if (diffMs > 0) {
                const h = Math.floor(diffMs / 3600000);
                const m = Math.round((diffMs % 3600000) / 60000);
                setEditDurationStr(`${h > 0 ? `${h} hr ` : ''}${m > 0 ? `${m} min` : ''}`);
            } else {
                setEditDurationStr('❌ Invalid Time (End time must be after Start time)');
            }
        } else {
            setEditDurationStr('');
        }
    }, [editingBooking?.start_time, editingBooking?.end_time]);

    const calculateStats = (bookingData: Booking[], roomData: Room[]) => {
        const statusCount = bookingData.reduce((acc: Record<string, number>, curr) => { const s = curr.status || 'unknown'; acc[s] = (acc[s] || 0) + 1; return acc; }, {});
        setStatusStats(Object.keys(statusCount).map(key => ({ name: key.toUpperCase(), value: statusCount[key] })));
        
        const roomCount = bookingData.reduce((acc: Record<string, number>, curr) => { const n = curr.room?.name || 'Unknown'; acc[n] = (acc[n] || 0) + 1; return acc; }, {});
        setRoomStats(Object.keys(roomCount).map(key => ({ name: key, count: roomCount[key] })));
        
        setSummary({ 
            total: bookingData.length, 
            pending: bookingData.filter(b => b.status === 'pending').length, 
            activeRooms: roomData.filter(r => r.is_active).length 
        });
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

    const handleChangePage = (_: unknown, newPage: number) => { setPage(newPage); };
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };

    const updateBookingStatus = async (id: number, status: string) => { 
        try { 
            await api.patch(`/bookings/${id}/status`, { status }); 
            await fetchData(); 
            Swal.fire({ title: 'Updated!', text: `Status changed to ${status}`, icon: 'success', timer: 1500, showConfirmButton: false });
        } catch (e) { Swal.fire('Error', 'Failed to update status', 'error'); } 
    };

    const handleDeleteBooking = async (id: number) => { 
        Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(async (r) => { 
            if (r.isConfirmed) { await api.delete(`/bookings/${id}`); await fetchData(); Swal.fire('Deleted', 'Booking removed', 'success'); } 
        }); 
    };

    const handleReturn = async (id: number) => { await api.patch(`/bookings/${id}/return`); await fetchData(); Swal.fire('Success', 'Items returned', 'success'); };
    const handleViewBooking = (booking: Booking) => { setSelectedBooking(booking); setViewModalOpen(true); };

    const handleEditBooking = (booking: Booking) => {
        setEditingBooking({
            id: booking.id,
            purpose: booking.purpose,
            start_time: booking.start_time, 
            end_time: booking.end_time,
            room: booking.room 
        });
        setEditBookingOpen(true);
    };

    const handleSaveBookingEdit = () => {
        if (!editingBooking || !editingBooking.id) return;
        
        if (editDurationStr.includes('❌') || !editingBooking.start_time || !editingBooking.end_time) {
            Swal.fire('Invalid Data', 'Please check the start and end time.', 'error');
            return;
        }

        Swal.fire({
            title: 'Confirm Update?',
            html: `
                <div style="text-align:left; font-size:0.95rem;">
                    <p><b>Room:</b> ${editingBooking.room?.name}</p>
                    <p><b>Time:</b> ${new Date(editingBooking.start_time).toLocaleString()} - ${new Date(editingBooking.end_time).toLocaleTimeString()}</p>
                    <p><b>Purpose:</b> ${editingBooking.purpose}</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Update it!'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.patch(`/bookings/${editingBooking.id}`, {
                        purpose: editingBooking.purpose,
                        startTime: editingBooking.start_time,
                        endTime: editingBooking.end_time,
                        roomId: editingBooking.room?.id
                    });
                    setEditBookingOpen(false);
                    await fetchData();
                    Swal.fire('Updated', 'Booking details updated', 'success');
                } catch (e) {
                    Swal.fire('Error', 'Failed to update booking', 'error');
                }
            }
        });
    };

    const handleCreateRoom = async (e: React.FormEvent) => { e.preventDefault(); await api.post('/rooms', { ...newRoom, capacity: Number(newRoom.capacity), is_active: true }); setNewRoom({ name: '', capacity: 0, location: '', image_url: '' }); fetchData(); Swal.fire('Success', 'Room created', 'success'); };
    const handleDeleteRoom = (id: number) => { Swal.fire({ title: 'Delete Room?', showCancelButton: true, confirmButtonColor: '#d33' }).then(r => { if (r.isConfirmed) api.delete(`/rooms/${id}`).then(fetchData) }); };
    const openEditRoom = (room: Room) => { setEditingRoom(room); setEditRoomOpen(true); };
    const handleUpdateRoom = async () => { if (!editingRoom) return; try { await api.patch(`/rooms/${editingRoom.id}`, editingRoom); setEditRoomOpen(false); fetchData(); Swal.fire('Updated', 'Success', 'success'); } catch (e) { Swal.fire('Error', 'Failed', 'error'); } };
    const handleCreateFacility = async (e: React.FormEvent) => { e.preventDefault(); await api.post('/facilities', { name: newFacility.name, total_stock: Number(newFacility.stock) }); setNewFacility({ name: '', stock: 1 }); fetchData(); };
    const handleDeleteFacility = (id: number) => { Swal.fire({ title: 'Delete?', showCancelButton: true, confirmButtonColor: '#d33' }).then(r => { if (r.isConfirmed) api.delete(`/facilities/${id}`).then(fetchData) }); };
    const openEditFacility = (fac: Facility) => { setEditingFacility(fac); setEditFacilityOpen(true); };
    const handleUpdateFacility = async () => { if (!editingFacility) return; try { await api.patch(`/facilities/${editingFacility.id}`, { name: editingFacility.name, total_stock: Number(editingFacility.total_stock) }); setEditFacilityOpen(false); fetchData(); Swal.fire('Updated', 'Success', 'success'); } catch (e) { Swal.fire('Error', 'Failed', 'error'); } };

    const KPICard = ({ title, value, icon, color }: any) => (
        <Paper elevation={0} sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '24px', bgcolor: 'white', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.08)', border: '1px solid rgba(226, 232, 240, 0.8)', position: 'relative', overflow: 'hidden', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-5px)' } }}>
            <Box sx={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: color, opacity: 0.15, filter: 'blur(30px)' }} />
            <Box sx={{ zIndex: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight="700" sx={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.7rem' }}>{title}</Typography>
                <Typography variant="h3" fontWeight="800" sx={{ mt: 1, color: '#1e293b', letterSpacing: '-1px' }}>{value}</Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: '20px', background: `linear-gradient(135deg, ${color} 0%, ${color}aa 100%)`, color: 'white', boxShadow: `0 8px 16px -4px ${color}66` }}>{React.cloneElement(icon, { fontSize: 'medium' })}</Box>
        </Paper>
    );

    const filteredBookings = getFilteredAndSortedBookings();
    useEffect(() => { if (page > 0 && filteredBookings.length <= page * rowsPerPage) setPage(Math.max(0, page - 1)); }, [filteredBookings.length, page, rowsPerPage]);

    return (
        <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', pb: 10 }}>
            {/* ✅ บรรทัดนี้สำคัญมาก! แก้บัคหน้ายืนยันเด้งไปอยู่ข้างหลัง */}
            <style>{`.swal2-container { z-index: 20000 !important; }`}</style>

            <AppBar position="sticky" elevation={0} sx={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0' }}>
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
                    <Grid item xs={12} md={4}> <KPICard title="Total Bookings" value={summary.total} icon={<EventNote />} color="#3b82f6" /> </Grid>
                    <Grid item xs={12} md={4}> <KPICard title="Pending Requests" value={summary.pending} icon={<Assessment />} color="#f59e0b" /> </Grid>
                    <Grid item xs={12} md={4}> <KPICard title="Active Rooms" value={summary.activeRooms} icon={<MeetingRoom />} color="#10b981" /> </Grid>
                </Grid>

                <Grid container spacing={3}>
                    <Grid item xs={12} lg={8}>
                        <Grid container spacing={3} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={6}><Paper sx={{ p: 3, borderRadius: 4, height: 320 }}><Typography fontWeight="bold">Status Overview</Typography><Box sx={{ height: 250 }}><SafeResponsiveContainer><SafePieChart><SafePie data={statusStats} cx="50%" cy="50%" outerRadius={80} dataKey="value">{statusStats.map((_: any, i: number) => <SafeCell key={i} fill={COLORS[i % COLORS.length]} />)}</SafePie><SafeTooltip /><SafeLegend /></SafePieChart></SafeResponsiveContainer></Box></Paper></Grid>
                            <Grid item xs={12} md={6}><Paper sx={{ p: 3, borderRadius: 4, height: 320 }}><Typography fontWeight="bold">Room Popularity</Typography><Box sx={{ height: 250 }}><SafeResponsiveContainer><SafeBarChart data={roomStats}><SafeCartesianGrid strokeDasharray="3 3" vertical={false} /><SafeXAxis dataKey="name" /><SafeYAxis /><SafeTooltip /><SafeBar dataKey="count" fill="#6366f1" /></SafeBarChart></SafeResponsiveContainer></Box></Paper></Grid>
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
                                        <TableCell align="center">Detail</TableCell>
                                        <TableCell align="center">Edit</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="right">Action</TableCell>
                                    </TableRow></TableHead>
                                    <TableBody>
                                        {filteredBookings.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((b) => (
                                            <TableRow key={b.id} hover sx={{ bgcolor: b.status === 'pending' ? '#fffbeb' : 'inherit' }}>
                                                <TableCell><Typography variant="caption" display="block" color="text.secondary">Booked at:</Typography><Typography variant="body2" fontWeight="bold">{new Date(b.created_at).toLocaleString('en-US')}</Typography></TableCell>
                                                <TableCell>{b.user?.username}</TableCell>
                                                <TableCell><Box fontWeight="bold" color="primary.main">{b.room?.name}</Box><Typography variant="caption">{new Date(b.start_time).toLocaleString('en-US')} - {new Date(b.end_time).toLocaleTimeString('en-US')}</Typography></TableCell>
                                                <TableCell align="center"><IconButton size="small" color="info" onClick={() => handleViewBooking(b)}><Visibility /></IconButton></TableCell>
                                                <TableCell align="center"><IconButton size="small" color="primary" onClick={() => handleEditBooking(b)}><Edit /></IconButton></TableCell>
                                                <TableCell><Chip label={b.status.toUpperCase()} size="small" color={b.status === 'approved' ? 'success' : b.status === 'pending' ? 'warning' : b.status === 'cancelled' ? 'error' : 'default'} sx={{ fontWeight: 'bold' }} /></TableCell>
                                                <TableCell align="right">
                                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                                        {b.status === 'pending' && <><IconButton size="small" color="success" onClick={() => updateBookingStatus(b.id, 'approved')} title="Approve"><CheckCircle /></IconButton><IconButton size="small" color="error" onClick={() => updateBookingStatus(b.id, 'rejected')} title="Reject"><Cancel /></IconButton></>}
                                                        {b.status === 'approved' && <IconButton size="small" color="warning" onClick={() => handleReturn(b.id)}><Reply /></IconButton>}
                                                        <IconButton size="small" onClick={() => handleDeleteBooking(b.id)}><Delete /></IconButton>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={filteredBookings.length} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} />
                        </Paper>
                    </Grid>

                    <Grid item xs={12} lg={4}>
                        <Card sx={{ borderRadius: 4, height: '100%' }}>
                            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}><Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth"><Tab label="Rooms" /><Tab label="Facilities" /></Tabs></Box>
                            <CardContent>
                                {tabValue === 0 ? (
                                    <Box>
                                        <Typography fontWeight="bold" gutterBottom>Add New Room</Typography>
                                        <Stack spacing={2} component="form" onSubmit={handleCreateRoom} sx={{ mb: 3 }}>
                                            <TextField size="small" label="Room Name" value={newRoom.name} onChange={e => setNewRoom({ ...newRoom, name: e.target.value })} required />
                                            <Stack direction="row" spacing={1}><TextField size="small" label="Capacity" type="number" value={newRoom.capacity} onChange={e => setNewRoom({ ...newRoom, capacity: Number(e.target.value) })} /><TextField size="small" fullWidth label="Location" value={newRoom.location} onChange={e => setNewRoom({ ...newRoom, location: e.target.value })} /></Stack>
                                            <TextField size="small" label="Image URL" value={newRoom.image_url} onChange={e => setNewRoom({ ...newRoom, image_url: e.target.value })} />
                                            <Button type="submit" variant="contained">Create Room</Button>
                                        </Stack>
                                        <Divider sx={{ my: 2 }}>Edit Rooms</Divider>
                                        <Stack spacing={1}>
                                            {rooms.map(r => (
                                                <Paper key={r.id} variant="outlined" sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}><Avatar variant="rounded" src={r.image_url} sx={{ width: 50, height: 50, bgcolor: '#e2e8f0' }}><ImageIcon sx={{ color: '#94a3b8' }} /></Avatar><Box><Typography variant="subtitle2" fontWeight="bold">{r.name}</Typography><Typography variant="caption" color="text.secondary">{r.capacity} ppl • {r.location}</Typography></Box></Box>
                                                    <Box><IconButton size="small" color="primary" onClick={() => openEditRoom(r)}><Edit /></IconButton><IconButton size="small" color="error" onClick={() => handleDeleteRoom(r.id)}><Delete /></IconButton></Box>
                                                </Paper>
                                            ))}
                                        </Stack>
                                    </Box>
                                ) : (
                                    <Box>
                                        <Typography fontWeight="bold" gutterBottom>Add New Facility</Typography>
                                        <Stack spacing={2} component="form" onSubmit={handleCreateFacility} sx={{ mb: 3 }}>
                                            <TextField size="small" label="Facility Name" value={newFacility.name} onChange={e => setNewFacility({ ...newFacility, name: e.target.value })} required />
                                            <TextField size="small" label="Total Stock" type="number" value={newFacility.stock} onChange={e => setNewFacility({ ...newFacility, stock: Number(e.target.value) })} required />
                                            <Button type="submit" variant="contained" color="secondary">Add Facility</Button>
                                        </Stack>
                                        <Divider sx={{ my: 2 }}>Edit Facilities</Divider>
                                        <Stack spacing={1}>
                                            {facilities.map(f => (
                                                <Paper key={f.id} variant="outlined" sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Typography variant="body2">{f.name} (Stock: {f.total_stock})</Typography>
                                                    <Box><IconButton size="small" color="primary" onClick={() => openEditFacility(f)}><Edit /></IconButton><IconButton size="small" color="error" onClick={() => handleDeleteFacility(f.id)}><Delete /></IconButton></Box>
                                                </Paper>
                                            ))}
                                        </Stack>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Modals */}
                <Dialog open={editRoomOpen} onClose={() => setEditRoomOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Edit Room</DialogTitle><DialogContent dividers><Stack spacing={2} sx={{ mt: 1 }}><TextField label="Room Name" fullWidth value={editingRoom?.name || ''} onChange={e => setEditingRoom({ ...editingRoom!, name: e.target.value })} /><TextField label="Capacity" type="number" fullWidth value={editingRoom?.capacity || 0} onChange={e => setEditingRoom({ ...editingRoom!, capacity: Number(e.target.value) })} /><TextField label="Location" fullWidth value={editingRoom?.location || ''} onChange={e => setEditingRoom({ ...editingRoom!, location: e.target.value })} /><TextField label="Image URL" fullWidth value={editingRoom?.image_url || ''} onChange={e => setEditingRoom({ ...editingRoom!, image_url: e.target.value })} /></Stack></DialogContent><DialogActions><Button onClick={() => setEditRoomOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleUpdateRoom}>Save Changes</Button></DialogActions></Dialog>
                <Dialog open={editFacilityOpen} onClose={() => setEditFacilityOpen(false)} fullWidth maxWidth="sm"><DialogTitle>Edit Facility</DialogTitle><DialogContent dividers><Stack spacing={2} sx={{ mt: 1 }}><TextField label="Facility Name" fullWidth value={editingFacility?.name || ''} onChange={e => setEditingFacility({ ...editingFacility!, name: e.target.value })} /><TextField label="Total Stock" type="number" fullWidth value={editingFacility?.total_stock || 0} onChange={e => setEditingFacility({ ...editingFacility!, total_stock: Number(e.target.value) })} /></Stack></DialogContent><DialogActions><Button onClick={() => setEditFacilityOpen(false)}>Cancel</Button><Button variant="contained" onClick={handleUpdateFacility}>Save Changes</Button></DialogActions></Dialog>

                {/* View Modal */}
                <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} fullWidth maxWidth="sm">
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><EventNote color="primary"/> Booking Details</DialogTitle>
                    <DialogContent dividers>
                        {selectedBooking && (
                            <Stack spacing={2}>
                                <Box><Typography variant="caption" color="text.secondary" fontWeight="bold">USER</Typography><Typography variant="body1">{selectedBooking.user?.username}</Typography></Box>
                                <Box><Typography variant="caption" color="text.secondary" fontWeight="bold">ROOM</Typography><Typography variant="body1">{selectedBooking.room?.name}</Typography></Box>
                                <Box><Typography variant="caption" color="text.secondary" fontWeight="bold">TIME</Typography><Typography variant="body1">{new Date(selectedBooking.start_time).toLocaleString()} - {new Date(selectedBooking.end_time).toLocaleTimeString()}</Typography></Box>
                                <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}><Typography variant="caption" color="text.secondary" fontWeight="bold">PURPOSE</Typography><Typography variant="body1" fontWeight="500">{selectedBooking.purpose || "-"}</Typography></Box>
                                <Box><Typography variant="caption" color="text.secondary" fontWeight="bold">ADD-ONS</Typography>{selectedBooking.booking_facilities && selectedBooking.booking_facilities.length > 0 ? (<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>{selectedBooking.booking_facilities.map((bf: any, i: number) => (<Chip key={i} label={`${bf.facility?.name} x${bf.quantity}`} size="small" />))}</Box>) : (<Typography variant="body2" color="text.secondary">- None -</Typography>)}</Box>
                            </Stack>
                        )}
                    </DialogContent>
                    <DialogActions><Button onClick={() => setViewModalOpen(false)}>Close</Button></DialogActions>
                </Dialog>

                {/* Edit Booking Modal */}
                <Dialog open={editBookingOpen} onClose={() => setEditBookingOpen(false)} fullWidth maxWidth="sm">
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: 'white' }}>
                        <Edit /> Edit Booking
                    </DialogTitle>
                    <DialogContent dividers>
                        {editingBooking && (
                            <Stack spacing={3} sx={{ mt: 1 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Room</InputLabel>
                                    <Select 
                                        value={editingBooking.room?.id || ''} 
                                        label="Room"
                                        onChange={(e) => {
                                            const selectedRoom = rooms.find(r => r.id === Number(e.target.value));
                                            setEditingBooking({ ...editingBooking, room: selectedRoom });
                                        }}
                                    >
                                        {rooms.map(r => <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                
                                <TextField 
                                    label="Purpose" 
                                    fullWidth 
                                    multiline 
                                    rows={2}
                                    value={editingBooking.purpose || ''} 
                                    onChange={e => setEditingBooking({ ...editingBooking, purpose: e.target.value })} 
                                />

                                <Box>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <TextField 
                                                label="Start Time" 
                                                type="datetime-local" 
                                                InputLabelProps={{ shrink: true }}
                                                fullWidth 
                                                value={formatDateForInput(editingBooking.start_time)} 
                                                onChange={e => setEditingBooking({ ...editingBooking, start_time: e.target.value })} 
                                                error={editDurationStr.includes('❌')}
                                            />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <TextField 
                                                label="End Time" 
                                                type="datetime-local" 
                                                InputLabelProps={{ shrink: true }}
                                                fullWidth 
                                                value={formatDateForInput(editingBooking.end_time)} 
                                                onChange={e => setEditingBooking({ ...editingBooking, end_time: e.target.value })} 
                                                error={editDurationStr.includes('❌')}
                                            />
                                        </Grid>
                                    </Grid>
                                    {editDurationStr && (
                                        <Chip 
                                            icon={<AccessTime />} 
                                            label={editDurationStr} 
                                            color={editDurationStr.includes('❌') ? 'error' : 'success'} 
                                            variant={editDurationStr.includes('❌') ? 'filled' : 'outlined'}
                                            sx={{ mt: 2, fontWeight: 'bold' }} 
                                        />
                                    )}
                                </Box>
                            </Stack>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setEditBookingOpen(false)} color="inherit">Cancel</Button>
                        <Button 
                            variant="contained" 
                            onClick={handleSaveBookingEdit}
                            disabled={editDurationStr.includes('❌') || !editDurationStr}
                            color="primary"
                        >
                            Save Changes
                        </Button>
                    </DialogActions>
                </Dialog>

                {adminId && <ChatWidget userId={adminId} role="admin" />}
            </Container>
        </Box>
    );
}

export default AdminDashboard;