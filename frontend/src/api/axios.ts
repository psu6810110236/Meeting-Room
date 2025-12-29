import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// 1. สร้าง Instance (ตรวจสอบ URL ให้ตรงกับ Backend port 3000)
const api = axios.create({
  baseURL: 'http://localhost:3000', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Interceptor: แนบ Token ก่อนส่ง Request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 3. Interceptor: ดักจับ Error ตอนรับ Response
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response && error.response.status === 401) {
      // ถ้า Token หมดอายุ ให้ลบและเด้งไปหน้า Login
      localStorage.removeItem('token');
      // window.location.href = '/login'; // เปิดใช้งานบรรทัดนี้เมื่อทำหน้า Login เสร็จ
    }
    return Promise.reject(error);
  }
);

export default api;