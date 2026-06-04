// Validates the shared site password. The password lives only on the server
// as the SITE_PASSWORD environment variable — never shipped to the browser.
export default function handler(req, res) {
  if (!process.env.SITE_PASSWORD) {
    return res.status(500).json({ error: "SITE_PASSWORD is not set on the server." });
  }
  const pw = req.headers["x-site-password"];
  if (pw && pw === process.env.SITE_PASSWORD) {
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ error: "Incorrect password." });
}
