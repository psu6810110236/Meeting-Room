import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box
} from '@mui/material';
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
    if (!room || !startTime || !endTime) return;

    setLoading(true);
    try {
      // แปลงเวลาเป็น ISO String ตามที่ Backend ต้องการ
      await api.post('/bookings', {
        roomId: room.id,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        purpose,
      });
      
      alert('Booking Successful! 🎉');
      onSuccess(); // แจ้ง Parent ว่าสำเร็จ
      handleClose(); // ปิด Modal
      
      // Reset Form
      setStartTime('');
      setEndTime('');
      setPurpose('');
      
    } catch (error: any) {
      console.error(error);
      const message = error.response?.data?.message || 'Booking Failed';
      alert(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Book Room: {room?.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <TextField
            label="Start Time"
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            fullWidth
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <TextField
            label="End Time"
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            fullWidth
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
          <TextField
            label="Purpose"
            multiline
            rows={3}
            fullWidth
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g., Team Meeting, Client Call"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading || !startTime || !endTime}
        >
          {loading ? 'Booking...' : 'Confirm Booking'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookingModal;