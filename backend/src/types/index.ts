// ─── Shared TypeScript Types ───────────────────────────────────────────────────

export type UserStatus = 'pending_verification' | 'active' | 'suspended';
export type UserRole = 'customer' | 'admin';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentType = 'booking' | 'extension';
export type PaymentStatus = 'success' | 'failed' | 'refunded';

export interface User {
  id: string;
  full_name: string;
  email: string;
  mobile: string;
  password_hash: string;
  nic_number: string | null;
  nic_image_key: string | null;
  status: UserStatus;
  role: UserRole;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: BookingStatus;
  total_amount: string;
  payhere_order_id: string | null;
  sms_15min_sent: boolean;
  sms_end_sent: boolean;
  sms_admin_off_sent: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  payhere_payment_id: string | null;
  payhere_order_id: string | null;
  amount: string;
  type: PaymentType;
  status: PaymentStatus;
  raw_webhook: Record<string, unknown> | null;
  paid_at: string;
}

export interface SmsLog {
  id: string;
  booking_id: string | null;
  recipient: string;
  message: string;
  type: string;
  status: string;
  sent_at: string;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

// ─── Express augmentation — attach user to req ─────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, 'id' | 'role' | 'status'>;
    }
  }
}
