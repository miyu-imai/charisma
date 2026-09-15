export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

  const email = (body && body.email ? String(body.email) : "").trim();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  if (!ok) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }

  const record = {
    email: email,
    joinedAt: new Date().toISOString(),
    source: "charisma-landing"
  };

  // Every signup is written to the deployment's runtime log with a stable
  // prefix so it can be pulled out later.
  console.log("CHARISMA_WAITLIST " + JSON.stringify(record));

  // If a forwarding endpoint is configured (Formspree, Tally, a webhook),
  // the signup is sent there too, so it lands somewhere durable.
  const forward = process.env.WAITLIST_ENDPOINT;
  if (forward) {
    try {
      await fetch(forward, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(record)
      });
    } catch (e) {
      console.log("CHARISMA_WAITLIST_FORWARD_FAILED " + String(e));
    }
  }

  res.status(200).json({ ok: true });
}
