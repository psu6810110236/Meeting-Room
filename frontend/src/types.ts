// 1. เปลี่ยน Enum เป็น Const Object (เพื่อให้ผ่านกฎ erasableSyntaxOnly)
export const UserRole = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

// สร้าง Type จาก Object ด้านบนเพื่อให้เอาไปใช้ประกาศตัวแปรได้
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const BookingStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];


// 2. Interfaces (ส่วนนี้เหมือนเดิม)
export interface User {
  id: number;
  username: string;
  role: UserRole; // ใช้ Type ที่เราสร้างด้านบน
  created_at?: string;
}

export interface Facility {
  id: number;
  name: string;
  icon?: string;
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
  room_facilities?: RoomFacility[];
}

export interface Booking {
  id: number;
  start_time: string;
  end_time: string;
  purpose: string;
  status: BookingStatus; // ใช้ Type ที่เราสร้างด้านบน
  user?: User;
  room?: MeetingRoom;
  created_at: string;
}

export interface AuthResponse {
  accessToken: string;
}