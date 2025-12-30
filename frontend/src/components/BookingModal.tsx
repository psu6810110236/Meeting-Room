import { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Box, Typography, Stack, IconButton 
} from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
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

  useEffect(() => {
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
      </Dialog>
    </>
  );
};

export default BookingModal;