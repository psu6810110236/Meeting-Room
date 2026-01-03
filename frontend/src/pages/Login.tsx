import { useState } from 'react';
import { 
  Box, Button, TextField, Typography, Paper, Alert, Avatar, 
   Link, Fade, CssBaseline, CircularProgress 
} from '@mui/material';
import { MeetingRoom } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', response.data.accessToken);
      
      // Add a small delay for better UX
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      setError('Invalid username or password');
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
        // Background Image
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url(https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <CssBaseline />

      {/* Login Card */}
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
            // Glassmorphism Effect
            backgroundColor: 'rgba(255, 255, 255, 0.85)', 
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: '#1976d2', width: 60, height: 60, boxShadow: 3 }}>
            <MeetingRoom fontSize="large" />
          </Avatar>
          
          <Typography component="h1" variant="h4" fontWeight="bold" sx={{ mt: 2, color: '#1565c0' }}>
            Meeting Room
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Online Meeting Room Booking System
          </Typography>

          {error && (
            <Fade in={!!error}>
              <Alert severity="error" sx={{ width: '100%', mb: 2, borderRadius: 2 }}>{error}</Alert>
            </Fade>
          )}

          <Box component="form" onSubmit={handleLogin} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              InputProps={{ sx: { bgcolor: 'white', borderRadius: 2 } }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
              }}
            >
              {loading ? <CircularProgress size={26} color="inherit" /> : 'Login'}
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Link 
                component="button" 
                variant="body2" 
                type="button"
                onClick={() => navigate('/register')}
                sx={{ textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Don't have an account? Sign Up
              </Link>
            </Box>
          </Box>
        </Paper>
      </Fade>
      
      {/* Footer */}
      <Box sx={{ position: 'absolute', bottom: 20, color: 'rgba(255,255,255,0.7)' }}>
        <Typography variant="caption">© 2025 4B Company. All rights reserved.</Typography>
      </Box>

    </Box>
  );
};

export default Login;