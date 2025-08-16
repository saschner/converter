// /api/create-checkout-session.js (Vercel serverless function)
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// Live Price IDs you gave me:
const priceLookup = {
  pack_10:  "price_1Rwo5UKanaZ2EWbo11BUK4Ie", // $0.99 → 10 credits
  pack_25:  "price_1Rwo73KanaZ2EWboVYcW4YyG", // $1.99 → 25 credits
  pack_50:  "price_1Rwo0KKanaZ2EWboEpVl9z0O", // $2.99 → 50 credits
  pack_100: "price_1Rwq9PKanaZ2EWboexbHdH44", // $4.99 → 100 credits
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }
  try {
    const { packId, origin } = req.body;
    const priceId = priceLookup[packId];
    if (!priceId) return res.status(400).json({ error: "Unknown packId" });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { price_id: priceId }, // handy for redeem step
      success_url: `${origin}/?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=1`,
    });

    return res.status(200).json({ id: session.id });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
