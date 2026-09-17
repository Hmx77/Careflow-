export default function handler(req, res) {
  const encoded = process.env.QZ_CERTIFICATE_BASE64;

  if (!encoded) {
    res.status(500).send("QZ certificate is not configured.");
    return;
  }

  try {
    const certificate = Buffer.from(encoded, "base64").toString("utf8");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(certificate);
  } catch {
    res.status(500).send("QZ certificate could not be decoded.");
  }
}
