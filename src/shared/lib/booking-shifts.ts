export const BOOKING_SHIFT_STARTS = ["08:00", "13:00"] as const;
export const BOOKING_SHIFT_HOURS = 4;

export const BOOKING_SHIFTS = [
  { start: BOOKING_SHIFT_STARTS[0], end: "12:00", name: "Manhã", label: "Manhã · 08h às 12h" },
  { start: BOOKING_SHIFT_STARTS[1], end: "17:00", name: "Tarde", label: "Tarde · 13h às 17h" },
] as const;

export const BOOKING_MAX_HOURS = 8;

export function bookingEndMinute(start: string, duration: number): number | null {
  if (!Number.isFinite(duration) || duration <= 0 || duration > BOOKING_MAX_HOURS) return null;
  if (start === BOOKING_SHIFT_STARTS[0]) {
    return 8 * 60 + duration * 60 + (duration > BOOKING_SHIFT_HOURS ? 60 : 0);
  }
  if (start === BOOKING_SHIFT_STARTS[1] && duration <= BOOKING_SHIFT_HOURS) {
    return 13 * 60 + duration * 60;
  }
  return null;
}

export function bookingShiftLabel(start: string, duration: number): string {
  if (duration <= BOOKING_SHIFT_HOURS) {
    return BOOKING_SHIFTS.find((shift) => shift.start === start)?.label ?? start;
  }
  const end = bookingEndMinute(start, duration);
  if (end === null) return start;
  const hour = Math.floor(end / 60);
  const minutes = end % 60;
  return `08h às ${hour}h${minutes ? String(minutes).padStart(2, "0") : ""} · pausa às 12h`;
}
