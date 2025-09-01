// /api/create-checkout-session.js (Vercel serverless function)
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});
// === YOUR pack maps (use as-is) ===
const priceMap = {
  pack_10:  "price_1Rwo5UKanaZ2EWbo11BUK4Ie", // $0.99 → 10 credits
  pack_25:  "price_1Rwo73KanaZ2EWboVYcW4YyG", // $1.99 → 25 credits
  pack_50:  "price_1Rwo0KKanaZ2EWboEpVl9z0O", // $2.99 → 50 credits
  pack_100: "price_1Rwq9PKanaZ2EWboexbHdH44", // $4.99 → 100 credits
};
const creditsMap = { pack_10: 10, pack_25: 25, pack_50: 50, pack_100: 100 };

// Accept either { pack_key: "pack_50" } or legacy { pack: 50 }
const body = req.body || {};
const resolvedKey =
  body.pack_key ||
  (typeof body.pack === 'number' ? `pack_${body.pack}` : undefined) ||
  'pack_50';

const price = priceMap[resolvedKey];
const credits = creditsMap[resolvedKey];
if (!price || !credits) {
  return res.status(400).json({ error: 'Invalid pack' });
}
