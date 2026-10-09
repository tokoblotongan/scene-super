import { GoogleGenAI } from "@google/genai";

async function callWithRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    const isTransient =
      errorMsg.includes("503") ||
      errorMsg.includes("UNAVAILABLE") ||
      errorMsg.includes("429") ||
      errorMsg.includes("high demand") ||
      errorMsg.includes("RESOURCE_EXHAUSTED");

    if (retries > 0 && isTransient) {
      console.log(`Transient error encountered, retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return callWithRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

function cleanErrorMessage(err: any): string {
  if (!err) return "Terjadi kesalahan internal.";
  let msg = err?.message || String(err);
  try {
    const parsed = JSON.parse(msg);
    if (parsed?.error?.message) {
      msg = parsed.error.message;
    }
  } catch {}
  if (msg.includes("high demand") || msg.includes("UNAVAILABLE") || msg.includes("503")) {
    return "Layanan AI sedang sibuk sementara karena lonjakan trafik. Silakan klik tombol 'Coba Lagi'.";
  }
  return msg;
}

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
      model = "gemini-3.1-flash-lite-image",
      referenceImages,
      referenceImage,
    } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const rawKey = process.env.GEMINI_API_KEY;
    if (!rawKey) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY tidak ditemukan di environment variables. Pastikan GEMINI_API_KEY sudah disetel di Vercel Dashboard (Settings > Environment Variables) dan lakukan Redeploy.",
      });
    }

    // Clean leading/trailing quotes and whitespace
    const apiKey = rawKey.replace(/^["']|["']$/g, "").trim();

    // Inisialisasi GoogleGenAI secara bersih tanpa header Authorization Bearer yang memicu error
    const ai = new GoogleGenAI({
      apiKey,
    });

    const modelToUse = model || "gemini-3.1-flash-lite-image";
    const imageConfig: { aspectRatio: string; imageSize?: string } = {
      aspectRatio: aspectRatio || "16:9",
    };

    if (modelToUse === "gemini-nano-banana-2.1" || modelToUse === "gemini-3-pro-image") {
      imageConfig.imageSize = "1K";
    }

    // Build multimodal content parts: reference image(s) + prompt text
    const parts: any[] = [];

    const addImagePart = (img: any) => {
      if (!img) return;
      let base64 = typeof img === "string" ? img : img.data;
      if (!base64 || typeof base64 !== "string") return;
      let mimeType = typeof img === "object" && img.mimeType ? img.mimeType : "image/jpeg";
      if (base64.startsWith("data:")) {
        const match = base64.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64 = match[2];
        }
      }
      parts.push({
        inlineData: {
          mimeType,
          data: base64,
        },
      });
    };

    if (Array.isArray(referenceImages)) {
      for (const img of referenceImages) {
        addImagePart(img);
      }
    } else if (referenceImage) {
      addImagePart(referenceImage);
    }

    let finalPrompt = prompt.trim();
    if (parts.length > 0) {
      finalPrompt = `Using the attached reference face/character image, faithfully preserve the subject's face likeness, facial features, and character identity in this scene: ${finalPrompt}`;
    }

    parts.push({
      text: finalPrompt,
    });

    const response = await callWithRetry(() =>
      ai.models.generateContent({
        model: modelToUse,
        contents: {
          parts,
        },
        config: {
          imageConfig,
        },
      })
    );

    let imageUrl = "";
    let textOutput = "";

    const candidateParts = response.candidates?.[0]?.content?.parts || [];
    for (const part of candidateParts) {
      if (part.inlineData) {
        const mime = part.inlineData.mimeType || "image/png";
        imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        break;
      } else if (part.text) {
        textOutput += part.text;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({
        error: "Tidak ada gambar yang dihasilkan oleh model.",
        details: textOutput || "Model tidak mengembalikan inlineData gambar.",
      });
    }

    return res.status(200).json({
      imageUrl,
      modelUsed: modelToUse,
    });
  } catch (error: any) {
    console.error("Error generating image:", error);
    return res.status(500).json({
      error: cleanErrorMessage(error),
      details: error?.toString(),
    });
  }
}
