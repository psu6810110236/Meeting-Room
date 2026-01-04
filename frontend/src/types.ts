export interface User {
  id: number;
  username: string;
  role: string;
  first_name?: string; // ✅ เพิ่มเผื่อไว้
  last_name?: string;  // ✅ เพิ่มเผื่อไว้
  profile_picture?: string; // ✅ เพิ่มเผื่อไว้
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
  image_url?: string;
}

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
  status: 'pending' | 'confirmed' | 'cancelled' | 'approved' | 'rejected' | 'completed'; 
  room?: MeetingRoom;
  user?: User;
  booking_facilities?: BookingFacility[];
  created_at: string; // ✅ เพิ่มบรรทัดนี้ เพื่อแก้ Error ใน AdminDashboard
}