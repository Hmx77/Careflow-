import crypto from "node:crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).send("Method Not Allowed");
    return;
  }

  const encoded = process.env.QZ_PRIVATE_KEY_BASE64;
  if (!encoded) {
    res.status(500).send("QZ private key is not configured.");
    return;
  }

  let body = "";
  if (typeof req.body === "string") {
    body = req.body;
  } else if (req.body && typeof req.body.toSign === "string") {
    body = req.body.toSign;
  }

  if (!body || body.length > 65536) {
    res.status(400).send("Invalid signing payload.");
    return;
  }

  try {
    const privateKey = Buffer.from(encoded, "base64").toString("utf8");
    const signer = crypto.createSign("RSA-SHA512");
    signer.update(body, "utf8");
    signer.end();
    const signature = signer.sign(privateKey, "base64");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(signature);
  } catch (error) {
    console.error("QZ signing failed", error);
    res.status(500).send("QZ signing failed.");
  }
}
