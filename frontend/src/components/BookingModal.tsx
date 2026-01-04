import { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, 
  Box, Typography, Stack, IconButton, Chip, Grid, Divider 
} from '@mui/material';
import { 
  Add, Remove, AccessTime, Inventory2, EventAvailable, Notes, CalendarMonth 
} from '@mui/icons-material';
import Swal from 'sweetalert2';
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
  const [durationStr, setDurationStr] = useState('');

  // Limit characters
  const MAX_PURPOSE_LENGTH = 200;

  useEffect(() => { 
    if (open) { 
      api.get(`/facilities?t=${new Date().getTime()}`)
         .then(res => setFacilities(res.data))
         .catch(console.error); 
      setStartTime(''); 
      setEndTime(''); 
      setPurpose(''); 
      setSelectedQuantities({}); 
      setDurationStr(''); 
    } 
  }, [open]);

  useEffect(() => {
    if (startTime && endTime) {
      const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime();
      if (diffMs > 0) { 
        const h = Math.floor(diffMs/3600000); 
        const m = Math.round((diffMs%3600000)/60000); 
        // Translated duration strings
        setDurationStr(`${h>0?`${h} hr `:''}${m>0?`${m} min`:''}`); 
      } else {
        setDurationStr('❌ Invalid Time');
      }
    } else {
      setDurationStr('');
    }
  }, [startTime, endTime]);

  const handleQuantityChange = (id: number, delta: number, max: number) => {
    setSelectedQuantities(prev => { 
      const newQty = (prev[id] || 0) + delta; 
      if (newQty < 0 || newQty > max) return prev; 
      const newMap = { ...prev }; 
      newQty === 0 ? delete newMap[id] : newMap[id] = newQty; 
      return newMap; 
    });
  };

  const submitBooking = async () => {
    try {
      await api.post('/bookings', { 
        roomId: room?.id, 
        startTime, 
        endTime, 
        purpose, 
        facilities: Object.entries(selectedQuantities).map(([id, qty]) => ({ facility_id: Number(id), quantity: qty })) 
      });
      // Translated SweetAlert success
      Swal.fire({ title: 'Success! 🎉', text: 'Booking request sent.', icon: 'success', timer: 2000, showConfirmButton: false });
      onSuccess(); 
      handleClose();
    } catch (e: any) { 
      // Translated SweetAlert error
      Swal.fire('Booking Failed', e.response?.data?.message || 'Error', 'error'); 
    }
  };

  const handleConfirm = () => {
    // Translated validation warning
    if (!startTime || !endTime || !purpose) return Swal.fire('Incomplete Data', 'Please specify time and purpose.', 'warning');
    
    const items = Object.entries(selectedQuantities)
      .map(([id, qty]) => `<li>${facilities.find(f=>f.id===Number(id))?.name}: <b>${qty}</b></li>`)
      .join('');
    
    // Translated confirmation dialog
    Swal.fire({
      title: 'Confirm Booking?', 
      html: `<div style="text-align:left; font-size:0.9rem">
              <p><b>Room:</b> ${room?.name}</p>
              <p><b>Time:</b> ${new Date(startTime).toLocaleString()} - ${new Date(endTime).toLocaleTimeString()}</p>
              <p><b>Purpose:</b> ${purpose}</p>
              ${items ? `<hr/><p><b>Facilities:</b></p><ul>${items}</ul>` : ''}
             </div>`, 
      icon: 'question', 
      showCancelButton: true, 
      confirmButtonText: 'Confirm', 
      confirmButtonColor: '#1e3a8a'
    }).then((r) => {
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
          <EventAvailable fontSize="large"/> 
          <Box>
            {/* Translated Header */}
            <Typography variant="h5" fontWeight="bold">Book Room: {room?.name}</Typography>
            <Typography variant="body2" sx={{opacity:0.8}}>Fill in the details below</Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 4 }}>
          <Stack spacing={4}>
            {/* Time Selection */}
            <Box>
              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{display:'flex', gap:1}}>
                <CalendarMonth color="primary"/> Date & Time
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField type="datetime-local" label="Start Time" fullWidth InputLabelProps={{shrink:true}} value={startTime} onChange={e=>setStartTime(e.target.value)}/>
                </Grid>
                <Grid item xs={6}>
                  <TextField type="datetime-local" label="End Time" fullWidth InputLabelProps={{shrink:true}} value={endTime} onChange={e=>setEndTime(e.target.value)}/>
                </Grid>
              </Grid>
              {durationStr && <Chip icon={<AccessTime/>} label={durationStr} color={durationStr.includes('❌')?'error':'primary'} sx={{mt:2}}/>}
            </Box>
            
            <Divider/>
            
            {/* Purpose */}
            <Box>
              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{display:'flex', gap:1}}>
                <Notes color="primary"/> Purpose
              </Typography>
              <TextField 
                fullWidth 
                multiline 
                rows={2} 
                placeholder="Enter booking purpose..." 
                value={purpose} 
                onChange={e => setPurpose(e.target.value)}
                inputProps={{ maxLength: MAX_PURPOSE_LENGTH }} 
                helperText={`${purpose.length}/${MAX_PURPOSE_LENGTH} characters`} 
                error={purpose.length >= MAX_PURPOSE_LENGTH} 
              />
            </Box>
            
            <Divider/>
            
            {/* Facilities */}
            <Box>
              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{display:'flex', gap:1}}>
                <Inventory2 color="primary"/> Add-on Facilities
              </Typography>
              <Box sx={{bgcolor:'#f8fafc', p:2, borderRadius:2, border:'1px solid #eee', maxHeight:200, overflowY:'auto'}}>
                {facilities.length===0 ? (
                  <Typography align="center" color="text.secondary">- No facilities available -</Typography>
                ) : (
                  <Grid container spacing={2}>
                    {facilities.map(f => {
                      const qty = selectedQuantities[f.id] || 0; 
                      return (
                        <Grid item xs={6} key={f.id}>
                          <Box sx={{display:'flex', justifyContent:'space-between', p:1.5, border:'1px solid', borderColor:qty>0?'primary.main':'#eee', borderRadius:2, bgcolor:qty>0?'#eff6ff':'white'}}>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">{f.name}</Typography>
                              <Typography variant="caption">Stock: {f.total_stock}</Typography>
                            </Box>
                            <Box sx={{display:'flex', alignItems:'center', gap:1}}>
                              <IconButton size="small" onClick={()=>handleQuantityChange(f.id,-1,f.total_stock)} disabled={qty===0}><Remove fontSize="small"/></IconButton>
                              <Typography fontWeight="bold">{qty}</Typography>
                              <IconButton size="small" color="primary" onClick={()=>handleQuantityChange(f.id,1,f.total_stock)} disabled={qty>=f.total_stock}><Add fontSize="small"/></IconButton>
                            </Box>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                )}
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, bgcolor: '#f8fafc', justifyContent: 'space-between' }}>
          <Button onClick={handleClose} color="inherit">Cancel</Button>
          <Button 
            onClick={handleConfirm} 
            variant="contained" 
            size="large" 
            sx={{px:4, background:'linear-gradient(90deg, #2563eb, #1e40af)'}} 
            disabled={!startTime||!endTime||!purpose}
          >
            Confirm Booking
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BookingModal;