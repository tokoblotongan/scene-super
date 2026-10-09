export default function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const rawKey = process.env.GEMINI_API_KEY || "";
  const cleanKey = rawKey.replace(/^["']|["']$/g, "").trim();

  let keyFormat = "none";
  if (cleanKey.startsWith("AIzaSy")) {
    keyFormat = "classic-api-key";
  } else if (cleanKey.startsWith("AQ.")) {
    keyFormat = "new-token-aq";
  } else if (cleanKey.startsWith("ya29.")) {
    keyFormat = "oauth-token";
  } else if (cleanKey) {
    keyFormat = "custom-key";
  }

  return res.status(200).json({
    hasApiKey: !!cleanKey,
    keyFormat,
    keyPrefix: cleanKey ? cleanKey.slice(0, 6) + "..." : null,
    status: "ok",
    environment: process.env.VERCEL ? "vercel" : "standalone",
    defaultModel: "gemini-3.1-flash-lite-image",
  });
}
