export const BOOKING_SHIFT_STARTS = ["08:00", "13:00"] as const;
export const BOOKING_SHIFT_HOURS = 4;

export const BOOKING_SHIFTS = [
  { start: BOOKING_SHIFT_STARTS[0], end: "12:00", name: "Manhã", label: "Manhã · 08h às 12h" },
  { start: BOOKING_SHIFT_STARTS[1], end: "17:00", name: "Tarde", label: "Tarde · 13h às 17h" },
] as const;
