import { useState } from 'react';
import { 
  Box, Button, TextField, Typography, Paper, Alert, Avatar, 
  Fade, CssBaseline, CircularProgress, Link 
} from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Register = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('รหัสผ่านไม่ตรงกัน');
      return;
    }
    if (password.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    setLoading(true);
    try {
      // ส่ง role: 'user' ไปด้วยตามที่ Backend ต้องการ
      await api.post('/auth/register', { 
        username, 
        password, 
        role: 'user' 
      });
      
      alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
      navigate('/login');
    } catch (err: any) {
      console.error(err);
      // แสดง Error จาก Backend ถ้ามี (เช่น Username ซ้ำ)
      const msg = err.response?.data?.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      component="main"
      sx={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <CssBaseline />

      <Fade in={true} timeout={1000}>
        <Paper
          elevation={24}
          sx={{
            p: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 4,
            maxWidth: 450,
            width: '90%',
            backgroundColor: 'rgba(255, 255, 255, 0.85)', 
            backdropFilter: 'blur(10px)',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: '#2e7d32', width: 60, height: 60, boxShadow: 3 }}>
            <PersonAdd fontSize="large" />
          </Avatar>
          
          <Typography component="h1" variant="h4" fontWeight="bold" sx={{ mt: 2, color: '#1b5e20' }}>
            Register
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            สมัครสมาชิกเพื่อจองห้องประชุม
          </Typography>

          {error && (
            <Fade in={!!error}>
              <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: 2 }}>{error}</Alert>
            </Fade>
          )}

          <Box component="form" onSubmit={handleRegister} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="ชื่อผู้ใช้ (Username)"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              InputProps={{ sx: { bgcolor: 'white', borderRadius: 2 } }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="รหัสผ่าน (Password)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{ sx: { bgcolor: 'white', borderRadius: 2 } }}
            />
             <TextField
              margin="normal"
              required
              fullWidth
              label="ยืนยันรหัสผ่าน (Confirm Password)"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              InputProps={{ sx: { bgcolor: 'white', borderRadius: 2 } }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ 
                mt: 3, mb: 2, py: 1.5, fontSize: '1.1rem', borderRadius: 3,
                background: 'linear-gradient(45deg, #43a047 30%, #66bb6a 90%)',
                boxShadow: '0 3px 5px 2px rgba(67, 160, 71, .3)',
              }}
            >
              {loading ? <CircularProgress size={26} color="inherit" /> : 'สมัครสมาชิก'}
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Link 
                component="button" 
                variant="body2" 
                onClick={() => navigate('/login')}
                sx={{ textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer' }}
              >
                มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
              </Link>
            </Box>
          </Box>
        </Paper>
      </Fade>
    </Box>
  );
};

export default Register;