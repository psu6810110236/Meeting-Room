<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Box, Typography, Stack, IconButton 
} from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import Swal from 'sweetalert2'; 
=======
import  { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, Stack, IconButton, Chip, Grid, Divider } from '@mui/material';
import { Add, Remove, AccessTime, Inventory2, EventAvailable, Notes, CalendarMonth } from '@mui/icons-material';
import Swal from 'sweetalert2';
>>>>>>> new
import api from '../api/axios';
import type { MeetingRoom, Facility } from '../types';

interface BookingModalProps { open: boolean; handleClose: () => void; room: MeetingRoom | null; onSuccess: () => void; }

const BookingModal = ({ open, handleClose, room, onSuccess }: BookingModalProps) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});
  const [durationStr, setDurationStr] = useState('');

  useEffect(() => { if (open) { api.get(`/facilities?t=${new Date().getTime()}`).then(res => setFacilities(res.data)).catch(console.error); setStartTime(''); setEndTime(''); setPurpose(''); setSelectedQuantities({}); setDurationStr(''); } }, [open]);

  useEffect(() => {
<<<<<<< HEAD
    if (open) {
      // ดึงข้อมูลอุปกรณ์ (ใส่ timestamp กัน cache)
      api.get(`/facilities?t=${new Date().getTime()}`)
        .then(res => setFacilities(res.data))
        .catch(err => console.error("Error fetching facilities:", err));

      // รีเซ็ตค่าต่างๆ
      setSelectedQuantities({});
      setStartTime('');
      setEndTime('');
      setPurpose('');
    }
  }, [open]);

  const handleQuantityChange = (id: number, delta: number, maxStock: number) => {
    setSelectedQuantities(prev => {
      const currentQty = prev[id] || 0;
      const newQty = currentQty + delta;
      
      if (newQty < 0 || newQty > maxStock) return prev;
      
      const newMap = { ...prev };
      if (newQty === 0) delete newMap[id];
      else newMap[id] = newQty;
      return newMap;
    });
  };

  const handleSubmit = async () => {
    // 1. ตรวจสอบข้อมูล (Validation)
    if (!startTime || !endTime || !purpose) {
      Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        text: 'กรุณากรอกเวลาและวัตถุประสงค์ให้ครบถ้วน',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    // เตรียมรายการอุปกรณ์เพื่อแสดงใน Popup
    const selectedFacilitiesList = Object.entries(selectedQuantities).map(([id, qty]) => {
      const facility = facilities.find(f => f.id === Number(id));
      return facility ? `<li>${facility.name}: <b>${qty}</b> ชิ้น</li>` : '';
    }).join('');

    // 2. แสดง Popup ยืนยัน (Confirmation)
    const result = await Swal.fire({
      title: 'ยืนยันการจองห้อง?',
      html: `
        <div style="text-align: left; font-size: 0.9rem; line-height: 1.6;">
          <p><b>ห้อง:</b> <span style="color: #1976d2">${room?.name}</span></p>
          <p><b>เริ่ม:</b> ${new Date(startTime).toLocaleString('th-TH')}</p>
          <p><b>ถึง:</b> ${new Date(endTime).toLocaleString('th-TH')}</p>
          <p><b>วัตถุประสงค์:</b> ${purpose}</p>
          ${selectedFacilitiesList ? `<hr/><p><b>อุปกรณ์ที่เลือก:</b></p><ul style="margin-top:0; padding-left: 20px;">${selectedFacilitiesList}</ul>` : ''}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันการจอง',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#1976d2',
      cancelButtonColor: '#d32f2f'
    });

    if (result.isConfirmed) {
      const facilitiesToSend = Object.entries(selectedQuantities).map(([id, qty]) => ({
        facility_id: Number(id),
        quantity: qty
      }));

      try {
        await api.post('/bookings', {
          roomId: room?.id,
          startTime,
          endTime,
          purpose,
          facilities: facilitiesToSend 
        });

        // ✅ 3. แก้ไขข้อความแจ้งเตือน (Success -> Pending)
        await Swal.fire({
          icon: 'success', // ใช้ success เพื่อบอกว่า "ส่งข้อมูลสำเร็จ"
          title: 'ส่งคำขอเรียบร้อย! ⏳',
          text: 'คำขอของคุณถูกส่งแล้ว กรุณารอการอนุมัติจากผู้ดูแลระบบ',
          timer: 3000,
          showConfirmButton: true,
          confirmButtonText: 'ตกลง'
        });

        onSuccess(); 
        handleClose();

      } catch (error: any) {
        console.error(error);
        Swal.fire({
          icon: 'error',
          title: 'ทำรายการไม่สำเร็จ',
          text: error.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
          confirmButtonColor: '#d32f2f'
        });
      }
    }
  };

  return (
    <>
      {/* CSS บังคับให้ SweetAlert อยู่บนสุด */}
      <style>{`
        .swal2-container {
          z-index: 20000 !important;
        }
      `}</style>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold', color: '#1976d2', borderBottom: '1px solid #eee' }}>
          📅 Book Room: {room?.name}
        </DialogTitle>
        
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2.5}>
            <TextField 
              label="Start Time" 
              type="datetime-local" 
              fullWidth 
              InputLabelProps={{ shrink: true }} 
              value={startTime} 
              onChange={(e) => setStartTime(e.target.value)} 
            />
            <TextField 
              label="End Time" 
              type="datetime-local" 
              fullWidth 
              InputLabelProps={{ shrink: true }} 
              value={endTime} 
              onChange={(e) => setEndTime(e.target.value)} 
            />
            <TextField 
              label="Purpose" 
              fullWidth 
              multiline
              rows={2}
              placeholder="เช่น ประชุมวางแผนงานโครงการ..."
              value={purpose} 
              onChange={(e) => setPurpose(e.target.value)} 
            />
            
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: '#333' }}>
                🛠️ Select Equipment (Optional)
              </Typography>
              
              <Stack spacing={1.5}>
                {facilities.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    - ไม่มีอุปกรณ์ให้ยืมในขณะนี้ -
                  </Typography>
                ) : (
                  facilities.map((fac) => {
                    const qty = selectedQuantities[fac.id] || 0;
                    const isOutOfStock = fac.total_stock === 0 && qty === 0;

                    return (
                      <Box key={fac.id} sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        p: 1.5, 
                        border: '1px solid',
                        borderColor: qty > 0 ? '#1976d2' : '#e0e0e0',
                        borderRadius: 2,
                        bgcolor: qty > 0 ? '#f0f7ff' : '#fff',
                        opacity: isOutOfStock ? 0.6 : 1
                      }}>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {fac.name}
                          </Typography>
                          <Typography variant="caption" color={fac.total_stock > 0 ? "success.main" : "error.main"}>
                             {isOutOfStock ? 'สินค้าหมด' : `คงเหลือ: ${fac.total_stock} ชิ้น`}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleQuantityChange(fac.id, -1, fac.total_stock)} 
                            disabled={qty === 0}
                            sx={{ border: '1px solid #ccc' }}
                          >
                            <Remove fontSize="small" />
                          </IconButton>
                          
                          <Typography sx={{ fontWeight: 'bold', minWidth: '24px', textAlign: 'center' }}>
                            {qty}
                          </Typography>
                          
                          <IconButton 
                            size="small" 
                            onClick={() => handleQuantityChange(fac.id, 1, fac.total_stock)} 
                            disabled={qty >= fac.total_stock} 
                            color="primary"
                            sx={{ border: '1px solid', borderColor: 'primary.main', bgcolor: 'primary.light', color: 'white', '&:hover': { bgcolor: 'primary.main' } }}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        
        <DialogActions sx={{ p: 2.5, pt: 1, borderTop: '1px solid #eee' }}>
          <Button onClick={handleClose} color="inherit" sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={!startTime || !endTime || !purpose}
            sx={{ borderRadius: 2, px: 4, boxShadow: 'none' }}
          >
            Confirm Booking
          </Button>
        </DialogActions>
=======
    if (startTime && endTime) {
      const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime();
      if (diffMs > 0) { const h = Math.floor(diffMs/3600000); const m = Math.round((diffMs%3600000)/60000); setDurationStr(`${h>0?`${h} ชม. `:''}${m>0?`${m} น.`:''}`); } else setDurationStr('❌ เวลาไม่ถูกต้อง');
    } else setDurationStr('');
  }, [startTime, endTime]);

  const handleQuantityChange = (id: number, delta: number, max: number) => {
    setSelectedQuantities(prev => { const newQty = (prev[id] || 0) + delta; if (newQty < 0 || newQty > max) return prev; const newMap = { ...prev }; newQty === 0 ? delete newMap[id] : newMap[id] = newQty; return newMap; });
  };

  const submitBooking = async () => {
    try {
      await api.post('/bookings', { roomId: room?.id, startTime, endTime, purpose, facilities: Object.entries(selectedQuantities).map(([id, qty]) => ({ facility_id: Number(id), quantity: qty })) });
      Swal.fire({ title: 'จองสำเร็จ! 🎉', text: 'ส่งคำขอแล้ว', icon: 'success', timer: 2000, showConfirmButton: false });
      onSuccess(); handleClose();
    } catch (e: any) { Swal.fire('จองไม่สำเร็จ', e.response?.data?.message || 'Error', 'error'); }
  };

  const handleConfirm = () => {
    if (!startTime || !endTime || !purpose) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุเวลาและวัตถุประสงค์', 'warning');
    const items = Object.entries(selectedQuantities).map(([id, qty]) => `<li>${facilities.find(f=>f.id===Number(id))?.name}: <b>${qty}</b></li>`).join('');
    
    Swal.fire({
      title: 'ยืนยันการจอง?', 
      html: `<div style="text-align:left; font-size:0.9rem"><p><b>ห้อง:</b> ${room?.name}</p><p><b>เวลา:</b> ${new Date(startTime).toLocaleString('th-TH')} - ${new Date(endTime).toLocaleTimeString('th-TH')}</p><p><b>วัตถุประสงค์:</b> ${purpose}</p>${items ? `<hr/><p><b>อุปกรณ์:</b></p><ul>${items}</ul>` : ''}</div>`, 
      icon: 'question', 
      showCancelButton: true, 
      confirmButtonText: 'ยืนยัน', 
      confirmButtonColor: '#1e3a8a'
    }).then((r) => {
        // ✅ แก้ไขตรงนี้: ใช้ if แทน && เพื่อไม่ให้ return false ออกไป
        if (r.isConfirmed) {
            submitBooking();
        }
    });
  };

  return (
    <>
      <style>{`.swal2-container { z-index: 20000 !important; }`}</style>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: 'white', py: 2.5, display: 'flex', gap: 2, alignItems: 'center' }}>
          <EventAvailable fontSize="large"/> <Box><Typography variant="h5" fontWeight="bold">จองห้อง: {room?.name}</Typography><Typography variant="body2" sx={{opacity:0.8}}>กรอกรายละเอียดด้านล่าง</Typography></Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          <Stack spacing={4}>
            <Box><Typography variant="h6" fontWeight="bold" gutterBottom sx={{display:'flex', gap:1}}><CalendarMonth color="primary"/> วัน-เวลา</Typography><Grid container spacing={2}><Grid item xs={6}><TextField type="datetime-local" label="เริ่ม" fullWidth InputLabelProps={{shrink:true}} value={startTime} onChange={e=>setStartTime(e.target.value)}/></Grid><Grid item xs={6}><TextField type="datetime-local" label="สิ้นสุด" fullWidth InputLabelProps={{shrink:true}} value={endTime} onChange={e=>setEndTime(e.target.value)}/></Grid></Grid>{durationStr && <Chip icon={<AccessTime/>} label={durationStr} color={durationStr.includes('❌')?'error':'primary'} sx={{mt:2}}/>}</Box>
            <Divider/>
            <Box><Typography variant="h6" fontWeight="bold" gutterBottom sx={{display:'flex', gap:1}}><Notes color="primary"/> วัตถุประสงค์</Typography><TextField fullWidth multiline rows={2} placeholder="ระบุรายละเอียด..." value={purpose} onChange={e=>setPurpose(e.target.value)}/></Box>
            <Divider/>
            <Box><Typography variant="h6" fontWeight="bold" gutterBottom sx={{display:'flex', gap:1}}><Inventory2 color="primary"/> ยืมอุปกรณ์เพิ่ม</Typography><Box sx={{bgcolor:'#f8fafc', p:2, borderRadius:2, border:'1px solid #eee', maxHeight:200, overflowY:'auto'}}>{facilities.length===0?<Typography align="center" color="text.secondary">- ไม่มีอุปกรณ์ -</Typography>:<Grid container spacing={2}>{facilities.map(f=>{const qty=selectedQuantities[f.id]||0; return (<Grid item xs={6} key={f.id}><Box sx={{display:'flex', justifyContent:'space-between', p:1.5, border:'1px solid', borderColor:qty>0?'primary.main':'#eee', borderRadius:2, bgcolor:qty>0?'#eff6ff':'white'}}><Box><Typography variant="body2" fontWeight="bold">{f.name}</Typography><Typography variant="caption">คลัง: {f.total_stock}</Typography></Box><Box sx={{display:'flex', alignItems:'center', gap:1}}><IconButton size="small" onClick={()=>handleQuantityChange(f.id,-1,f.total_stock)} disabled={qty===0}><Remove fontSize="small"/></IconButton><Typography fontWeight="bold">{qty}</Typography><IconButton size="small" color="primary" onClick={()=>handleQuantityChange(f.id,1,f.total_stock)} disabled={qty>=f.total_stock}><Add fontSize="small"/></IconButton></Box></Box></Grid>)})}</Grid>}</Box></Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: '#f8fafc', justifyContent: 'space-between' }}><Button onClick={handleClose} color="inherit">ยกเลิก</Button><Button onClick={handleConfirm} variant="contained" size="large" sx={{px:4, background:'linear-gradient(90deg, #2563eb, #1e40af)'}} disabled={!startTime||!endTime||!purpose}>ยืนยันการจอง</Button></DialogActions>
>>>>>>> new
      </Dialog>
    </>
  );
};
export default BookingModal;