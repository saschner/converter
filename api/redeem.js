// /api/redeem.js  (CommonJS)
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

// Map LIVE price IDs to credits
const creditsPerPrice = {
  "price_1Rwo5UKanaZ2EWbo11BUK4Ie": 10,   // 10 pack $0.99
  "price_1Rwo73KanaZ2EWboVYcW4YyG": 25,   // 25 pack $1.99
  "price_1Rwo0KKanaZ2EWboEpVl9z0O": 50,   // 50 pack $2.99
  "price_1Rwq9PKanaZ2EWboexbHdH44": 100,  // 100 pack $4.99
};

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: "Missing session_id" });

    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["line_items"],
    });

    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    // Prefer metadata; fall back to line_items
    let priceId = session?.metadata?.price_id;
    if (!priceId && session.line_items?.data?.length) {
      priceId = session.line_items.data[0]?.price?.id;
    }

    const credits = creditsPerPrice[priceId] || 0;
    if (!credits) return res.status(400).json({ error: "Unknown price → credits mapping" });

    return res.status(200).json({ credits });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
};
