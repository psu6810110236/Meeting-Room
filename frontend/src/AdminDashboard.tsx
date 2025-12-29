import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

interface Booking {
  id: number;
  purpose: string;
  start_time: string;
  end_time: string;
  status: string;
  user: { username: string };
  room: { name: string };
}

interface Room {
  id: number;
  name: string;
  capacity: number;
  location: string;
  is_active: boolean;
}

// ✅ เพิ่ม Interface สำหรับ Facility
interface Facility {
  id: number;
  name: string;
}

function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]); // state เก็บ facilities

  const [newRoom, setNewRoom] = useState({ name: '', capacity: 0, location: '' });
  const [newFacilityName, setNewFacilityName] = useState(''); // state ฟอร์ม facility

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  // --- Fetch Functions ---
  const fetchBookings = async () => {
    try {
      const response = await axios.get('http://localhost:3000/bookings', { headers });
      setBookings(response.data);
    } catch (error) { console.error(error); }
  };

  const fetchRooms = async () => {
    try {
      const response = await axios.get('http://localhost:3000/rooms');
      setRooms(response.data);
    } catch (error) { console.error(error); }
  };

  const fetchFacilities = async () => {
    try {
      const response = await axios.get('http://localhost:3000/facilities');
      setFacilities(response.data);
    } catch (error) { console.error(error); }
  };

  // --- Action Functions ---
  const updateBookingStatus = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await axios.patch(`http://localhost:3000/bookings/${id}/status`, { status }, { headers });
      fetchBookings();
    } catch (error) { alert('Error!'); }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/rooms', { ...newRoom, capacity: Number(newRoom.capacity) }, { headers });
      setNewRoom({ name: '', capacity: 0, location: '' });
      fetchRooms();
    } catch (error) { alert('Failed to create room'); }
  };

  const handleDeleteRoom = async (id: number) => {
    if (!confirm('ยืนยันลบห้องนี้?')) return;
    try {
      await axios.delete(`http://localhost:3000/rooms/${id}`, { headers });
      fetchRooms();
    } catch (error) { alert('Failed to delete room'); }
  };

  // ✅ ฟังก์ชันสร้าง Facility
  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/facilities', { name: newFacilityName }, { headers });
      setNewFacilityName('');
      fetchFacilities();
      alert('เพิ่มอุปกรณ์สำเร็จ! 🛠️');
    } catch (error) { alert('Failed to create facility'); }
  };

  // ✅ ฟังก์ชันลบ Facility
  const handleDeleteFacility = async (id: number) => {
    if (!confirm('ยืนยันลบอุปกรณ์นี้?')) return;
    try {
      await axios.delete(`http://localhost:3000/facilities/${id}`, { headers });
      fetchFacilities();
    } catch (error) { alert('Failed to delete facility'); }
  };

  useEffect(() => {
    fetchBookings();
    fetchRooms();
    fetchFacilities(); // เรียกดึงข้อมูลตอนเริ่ม
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">👮‍♂️ Admin Dashboard</h1>
        <p style={{ color: '#64748b' }}>Control Panel & Management System</p>
      </div>

      {/* --- Section 1: Bookings --- */}
      <div className="dashboard-card">
        <h2 className="card-title">📅 รายการจองล่าสุด</h2>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>ผู้จอง</th>
                <th>ห้อง</th>
                <th>เวลา</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>#{b.id}</td>
                  <td style={{ fontWeight: '600', color: '#1e293b' }}>{b.user?.username}</td>
                  <td>{b.room?.name}</td>
                  <td>
                    {new Date(b.start_time).toLocaleDateString()} <br />
                    <small style={{ color: '#64748b' }}>
                      {new Date(b.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                      {new Date(b.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </small>
                  </td>
                  <td>
                    <span className={`status-badge status-${b.status}`}>
                      {b.status}
                    </span>
                  </td>
                  <td>
                    {b.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => updateBookingStatus(b.id, 'approved')} className="btn btn-success btn-icon">✓</button>
                        <button onClick={() => updateBookingStatus(b.id, 'rejected')} className="btn btn-danger btn-icon">✕</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>ไม่พบรายการจองในระบบ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* --- Section 2: Rooms --- */}
        <div className="dashboard-card" style={{ flex: 2, minWidth: '300px' }}>
          <h2 className="card-title">🏢 จัดการห้องประชุม</h2>
          
          <form onSubmit={handleCreateRoom} className="room-form">
            <span className="form-label-highlight">+ ห้องใหม่:</span>
            <input 
              className="form-input" type="text" placeholder="ชื่อห้อง" 
              value={newRoom.name} onChange={e => setNewRoom({...newRoom, name: e.target.value})} required 
            />
            <input 
              className="form-input" type="number" placeholder="ความจุ" style={{ maxWidth: '80px' }}
              value={newRoom.capacity || ''} onChange={e => setNewRoom({...newRoom, capacity: parseInt(e.target.value)})} required 
            />
            <input 
              className="form-input" type="text" placeholder="สถานที่" 
              value={newRoom.location} onChange={e => setNewRoom({...newRoom, location: e.target.value})} required 
            />
            <button type="submit" className="btn btn-primary">บันทึก</button>
          </form>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ชื่อห้อง</th>
                  <th>ความจุ</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id}>
                    <td>#{r.id}</td>
                    <td style={{ fontWeight: '600', color: '#1e293b' }}>{r.name}</td>
                    <td>{r.capacity} คน</td>
                    <td>
                      <button onClick={() => handleDeleteRoom(r.id)} className="btn btn-danger btn-icon" title="ลบห้อง">🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- Section 3: Facilities (เพิ่มใหม่) --- */}
        <div className="dashboard-card" style={{ flex: 1, minWidth: '300px' }}>
          <h2 className="card-title">🛠️ สิ่งอำนวยความสะดวก</h2>
          
          <form onSubmit={handleCreateFacility} className="room-form">
            <input 
              className="form-input" type="text" placeholder="ชื่ออุปกรณ์ (เช่น Projector)" 
              value={newFacilityName} onChange={e => setNewFacilityName(e.target.value)} required 
            />
            <button type="submit" className="btn btn-success">+ เพิ่ม</button>
          </form>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ชื่ออุปกรณ์</th>
                  <th>ลบ</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((f) => (
                  <tr key={f.id}>
                    <td>#{f.id}</td>
                    <td style={{ fontWeight: '600', color: '#1e293b' }}>{f.name}</td>
                    <td>
                      <button onClick={() => handleDeleteFacility(f.id)} className="btn btn-danger btn-icon">✕</button>
                    </td>
                  </tr>
                ))}
                {facilities.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8' }}>ไม่มีข้อมูล</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

export default AdminDashboard;