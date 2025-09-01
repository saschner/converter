// /api/create-checkout-session.js (Vercel serverless function)
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});
// === YOUR pack maps (use as-is) ===
const priceMap = {
  pack_10:  "price_1Rwo5UKanaZ2EWbo11BUK4Ie", // $0.99 → 10 credits
  pack_25:  "price_1Rwo73Kana// /api/create-checkout-session.js (Vercel/Next.js serverless function)
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// Your LIVE price IDs (as given)
const priceMap = {
  pack_10:  "price_1Rwo5UKanaZ2EWbo11BUK4Ie", // $0.99 → 10 credits
  pack_25:  "price_1Rwo73KanaZ2EWboVYcW4YyG", // $1.99 → 25 credits
  pack_50:  "price_1Rwo0KKanaZ2EWboEpVl9z0O", // $2.99 → 50 credits
  pack_100: "price_1Rwq9PKanaZ2EWboexbHdH44", // $4.99 → 100 credits
};
const creditsMap = { pack_10: 10, pack_25: 25, pack_50: 50, pack_100: 100 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Accept either { pack_key: "pack_50" } or legacy { pack: 50 }
    const body = req.body || {};
    const resolvedKey =
      body.pack_key ||
      (typeof body.pack === "number" ? `pack_${body.pack}` : undefined) ||
      "pack_50";

    const price = priceMap[resolvedKey];
    const credits = creditsMap[resolvedKey];
    if (!price || !credits) {
      return res.status(400).json({ error: "Invalid pack" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: { pack_key: resolvedKey, credits: String(credits) },
      success_url: `${process.env.PUBLIC_SITE_URL}/?paid_credits=${credits}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.PUBLIC_SITE_URL}/?cancelled=1`,
    });

    return res.status(200).json({ url: session.url }); // Always JSON
  } catch (e) {
    console.error("Stripe session error:", e);
    return res.status(500).json({ error: e.message || "Stripe session error" });
  }
}Z2EWboVYcW4YyG", // $1.99 → 25 credits
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
