/**
 * All money is integer paise. Never floats, never rupees in the database.
 */
export type Paise = number;

export const rupees = (p: Paise): string =>
  `₹${(p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const usdToPaise = (usd: number, usdInr: number): Paise =>
  Math.ceil(usd * usdInr * 100);

/** Razorpay standard: 2% MDR + 18% GST on the MDR. */
export const gatewayFeePaise = (amount: Paise): Paise => Math.ceil(amount * 0.02 * 1.18);

export const marginPct = (revenue: Paise, cost: Paise): number =>
  revenue === 0 ? 0 : ((revenue - cost) / revenue) * 100;
