// Proxy to the Anthropic API. Two secrets live here on the server only:
//   ANTHROPIC_API_KEY  — your Anthropic key (never exposed to the browser)
//   SITE_PASSWORD      — the shared password gating the tool
// Every request is rejected unless it carries the correct password.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.SITE_PASSWORD || !process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Server is missing SITE_PASSWORD or ANTHROPIC_API_KEY." });
  }
  if (req.headers["x-site-password"] !== process.env.SITE_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ ...req.body, model: "claude-sonnet-4-6" }),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
