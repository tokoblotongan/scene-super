export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed." });

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch {}
    }
    body = body || {};

    const { prompt, aspectRatio = "16:9", referenceImages, referenceImage } = body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const rawApiKey = process.env.HORDE_API_KEY || "0000000000";
    const apiKey = rawApiKey.replace(/^["']|["']$/g, "").trim();

    // Menyesuaikan resolusi yang lebih ringan agar worker cepat merespons
    let width = 896;
    let height = 512;
    if (aspectRatio === "1:1") {
      width = 512;
      height = 512;
    } else if (aspectRatio === "9:16") {
      width = 512;
      height = 896;
    }

    let sourceImageBase64: string | null = null;
    const targetImg = referenceImages?.[0] || referenceImage;
    if (targetImg) {
      const b64Str = typeof targetImg === "string" ? targetImg : targetImg.data;
      if (b64Str) {
        sourceImageBase64 = b64Str.includes(",") ? b64Str.split(",")[1] : b64Str;
      }
    }

    const hordePayload: any = {
      prompt: prompt.trim(),
      params: {
        width,
        height,
        steps: 20,
        sampler_name: "k_euler_a",
        cfg_scale: 7.0,
      },
      models: ["SDXL_Lightning"],
      nsfw: false,
      trusted_workers: false,
    };

    if (sourceImageBase64) {
      hordePayload.source_image = sourceImageBase64;
      hordePayload.source_processing = "img2img";
      hordePayload.strength = 0.6;
    }

    // Mengirim permintaan generasi asinkron ke AI Horde
    const postResponse = await fetch("https://stablehorde.net/api/v2/generate/text2image", {
      method: "POST",
      headers: {
        "apikey": apiKey,
        "Content-Type": "application/json",
        "Client-Agent": "MultiSceneBatchStudio:1.0:user",
      },
      body: JSON.stringify(hordePayload),
    });

    if (!postResponse.ok) {
      const errText = await postResponse.text();
      throw new Error(`AI Horde Post Error (${postResponse.status}): ${errText}`);
    }

    const postData = await postResponse.json();
    const generationId = postData.id;

    if (!generationId) {
      throw new Error("Gagal mendapatkan ID antrian dari AI Horde.");
    }

    // Segera kembalikan ID antrean ke frontend agar tidak terjadi timeout di Vercel
    return res.status(200).json({
      success: true,
      generationId,
      message: "Tugas berhasil dimasukkan ke antrean AI Horde."
    });

  } catch (error: any) {
    console.error("Error AI Horde:", error);
    return res.status(500).json({
      error: "Gagal memproses antrean gambar.",
      details: error?.toString(),
    });
  }
}
