export type OrderStatus =
  | 'pending'
  | 'assigned'
  | 'en_route_pickup'
  | 'picked_up'
  | 'en_route_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface Order {
  id: number;
  status: OrderStatus;
  assignment_type: 'manual' | 'automatic';
  clinic: {
    id: number;
    business_name: string;
  };
  courier?: {
    id: number;
    name: string;
    photo_url?: string | null;
  };
  pickup: {
    address: string;
    lat: string;
    lng: string;
    contact_name: string | null;
    contact_phone: string | null;
  };
  delivery: {
    address: string;
    lat: string;
    lng: string;
    contact_name: string | null;
    contact_phone: string | null;
  };
  price: string;
  payment_status: 'pending' | 'paid' | 'failed';
  distance_km?: string;
  is_urgent?: boolean;
  urgent_surcharge?: string;
  urgent_deadline_at?: string | null;
  quoted_price?: string;
  amount_paid?: string;
  amount_due?: number;
  refunded_amount?: string;
  cancellation_fee?: string;
  return_surcharge?: string;
  return_reason?: string | null;
  can_cancel?: boolean;
  cancel_fee_preview?: number | null;
  notes: string | null;
  evidences?: Array<{
    type: 'pickup' | 'delivery' | 'return';
    photo_url: string;
    taken_at: string;
  }>;
  events?: Array<{
    event_type: string;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'suspended';
  must_change_password: boolean;
  default_address?: string | null;
  default_lat?: string | null;
  default_lng?: string | null;
}

export interface LoginResponse {
  user: User;
  role: string;
  must_change_password: boolean;
  token: string;
}
