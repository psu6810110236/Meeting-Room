import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, Stack, IconButton } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import api from '../api/axios';
import type { MeetingRoom, Facility } from '../types';

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
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    if (open) {
      // ✅ แก้ไข: เพิ่ม Parameter Timestamp (?t=...) เพื่อป้องกัน Browser ดึงข้อมูลเก่าจาก Cache
      // วิธีนี้จะทำให้ User เห็นสต็อกที่ Admin อัปเดตแล้วทันที
      api.get(`/facilities?t=${new Date().getTime()}`)
        .then(res => {
          setFacilities(res.data);
        })
        .catch(err => {
          console.error("Error fetching facilities:", err);
        });

      setSelectedQuantities({}); // Reset quantities on open
    }
  }, [open]);

  const handleQuantityChange = (id: number, delta: number, maxStock: number) => {
    setSelectedQuantities(prev => {
      const currentQty = prev[id] || 0;
      const newQty = currentQty + delta;
      
      // ✅ Limit check based on Admin Stock
      if (newQty < 0 || newQty > maxStock) return prev;
      
      const newMap = { ...prev };
      if (newQty === 0) delete newMap[id];
      else newMap[id] = newQty;
      return newMap;
    });
  };

  const handleSubmit = async () => {
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
      alert('Booking Successful! ✅');
      onSuccess(); // ✅ จะไปเรียก fetchData() ใน RoomList เพื่อรีเฟรชข้อมูลหน้าหลัก
      handleClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Unauthorized or Booking Failed');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 'bold', color: '#1976d2' }}>
        Book Room: {room?.name}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
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
            placeholder="เช่น ประชุมวางแผนงานโครงการ"
            value={purpose} 
            onChange={(e) => setPurpose(e.target.value)} 
          />
          
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1 }}>
            Select Equipment & Quantity
          </Typography>
          
          {facilities.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center">
              ไม่มีอุปกรณ์ที่สามารถยืมได้ในขณะนี้
            </Typography>
          ) : (
            facilities.map((fac) => {
              const qty = selectedQuantities[fac.id] || 0;
              return (
                <Box key={fac.id} sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  p: 1.5, 
                  border: '1px solid #e0e0e0', 
                  borderRadius: 2,
                  bgcolor: qty > 0 ? '#f0f7ff' : 'transparent',
                  borderColor: qty > 0 ? '#1976d2' : '#e0e0e0'
                }}>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">{fac.name}</Typography>
                    <Typography variant="caption" color={fac.total_stock > 0 ? "success.main" : "error.main"}>
                      คงเหลือในระบบ: {fac.total_stock} ชิ้น
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton 
                      size="small" 
                      onClick={() => handleQuantityChange(fac.id, -1, fac.total_stock)} 
                      disabled={qty === 0}
                    >
                      <Remove fontSize="small" />
                    </IconButton>
                    <Typography sx={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>
                      {qty}
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => handleQuantityChange(fac.id, 1, fac.total_stock)} 
                      disabled={qty >= fac.total_stock} 
                      color="primary"
                    >
                      <Add fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              );
            })
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={!startTime || !endTime || !purpose}
          sx={{ borderRadius: 2, px: 4 }}
        >
          Confirm Booking
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookingModal;