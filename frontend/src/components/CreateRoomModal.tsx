import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, 
  Box, Checkbox, FormControlLabel, FormGroup, Typography
} from '@mui/material';
import { AddBusiness } from '@mui/icons-material';
import api from '../api/axios';

interface CreateRoomModalProps {
  open: boolean;
  handleClose: () => void;
  onSuccess: () => void;
}

const CreateRoomModal = ({ open, handleClose, onSuccess }: CreateRoomModalProps) => {
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [location, setLocation] = useState('');
  // สมมติ Facilities ID: 1=WiFi, 2=Projector, 3=Whiteboard, 4=TV (ต้องตรงกับ Database)
  const [facilities, setFacilities] = useState<number[]>([]); 
  const [loading, setLoading] = useState(false);

  const handleFacilityChange = (id: number) => {
    setFacilities(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // ส่งข้อมูลไป Backend
      await api.post('/rooms', {
        name,
        capacity: Number(capacity),
        location,
        is_active: true,
        // Backend ต้องรองรับการรับ facilityIds (ถ้ายังไม่ทำ ให้ข้ามส่วนนี้ไปก่อน)
        facilityIds: facilities 
      });

      alert('✅ สร้างห้องใหม่สำเร็จ!');
      onSuccess();
      handleClose();
      // Reset Form
      setName(''); setCapacity(''); setLocation(''); setFacilities([]);
    } catch (error) {
      console.error(error);
      alert('❌ สร้างห้องไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#2e7d32', color: 'white' }}>
        <AddBusiness /> เพิ่มห้องประชุมใหม่
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="ชื่อห้อง" fullWidth value={name} onChange={(e) => setName(e.target.value)} />
          <TextField label="สถานที่ (Location)" fullWidth value={location} onChange={(e) => setLocation(e.target.value)} />
          <TextField label="ความจุ (คน)" type="number" fullWidth value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          
          <Typography variant="subtitle1" fontWeight="bold">สิ่งอำนวยความสะดวก:</Typography>
          <FormGroup row>
            <FormControlLabel control={<Checkbox checked={facilities.includes(1)} onChange={() => handleFacilityChange(1)} />} label="WiFi" />
            <FormControlLabel control={<Checkbox checked={facilities.includes(2)} onChange={() => handleFacilityChange(2)} />} label="Projector" />
            <FormControlLabel control={<Checkbox checked={facilities.includes(3)} onChange={() => handleFacilityChange(3)} />} label="Whiteboard" />
            <FormControlLabel control={<Checkbox checked={facilities.includes(4)} onChange={() => handleFacilityChange(4)} />} label="TV" />
          </FormGroup>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>ยกเลิก</Button>
        <Button onClick={handleSubmit} variant="contained" color="success" disabled={loading}>
          {loading ? 'กำลังสร้าง...' : 'สร้างห้อง'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateRoomModal;