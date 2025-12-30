export interface User {
  id: number;
  username: string;
  role: string;
}

export interface Facility {
  id: number;
  name: string;
  total_stock: number;
}

export interface MeetingRoom {
  id: number;
  name: string;
  capacity: number;
  location: string;
  is_active: boolean;
}

// ✅ Interface สำหรับรายการอุปกรณ์ยืม
export interface BookingFacility {
  id: number;
  quantity: number;
  facility: Facility;
}

export interface Booking {
  id: number;
  start_time: string;
  end_time: string;
  purpose: string;
  // ✅ แก้ไข: เพิ่ม 'completed' เข้าไปเพื่อให้ระบบรู้จักสถานะที่แอดมินยืนยันคืนของแล้ว
  status: 'pending' | 'confirmed' | 'cancelled' | 'approved' | 'rejected' | 'completed'; 
  room?: MeetingRoom;
  user?: User;
  // ✅ ใช้ booking_facilities เพื่อรองรับข้อมูลจำนวนอุปกรณ์จาก Backend
  booking_facilities?: BookingFacility[]; 
}