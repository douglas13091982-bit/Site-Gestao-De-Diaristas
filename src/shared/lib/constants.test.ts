import { describe, it, expect } from "vitest";
import {
  USER_ROLES,
  BOOKING_STATUS,
  BOOKING_STATUS_LABEL,
  OFFER_STATUS,
  PAYMENT_PROVIDERS,
  STORAGE_BUCKETS,
} from "./constants";

describe("constants", () => {
  it("USER_ROLES tem admin/professional/client", () => {
    expect(USER_ROLES).toEqual({ admin: "admin", professional: "professional", client: "client" });
  });
  it("BOOKING_STATUS_LABEL cobre todos os status", () => {
    for (const key of Object.values(BOOKING_STATUS)) {
      expect(BOOKING_STATUS_LABEL[key]).toBeTruthy();
    }
  });
  it("OFFER_STATUS/PAYMENT_PROVIDERS/STORAGE_BUCKETS têm chaves esperadas", () => {
    expect(OFFER_STATUS.pending).toBe("pending");
    expect(PAYMENT_PROVIDERS.mercadoPago).toBe("mercadopago");
    expect(STORAGE_BUCKETS.professionalPhotos).toBe("professional-photos");
  });
});