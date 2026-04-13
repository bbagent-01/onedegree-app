export type AvailabilityStatus = "available" | "possibly_available" | "blocked";

export interface AvailabilityRange {
  id: string;
  listing_id: string;
  start_date: string;
  end_date: string;
  status: AvailabilityStatus;
  custom_price_per_night: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookedStay {
  id: string;
  check_in: string;
  check_out: string;
  guest_name?: string;
  guest_avatar_url?: string | null;
}

export interface CalendarSettings {
  min_nights: number;
  max_nights: number;
  prep_days: number;
  advance_notice_days: number;
  availability_window_months: number;
  checkin_time: string;
  checkout_time: string;
  blocked_checkin_days: string[];
  blocked_checkout_days: string[];
}

export type DayStatus =
  | "available"
  | "possibly_available"
  | "blocked"
  | "booked"
  | "prep"
  | "empty";

export interface DayInfo {
  date: string;
  status: DayStatus;
  price: number | null;
  isToday: boolean;
  isPast: boolean;
  rangeId: string | null;
}
