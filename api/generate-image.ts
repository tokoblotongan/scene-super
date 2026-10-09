export default async function handler(req: any, res: any) {
  // CORS Headers
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
    return res.status(405).json({ error: "Method Not Allowed. Gunakan method POST." });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: "Body JSON tidak valid." });
      }
    }
    body = body || {};

    const {
      prompt,
      aspectRatio = "16:9",
      referenceImages,
      referenceImage,
    } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const rawToken = process.env.HF_TOKEN;
    if (!rawToken) {
      return res.status(500).json({
        error: "HF_TOKEN tidak ditemukan di environment variables Vercel. Tambahkan HF_TOKEN di Settings > Environment Variables.",
      });
    }

    const hfToken = rawToken.replace(/^["']|["']$/g, "").trim();

    // Pilih model Hugging Face (menggunakan Flux.1-schnell yang cepat dan gratis via Inference API)
    const modelId = "black-forest-labs/FLUX.1-schnell";
    const hfApiUrl = `https://api-inference.huggingface.co/models/${modelId}`;

    let finalPrompt = prompt.trim();
    
    // Jika ada gambar referensi, kita gabungkan keterangannya ke prompt agar model menyesuaikan
    let referenceImageData: string | null = null;
    const targetImage = referenceImages?.[0] || referenceImage;
    if (targetImage) {
      let base64 = typeof targetImage === "string" ? targetImage : targetImage.data;
      if (base64) {
        if (base64.startsWith("data:")) {
          const match = base64.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            referenceImageData = match[2];
          } else {
            referenceImageData = base64.split(",")[1] || base64;
          }
        } else {
          referenceImageData = base64;
        }
        finalPrompt = `Character consistency style, detailed scene: ${finalPrompt}`;
      }
    }

    // Payload standar untuk Hugging Face Inference API
    const payload: any = {
      inputs: finalPrompt,
      options: {
        wait_for_model: true,
      },
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
        const parsedErr = JSON.parse(errText);
        if (parsedErr.error) errorDetail = parsedErr.error;
      } catch {}

      if (hfResponse.status === 503) {
        return res.status(503).json({
          error: "Model Hugging Face sedang dimuat (Cold Start). Silakan klik tombol 'Coba Lagi' dalam beberapa detik.",
          details: errorDetail,
        });
      }

      throw new Error(`Hugging Face API Error (${hfResponse.status}): ${errorDetail}`);
    }

    // Hugging Face mengembalikan binary gambar (image/jpeg atau image/png)
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
    console.error("Error generating image with Hugging Face:", error);
    return res.status(500).json({
      error: "Gagal menghasilkan gambar via Hugging Face.",
      details: error?.toString(),
    });
  }
}
