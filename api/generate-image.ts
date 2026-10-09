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

    const { prompt, aspectRatio = "16:9", referenceImages, referenceImage } = body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    // Mengambil API Key AI Horde (jika tidak ada, gunakan anonymous key "0000000000")
    const rawApiKey = process.env.HORDE_API_KEY || "0000000000";
    const apiKey = rawApiKey.replace(/^["']|["']$/g, "").trim();

    // Menentukan resolusi berdasarkan aspectRatio
    let width = 1024;
    let height = 576; // 16:9
    if (aspectRatio === "1:1") {
      width = 1024;
      height = 1024;
    } else if (aspectRatio === "9:16") {
      width = 576;
      height = 1024;
    }

    // Memproses gambar referensi wajah jika ada
    let sourceImageBase64: string | null = null;
    const targetImg = referenceImages?.[0] || referenceImage;
    if (targetImg) {
      const b64Str = typeof targetImg === "string" ? targetImg : targetImg.data;
      if (b64Str) {
        sourceImageBase64 = b64Str.includes(",") ? b64Str.split(",")[1] : b64Str;
      }
    }

    // 1. Kirim Permintaan (Async Generation) ke AI Horde
    const hordePayload: any = {
      prompt: prompt.trim(),
      params: {
        width,
        height,
        steps: 30,
        sampler_name: "k_euler",
        cfg_scale: 7.5,
      },
      models: ["SDXL Lightning", "Juggernaut XL", "Stable Diffusion XL"],
      nsfw: false,
      trusted_workers: false,
    };

    // Jika ada gambar referensi untuk karakter/wajah, masukkan ke source_image AI Horde
    if (sourceImageBase64) {
      hordePayload.source_image = sourceImageBase64;
      hordePayload.source_processing = "img2img";
      hordePayload.strength = 0.55; // Menjaga konsistensi wajah dari referensi
    }

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

    // 2. Polling (Menunggu worker AI Horde memproses gambar, maksimal 20 kali percobaan)
    let imageUrl: string | null = null;
    let attempts = 0;
    const maxAttempts = 25;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 3000)); // Jeda 3 detik per cek
      attempts++;

      const checkResponse = await fetch(`https://stablehorde.net/api/v2/generate/check/${generationId}`);
      if (!checkResponse.ok) continue;

      const checkData = await checkResponse.json();

      if (checkData.done) {
        // Selesai! Ambil hasil gambar
        const statusResponse = await fetch(`https://stablehorde.net/api/v2/generate/status/${generationId}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.generations && statusData.generations.length > 0) {
            const gen = statusData.generations[0];
            if (gen.img && !gen.censored) {
              imageUrl = gen.img.startsWith("data:") ? gen.img : `data:image/webp;base64,${gen.img}`;
            }
          }
        }
        break;
      }

      if (checkData.faulted) {
        throw new Error("Proses generasi gambar dibatalkan/gagal oleh worker AI Horde.");
      }
    }

    if (!imageUrl) {
      return res.status(504).json({
        error: "Waktu tunggu habis (Timeout). Antrian AI Horde sedang sibuk, silakan klik 'Coba Lagi'.",
      });
    }

    return res.status(200).json({
      imageUrl,
      modelUsed: "AI Horde (SDXL)",
    });

  } catch (error: any) {
    console.error("Error AI Horde:", error);
    return res.status(500).json({
      error: "Gagal menghasilkan gambar via AI Horde.",
      details: error?.toString(),
    });
  }
}
