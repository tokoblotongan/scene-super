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

    let finalPrompt = prompt.trim();
    if (referenceImages || referenceImage) {
      finalPrompt = `Character consistency style: ${finalPrompt}`;
    }

    // Tentukan ukuran berdasarkan aspect ratio
    let width = 1280;
    let height = 720;
    if (aspectRatio === "1:1") {
      width = 1024;
      height = 1024;
    } else if (aspectRatio === "9:16") {
      width = 720;
      height = 1280;
    }

    // Buat URL endpoint Pollinations.ai secara dinamis
    const encodedPrompt = encodeURIComponent(finalPrompt);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&private=true`;

    // Ambil gambar langsung dari URL Pollinations sebagai buffer/arraybuffer
    const imageResponse = await fetch(pollinationsUrl);
    if (!imageResponse.ok) {
      throw new Error(`Gagal mengambil gambar dari Pollinations.ai (Status: ${imageResponse.status})`);
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");
    const imageUrl = `data:image/jpeg;base64,${base64Image}`;

    return res.status(200).json({
      imageUrl,
      modelUsed: "pollinations-flux",
    });
  } catch (error: any) {
    console.error("Error generating image with Pollinations:", error);
    return res.status(500).json({
      error: "Gagal menghasilkan gambar via Pollinations.",
      details: error?.toString(),
    });
  }
}
