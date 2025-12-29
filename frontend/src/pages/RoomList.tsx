import { useEffect, useState } from 'react';
import {
  Container,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  CircularProgress
} from '@mui/material';
import Grid from '@mui/material/Grid'; 
import {
  MeetingRoom as RoomIcon,
  Person as PersonIcon,
  Wifi,
  Tv,
  Videocam,
  AcUnit
} from '@mui/icons-material';
import api from '../api/axios';
import type { MeetingRoom } from '../types'; 
import BookingModal from '../components/BookingModal';

// Helper function เลือก Icon
const getFacilityIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('wifi')) return <Wifi fontSize="small" />;
  if (lowerName.includes('projector') || lowerName.includes('tv')) return <Tv fontSize="small" />;
  if (lowerName.includes('camera') || lowerName.includes('conf')) return <Videocam fontSize="small" />;
  if (lowerName.includes('air') || lowerName.includes('con')) return <AcUnit fontSize="small" />;
  return <RoomIcon fontSize="small" />;
};

const RoomList = () => {
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State สำหรับ Modal
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms?active=true');
      setRooms(res.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleOpenBooking = (room: MeetingRoom) => {
    setSelectedRoom(room);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
        Available Meeting Rooms
      </Typography>

      <Grid container spacing={4}>
        {rooms.map((room) => (
          // ✅ แก้ไขตรงนี้: ใช้ Grid2 ต้องใช้ prop 'size' แทน xs/sm/md และไม่ต้องมีคำว่า item
          <Grid key={room.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card 
              elevation={3} 
              sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2 }}
            >
              <Box sx={{ height: 140, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RoomIcon sx={{ fontSize: 60, color: 'white' }} />
              </Box>

              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h5" component="h2">
                  {room.name}
                </Typography>
                
                <Box display="flex" alignItems="center" gap={1} mb={1} color="text.secondary">
                  <PersonIcon fontSize="small" />
                  <Typography variant="body2">Capacity: {room.capacity} ppl</Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  Location: {room.location}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 2 }}>
                  {room.room_facilities?.map((rf) => (
                    <Chip 
                      key={rf.id} 
                      icon={getFacilityIcon(rf.facility.name)} 
                      label={rf.facility.name} 
                      size="small" 
                      variant="outlined" 
                    />
                  ))}
                </Box>
              </CardContent>

              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button 
                  fullWidth 
                  variant="contained" 
                  onClick={() => handleOpenBooking(room)}
                >
                  Book Now
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <BookingModal 
        open={isModalOpen} 
        handleClose={() => setIsModalOpen(false)} 
        room={selectedRoom}
        onSuccess={fetchRooms}
      />
    </Container>
  );
};

export default RoomList;