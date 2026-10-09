export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {}
    }
    body = body || {};

    const { prompt } = body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const rawToken = process.env.HF_TOKEN;
    if (!rawToken) {
      return res.status(500).json({ error: "HF_TOKEN tidak ditemukan di Vercel." });
    }

    const hfToken = rawToken.replace(/^["']|["']$/g, "").trim();
    const modelId = "black-forest-labs/FLUX.1-schnell";
    const hfApiUrl = `https://api-inference.huggingface.co/models/${modelId}`;

    // Payload murni standar Hugging Face Inference API
    const payload = {
      inputs: prompt.trim(),
      options: {
        wait_for_model: true,
      }
    };

    const hfResponse = await fetch(hfApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!hfResponse.ok) {
      const errText = await hfResponse.text();
      let errorDetail = errText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error) errorDetail = parsed.error;
      } catch {}

      return res.status(hfResponse.status).json({
        error: `Hugging Face Error: ${errorDetail}`,
      });
    }

    const arrayBuffer = await hfResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");
    const mimeType = hfResponse.headers.get("content-type") || "image/jpeg";
    const imageUrl = `data:${mimeType};base64,${base64Image}`;

    return res.status(200).json({
      imageUrl,
      modelUsed: modelId,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: "Gagal memproses permintaan.",
      details: error?.toString(),
    });
  }
}
