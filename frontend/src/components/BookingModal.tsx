import  { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, Stack, IconButton, Chip, Grid, Divider } from '@mui/material';
import { Add, Remove, AccessTime, Inventory2, EventAvailable, Notes, CalendarMonth } from '@mui/icons-material';
import Swal from 'sweetalert2';
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
      </Dialog>
    </>
  );
};
export default BookingModal;