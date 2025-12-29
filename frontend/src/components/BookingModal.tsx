import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, Stack, Fade, CircularProgress
} from '@mui/material';
import { EventAvailable, AccessTime, Description } from '@mui/icons-material';
import api from '../api/axios';
import type { MeetingRoom } from '../types';

interface BookingModalProps {
  open: boolean;
  handleClose: () => void;
  room: MeetingRoom | null;
  onSuccess: () => void;
}

const BookingModal = ({ open, handleClose, room, onSuccess }: BookingModalProps) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!room || !startTime || !endTime) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      // ✅ Handle Submit Logic
      await api.post('/bookings', {
        roomId: room.id,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        purpose,
      });
      
      // ✅ Show Success Message
      alert(`🎉 จองห้อง "${room.name}" สำเร็จเรียบร้อย!`);
      onSuccess(); // รีเฟรชข้อมูลห้อง
      handleClose(); // ปิด Modal
      
      // Reset Form
      setStartTime('');
      setEndTime('');
      setPurpose('');
    } catch (error: any) {
      // ✅ Show Error Message
      console.error(error);
      alert('❌ จองไม่สำเร็จ: ช่วงเวลานี้อาจมีคนจองแล้ว หรือระบบขัดข้อง');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      fullWidth 
      maxWidth="sm"
      TransitionComponent={Fade}
      PaperProps={{ sx: { borderRadius: 3, boxShadow: 24 } }}
    >
      <Box sx={{ background: 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)', color: 'white', p: 2 }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
          <EventAvailable /> จองห้องประชุม: {room?.name}
        </DialogTitle>
      </Box>

      <DialogContent sx={{ mt: 3 }}>
        <Stack spacing={3}>
          <Box sx={{ p: 2, bgcolor: '#f5f7fa', borderRadius: 2, border: '1px dashed #ccc' }}>
            <Typography variant="body2" color="text.secondary">📍 สถานที่: {room?.location}</Typography>
            <Typography variant="body2" color="text.secondary">👥 ความจุ: {room?.capacity} ท่าน</Typography>
          </Box>

          <TextField
            label="เวลาเริ่มต้น"
            type="datetime-local"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            InputProps={{ startAdornment: <AccessTime sx={{ mr: 1, color: 'action.active' }} /> }}
          />
          <TextField
            label="เวลาสิ้นสุด"
            type="datetime-local"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            InputProps={{ startAdornment: <AccessTime sx={{ mr: 1, color: 'action.active' }} /> }}
          />
          <TextField
            label="จุดประสงค์การใช้งาน"
            multiline
            rows={3}
            fullWidth
            placeholder="เช่น ประชุม Weekly Team, นัดลูกค้า..."
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            InputProps={{ startAdornment: <Description sx={{ mr: 1, mt: 1, color: 'action.active', alignSelf: 'flex-start' }} /> }}
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} color="inherit" disabled={loading}>ยกเลิก</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          sx={{ px: 4, borderRadius: 2, bgcolor: '#1565c0', '&:hover': { bgcolor: '#0d47a1' } }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'ยืนยันการจอง'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookingModal;