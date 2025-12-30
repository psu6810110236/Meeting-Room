import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api/axios'; 
import './App.css';
// ดึง Type มาใช้เพื่อให้ตรงกับระบบ
import type { Booking, Facility, MeetingRoom as Room } from './types';

function AdminDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [newRoom, setNewRoom] = useState({ name: '', capacity: 0, location: '' });
  const [newFacility, setNewFacility] = useState({ name: '', stock: 1 });

  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings');
      setBookings(response.data);
    } catch (error) { console.error("Fetch bookings error:", error); }
  };

  const fetchRooms = async () => {
    try {
      const response = await api.get('/rooms');
      setRooms(response.data);
    } catch (error) { console.error("Fetch rooms error:", error); }
  };

  const fetchFacilities = async () => {
    try {
      const response = await api.get('/facilities');
      setFacilities(response.data);
    } catch (error) { console.error("Fetch facilities error:", error); }
  };

  const updateBookingStatus = async (id: number, status: 'approved' | 'rejected') => {
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      fetchBookings();
      fetchFacilities(); 
    } catch (error) { alert('ไม่สามารถอัปเดตสถานะได้!'); }
  };

  /**
   * ✅ ฟังก์ชันสำหรับยืนยันการคืนของ (Manual Return)
   * เมื่อกดแล้วสต็อกจะถูกบวกกลับเข้าสู่ระบบ
   */
  const handleConfirmReturn = async (id: number) => {
    if (!confirm('ยืนยันว่าได้รับอุปกรณ์คืนครบถ้วนแล้ว? สต็อกจะถูกเพิ่มกลับเข้าสู่ระบบทันที')) return;
    try {
      await api.patch(`/bookings/${id}/return`);
      alert('ยืนยันการคืนของสำเร็จ ✅');
      fetchBookings();
      fetchFacilities(); // รีเฟรชสต็อกที่แสดงด้านล่างด้วย
    } catch (error) { 
      console.error(error);
      alert('เกิดข้อผิดพลาดในการคืนของ'); 
    }
  };

  // ✅ ฟังก์ชันลบประวัติการจอง (เพิ่มใหม่)
  const handleDeleteBooking = async (id: number) => {
    if (!confirm('⚠️ ยืนยันที่จะลบประวัติการจองนี้? ข้อมูลจะหายไปถาวร!')) return;
    try {
      await api.delete(`/bookings/${id}`);
      fetchBookings(); // รีโหลดข้อมูลใหม่หลังลบเสร็จ
    } catch (error) {
      alert('ลบรายการไม่สำเร็จ (ตรวจสอบว่า Backend มี API Delete หรือยัง)');
      console.error(error);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/rooms', { ...newRoom, capacity: Number(newRoom.capacity), is_active: true });
      setNewRoom({ name: '', capacity: 0, location: '' });
      fetchRooms();
      alert('สร้างห้องสำเร็จ ✅');
    } catch (error) { alert('สร้างห้องไม่สำเร็จ'); }
  };

  const handleDeleteRoom = async (id: number) => {
    if (!confirm('ยืนยันลบห้องนี้?')) return;
    try {
      await api.delete(`/rooms/${id}`);
      fetchRooms();
    } catch (error) { alert('ลบห้องไม่สำเร็จ'); }
  };

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/facilities', { 
        name: newFacility.name,
        total_stock: Number(newFacility.stock) 
      });
      setNewFacility({ name: '', stock: 1 }); 
      fetchFacilities();
      alert('เพิ่มอุปกรณ์และตั้งค่าสต็อกสำเร็จ! 🛠️');
    } catch (error) { alert('เพิ่มอุปกรณ์ไม่สำเร็จ'); }
  };

  const handleDeleteFacility = async (id: number) => {
    if (!confirm('ยืนยันลบอุปกรณ์นี้?')) return;
    try {
      await api.delete(`/facilities/${id}`);
      fetchFacilities();
    } catch (error) { alert('ลบอุปกรณ์ไม่สำเร็จ'); }
  };

  useEffect(() => {
    fetchBookings();
    fetchRooms();
    fetchFacilities();
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header" style={{ position: 'relative' }}>
        <button onClick={() => navigate('/')} className="btn" style={{ position: 'absolute', left: 0, top: 20, background: '#cbd5e1' }}>⬅️ กลับหน้าจอง</button>
        <h1 className="dashboard-title">👮‍♂️ Admin Dashboard</h1>
        <p>Control Panel & Management System</p>
      </div>

      <div className="dashboard-card">
        <h2 className="card-title">📅 รายการจองล่าสุด</h2>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>ผู้จอง</th>
                <th>ห้อง & อุปกรณ์ที่ยืม</th>
                <th>เวลาการจอง</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>#{b.id}</td>
                  <td>{b.user?.username || 'ไม่ระบุ'}</td>
                  <td>
                    <div style={{ fontWeight: 'bold', color: '#1e3a8a' }}>{b.room?.name || 'ห้องถูกลบ'}</div>
                    {b.booking_facilities && b.booking_facilities.length > 0 && (
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '6px', background: '#f1f5f9', padding: '6px', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                        <div style={{ fontWeight: '600', marginBottom: '2px' }}>📦 อุปกรณ์ที่ขอใช้:</div>
                        {b.booking_facilities.map((bf: any) => (
                          <div key={bf.id}>• {bf.facility?.name} (จำนวน {bf.quantity} ชิ้น)</div>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>วัตถุประสงค์: {b.purpose}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                       <span style={{ color: '#059669', fontWeight: 'bold' }}>เริ่ม: </span>
                       {new Date(b.start_time).toLocaleString('th-TH')}
                    </div>
                    <div style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', marginTop: '4px' }}>
                       <span style={{ color: '#dc2626', fontWeight: 'bold' }}>ถึง: </span>
                       {new Date(b.end_time).toLocaleString('th-TH')}
                    </div>
                  </td>
                  <td><span className={`status-badge status-${b.status}`}>{b.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {/* ส่วนจัดการการจองที่รออนุมัติ */}
                      {b.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => updateBookingStatus(b.id, 'approved')} className="btn btn-success btn-icon" title="อนุมัติ">✓</button>
                          <button onClick={() => updateBookingStatus(b.id, 'rejected')} className="btn btn-danger btn-icon" title="ปฏิเสธ">✕</button>
                        </div>
                      )}

                      {/* ✅ ส่วนการยืนยันคืนของ: แสดงเฉพาะรายการที่อนุมัติแล้ว (approved) */}
                      {b.status === 'approved' && (
                        <button 
                          onClick={() => handleConfirmReturn(b.id)} 
                          className="btn btn-primary" 
                          style={{ 
                            padding: '6px 10px', 
                            fontSize: '0.8rem',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            border: 'none',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          📦 ยืนยันคืนของ
                        </button>
                      )}
                      
                      {/* ✅ ปุ่มลบประวัติการจอง (เพิ่มใหม่) */}
                      <button 
                        onClick={() => handleDeleteBooking(b.id)} 
                        className="btn btn-danger btn-icon" 
                        style={{ alignSelf: 'flex-start', padding: '6px 10px' }}
                        title="ลบประวัตินี้ถาวร"
                      >
                        🗑️ ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div className="dashboard-card" style={{ flex: 2, minWidth: '300px' }}>
          <h2 className="card-title">🏢 จัดการห้องประชุม</h2>
          <form onSubmit={handleCreateRoom} className="room-form">
            <input className="form-input" type="text" placeholder="ชื่อห้อง" value={newRoom.name} onChange={e => setNewRoom({...newRoom, name: e.target.value})} required />
            <input className="form-input" type="number" placeholder="ความจุ" style={{ maxWidth: '80px' }} value={newRoom.capacity || ''} onChange={e => setNewRoom({...newRoom, capacity: parseInt(e.target.value)})} required />
            <input className="form-input" type="text" placeholder="สถานที่" value={newRoom.location} onChange={e => setNewRoom({...newRoom, location: e.target.value})} required />
            <button type="submit" className="btn btn-primary">บันทึก</button>
          </form>
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ color: 'white' }}>ID</th>
                <th style={{ color: 'white' }}>ชื่อห้อง</th>
                <th style={{ color: 'white' }}>ความจุ</th>
                <th style={{ color: 'white' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r.id}>
                  <td>#{r.id}</td><td>{r.name}</td><td>{r.capacity} คน</td>
                  <td><button onClick={() => handleDeleteRoom(r.id)} className="btn btn-danger btn-icon">🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dashboard-card" style={{ flex: 1, minWidth: '350px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.2em' }}>🛠️</span> สิ่งอำนวยความสะดวก
          </h2>
          
          <form onSubmit={handleCreateFacility} style={{ 
            background: '#f8fafc', 
            padding: '15px', 
            borderRadius: '12px', 
            marginBottom: '20px',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxSizing: 'border-box' 
          }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                className="form-input" 
                style={{ flex: 2, borderRadius: '8px', minWidth: 0 }}
                type="text" 
                placeholder="ชื่ออุปกรณ์" 
                value={newFacility.name} 
                onChange={e => setNewFacility({...newFacility, name: e.target.value})} 
                required 
              />
              <input 
                className="form-input" 
                style={{ flex: 1, textAlign: 'center', borderRadius: '8px', minWidth: '60px' }}
                type="number" 
                placeholder="สต็อก" 
                min="1" 
                value={newFacility.stock} 
                onChange={e => setNewFacility({...newFacility, stock: parseInt(e.target.value)})} 
                required 
              />
            </div>
            <button type="submit" className="btn btn-success" style={{ 
              width: '100%', 
              borderRadius: '8px', 
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              padding: '10px'
            }}>
              + เพิ่มอุปกรณ์ใหม่
            </button>
          </form>

          <div className="table-responsive" style={{ border: 'none' }}>
            <table className="custom-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ color: 'white', fontWeight: 'bold' }}>ID</th>
                  <th style={{ color: 'white', fontWeight: 'bold' }}>อุปกรณ์</th>
                  <th style={{ color: 'white', fontWeight: 'bold', textAlign: 'center' }}>สต็อกคงเหลือ</th>
                  <th style={{ color: 'white', fontWeight: 'bold', textAlign: 'right' }}>ลบ</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((f) => (
                  <tr key={f.id}>
                    <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>#{f.id}</td>
                    <td style={{ fontWeight: '600' }}>{f.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ 
                        background: f.total_stock > 5 ? '#ecfdf5' : '#fef2f2', 
                        color: f.total_stock > 5 ? '#059669' : '#dc2626',
                        padding: '2px 10px',
                        borderRadius: '20px',
                        fontWeight: '800',
                        fontSize: '0.85rem',
                        border: `1px solid ${f.total_stock > 5 ? '#d1fae5' : '#fee2e2'}`,
                        display: 'inline-block',
                        minWidth: '30px'
                      }}>
                        {f.total_stock}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => handleDeleteFacility(f.id)} className="btn btn-danger btn-icon" style={{ borderRadius: '6px' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;