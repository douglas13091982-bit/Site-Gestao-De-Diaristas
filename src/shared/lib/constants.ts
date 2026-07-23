// Nomes semânticos para strings mágicas espalhadas pelo app.

export const USER_ROLES = {
  admin: "admin",
  professional: "professional",
  client: "client",
} as const;
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const BOOKING_STATUS = {
  pending: "pending",
  confirmed: "confirmed",
  inProgress: "in_progress",
  completed: "completed",
  cancelled: "cancelled",
} as const;
export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const OFFER_STATUS = {
  pending: "pending",
  accepted: "accepted",
  rejected: "rejected",
  expired: "expired",
} as const;
export type OfferStatus = (typeof OFFER_STATUS)[keyof typeof OFFER_STATUS];

export const PAYMENT_PROVIDERS = {
  mercadoPago: "mercadopago",
  pagSeguro: "pagseguro",
} as const;
export type PaymentProvider =
  (typeof PAYMENT_PROVIDERS)[keyof typeof PAYMENT_PROVIDERS];

export const STORAGE_BUCKETS = {
  professionalPhotos: "professional-photos",
  siteAssets: "site-assets",
} as const;

/** Rótulos legíveis para status de agendamento (UI). */
export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Aguardando",
  confirmed: "Confirmado",
  in_progress: "Em andamento",
  completed: "Concluído",
  cancelled: "Cancelado",
};