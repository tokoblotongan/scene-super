import { GoogleGenAI, Type } from "@google/genai";

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
      story,
      sceneCount = 10,
      stylePreset = "Cinematic Film 35mm",
      characterDetails = "",
      lighting = "",
    } = body;

    if (!story || typeof story !== "string" || !story.trim()) {
      return res.status(400).json({ error: "Story or prompt description is required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY tidak ditemukan di environment variables. Pastikan GEMINI_API_KEY sudah disetel di Vercel Dashboard (Settings > Environment Variables) dan lakukan Redeploy.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const count = Math.min(Math.max(Number(sceneCount) || 10, 1), 15);

    const systemPrompt = `You are an elite cinematic director, storyboard artist, and AI visual prompt engineer.
Your task is to take a user story/concept and break it into exactly ${count} sequential scenes (Scene 1 to Scene ${count}).
Visual prompt requirements:
1. Prompts MUST be in English for optimal image generation fidelity.
2. Maintain strong visual consistency: keep subject character appearance (${characterDetails || "consistent protagonist"}), clothes, aesthetic tone, and art style (${stylePreset}) coherent across all scenes.
3. Every scene must have a distinct narrative progression (Beginning, Rising Action, Climax, Resolution).
4. Provide vivid camera angles, focal depths, lighting, and action details.
5. In 'sceneDescriptionId', provide an Indonesian summary of what happens in this scene for user clarity.`;

    const userPrompt = `Story/Concept: "${story.trim()}"
Total scenes needed: ${count}
Chosen visual style: ${stylePreset}
Character details to keep consistent: ${characterDetails || "Consistent protagonist from scene 1 to " + count}
Lighting/atmosphere preference: ${lighting || "Dynamic cinematic lighting"}

Generate exactly ${count} scenes following the narrative arc.`;

    const response = await callWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              storySummary: {
                type: Type.STRING,
                description: "Short summary of the 10-scene storyboard in Indonesian.",
              },
              scenes: {
                type: Type.ARRAY,
                description: `List of exactly ${count} scenes.`,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sceneNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING, description: "Short title of this scene (Indonesian/English)" },
                    prompt: {
                      type: Type.STRING,
                      description: "High-detail English prompt ready for text-to-image generator",
                    },
                    sceneDescriptionId: {
                      type: Type.STRING,
                      description: "Short Indonesian explanation of what happens in this scene",
                    },
                    cameraAngle: {
                      type: Type.STRING,
                      description: "e.g., Wide establishing shot, Close-up portrait, Dutch angle, Drone shot",
                    },
                    lighting: {
                      type: Type.STRING,
                      description: "e.g., Warm golden hour, Neon cyberpunk glow, Moody atmospheric fog",
                    },
                  },
                  required: ["sceneNumber", "title", "prompt", "sceneDescriptionId", "cameraAngle", "lighting"],
                },
              },
            },
            required: ["storySummary", "scenes"],
          },
        },
      })
    );

    const text = response.text;
    if (!text) {
      throw new Error("No text returned from Gemini model.");
    }

    const parsed = JSON.parse(text);
    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error("Error expanding storyboard scenes:", error);
    return res.status(500).json({
      error: cleanErrorMessage(error),
    });
  }
}
