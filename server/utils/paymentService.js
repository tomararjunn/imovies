// Payment gateway service. Controllers only talk to this file,
// so Razorpay can be swapped for Stripe/PayPal later by changing only this file.
//
// MOCK MODE: if RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are empty, a fake gateway is used
// so you can test the full booking flow without a payment account.
const crypto = require("crypto");

const hasKeys = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const isMock = () => !hasKeys();

const getClient = () => {
  const Razorpay = require("razorpay"); // loaded only when real keys exist
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// amountRupees -> gateway order
const createOrder = async (amountRupees, receipt) => {
  const amount = Math.round(amountRupees * 100); // paise

  if (isMock()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Payment gateway is not configured");
    }
    return { id: `mock_order_${crypto.randomUUID()}`, amount, currency: "INR", mock: true };
  }

  const order = await getClient().orders.create({ amount, currency: "INR", receipt });
  return { id: order.id, amount: order.amount, currency: order.currency, mock: false };
};

// Checks that the payment really happened
const verifyPayment = ({ orderId, paymentId, signature }) => {
  if (!orderId || !paymentId) return false;

  if (isMock()) {
    return process.env.NODE_ENV !== "production" && String(paymentId).startsWith("mock_pay_");
  }

  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Best-effort refund. Never throws.
const refund = async (paymentId, amountRupees) => {
  if (!paymentId) return { status: "none" };
  if (isMock()) return { status: "refunded (mock)" };

  try {
    await getClient().payments.refund(paymentId, { amount: Math.round(amountRupees * 100) });
    return { status: "refunded" };
  } catch (err) {
    console.error("Refund failed:", err.message || err);
    return { status: "refund failed - handle manually" };
  }
};

module.exports = { createOrder, verifyPayment, refund, isMock };