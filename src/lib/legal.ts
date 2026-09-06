/**
 * Merchant identity.
 *
 * These are PLACEHOLDERS and must be replaced with the real registered details
 * before launch. Razorpay will not activate a live account without a published
 * legal name, address, phone, email, terms, refund policy and privacy policy —
 * and a family being asked for Rs 499 by a website with no name behind it will
 * not pay either.
 *
 * Nothing here is invented to look real: every field is obviously a blank.
 */
export const MERCHANT = {
  legalName: "[REGISTERED BUSINESS NAME]",
  tradingName: "Chitrakathe",
  address: "[REGISTERED ADDRESS, CITY, KARNATAKA, PIN]",
  phone: "[+91 XXXXX XXXXX]",
  email: "[hello@example.com]",
  gstin: "[GSTIN, if registered]",
} as const;

export const isPlaceholder = (v: string) => v.startsWith("[");
