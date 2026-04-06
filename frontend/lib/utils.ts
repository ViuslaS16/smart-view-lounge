import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from "date-fns";

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, "h:mm a")}`;
  return format(d, "EEE, MMM d · h:mm a");
}

export function formatDateShort(dateStr: string): string {
  return format(new Date(dateStr), "MMM d, yyyy");
}

export function formatTime(dateStr: string): string {
  return format(new Date(dateStr), "h:mm a");
}

export function formatRelative(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function isSessionActive(startTime: string, endTime: string): boolean {
  const now = new Date();
  return new Date(startTime) <= now && new Date(endTime) >= now;
}

export function isUpcoming(startTime: string): boolean {
  return new Date(startTime) > new Date();
}

export function isPastSession(endTime: string): boolean {
  return isPast(new Date(endTime));
}

export function getTimeRemaining(endTime: string): {
  total: number;
  hours: number;
  minutes: number;
  seconds: number;
  percentage: number;
  startTime?: string;
} {
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);

  return {
    total: diff,
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    percentage: 0,
  };
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function generateBookingRef(): string {
  return `BKG-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
}

export function maskMobile(mobile: string): string {
  return mobile.replace(/(\+\d{2}\s\d{2})\s\d{3}\s(\d{4})/, "$1 *** $2");
}

export function formatLKR(amount: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function generateTimeSlots(
  date: Date,
  bookedBlocks: { start_time: string; end_time: string }[],
  bufferMinutes: number = 15
) {
  const slots: { time: string; available: boolean; dateObj: Date }[] = [];
  // For example, 10:00 to 22:00
  const startHour = 10;
  const endHour = 22;

  let current = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, 0);
  const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHour, 0);

  const now = new Date();

  while (current < endOfDay) {
    const slotEnd = new Date(current.getTime() + 60 * 60000); // Assume 1-hour slots for the grid minimum?
    // Wait, the grid originally just showed 30-min or 1-hour increments? Let's just do 1-hour slots as a baseline, or 30-min.
    // The previous implementation used some generation logic. Let's do 30-minute intervals.
    
    // Actually, bookings are min 60 mins (in 30 min increments). The slot is just a start time.
    
    const isPast = current <= now;
    
    let isBooked = false;
    for (const block of bookedBlocks) {
      const bStart = new Date(block.start_time).getTime();
      const bEnd = new Date(block.end_time).getTime() + bufferMinutes * 60000;
      
      // If this slot start time falls within a booked block (including buffer)
      // Or if the next 60 mins of this slot would overlap with a booked block
      const sStart = current.getTime();
      const sEnd = current.getTime() + 60 * 60000; // Require at least 60 mins free!
      
      if ((sStart < bEnd && sEnd > bStart)) {
        isBooked = true;
        break;
      }
    }

    slots.push({
      time: format(current, "HH:mm"),
      available: !isPast && !isBooked,
      dateObj: current,
    });

    // Advance by 30 minutes
    current = new Date(current.getTime() + 30 * 60000);
  }

  return slots;
}
