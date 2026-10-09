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

    const { prompt, style = "", cameraAngle = "", lighting = "", characterConsistency = "" } = body;
    if (!prompt) {
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

    // Prepare headers to support both classic AIzaSy keys and new AQ. / OAuth Bearer tokens
    const headers: Record<string, string> = {
      "User-Agent": "aistudio-build",
    };

    if (apiKey.startsWith("AQ.") || apiKey.startsWith("ya29.")) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers,
      },
    });

    const systemPrompt = `You are a prompt engineer for state-of-the-art AI image generators (Gemini Image, Imagen 3, Midjourney).
Enhance the user's scene prompt into a highly descriptive, vivid English prompt.
Incorporate:
- Art Style: ${style || "cinematic photorealistic"}
- Subject details: ${characterConsistency || "consistent subject"}
- Camera angle: ${cameraAngle || "cinematic framing"}
- Lighting: ${lighting || "cinematic ambient lighting"}
Output ONLY the enhanced prompt as plain text. Do not add markdown quotes, preamble, or explanations.`;

    const response = await callWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
        },
      })
    );

    const enhanced = response.text?.trim() || prompt;
    return res.status(200).json({ enhancedPrompt: enhanced });
  } catch (error: any) {
    console.error("Error enhancing prompt:", error);
    return res.status(500).json({
      error: cleanErrorMessage(error),
    });
  }
}
