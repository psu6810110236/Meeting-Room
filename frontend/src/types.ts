// src/types.ts

export interface User {
  id: number;
  username: string;
  role: string;
}

export interface Facility {
  id: number;
  name: string;
}

export interface RoomFacility {
  id: number;
  facility: Facility;
  quantity: number;
}

export interface MeetingRoom {
  id: number;
  name: string;
  capacity: number;
  location: string;
  is_active: boolean;
  image_url?: string;
  room_facilities?: RoomFacility[];
}

// ✅ อัปเดตส่วนนี้
export interface Booking {
  id: number;
  start_time: string;
  end_time: string;
  purpose: string;
  status: 'pending' | 'confirmed' | 'cancelled'; // เพิ่ม Status ให้ชัดเจน
  room?: MeetingRoom; // เพิ่มความสัมพันธ์กับห้อง
}