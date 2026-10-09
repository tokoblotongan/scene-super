import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();

// Enable CORS & Preflight
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Support large payloads (for base64 reference images)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Server-side initialization of Gemini SDK
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY tidak ditemukan di environment variables. Pastikan GEMINI_API_KEY sudah disetel di Vercel Dashboard (Settings > Environment Variables) dan lakukan Redeploy."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

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

// Health and Config status (handles both /api/status and /status)
app.get(["/api/status", "/status"], (_req, res) => {
  res.json({
    hasApiKey: !!process.env.GEMINI_API_KEY,
    status: "ok",
    defaultModel: "gemini-3.1-flash-lite-image",
  });
});

// Endpoint: Generate Image for a single scene (handles both /api/generate-image and /generate-image)
app.post(["/api/generate-image", "/generate-image"], async (req, res) => {
  try {
    const {
      prompt,
      aspectRatio = "16:9",
      model = "gemini-3.1-flash-lite-image",
      referenceImages,
      referenceImage,
    } = req.body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const ai = getAiClient();
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
        error: "No image was returned by the model.",
        details: textOutput || "Model did not output inline image data.",
      });
    }

    return res.json({
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
});

// Endpoint: Script / Story to 1-10 Scenes AI Expander (handles both /api/ai-script-to-scenes and /ai-script-to-scenes)
app.post(["/api/ai-script-to-scenes", "/ai-script-to-scenes"], async (req, res) => {
  try {
    const {
      story,
      sceneCount = 10,
      stylePreset = "Cinematic Film 35mm",
      characterDetails = "",
      lighting = "",
    } = req.body;

    if (!story || typeof story !== "string" || !story.trim()) {
      return res.status(400).json({ error: "Story or prompt description is required." });
    }

    const count = Math.min(Math.max(Number(sceneCount) || 10, 1), 15);
    const ai = getAiClient();

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
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error expanding storyboard scenes:", error);
    return res.status(500).json({
      error: cleanErrorMessage(error),
    });
  }
});

// Endpoint: AI Polish / Enhance individual scene prompt (handles both /api/enhance-prompt and /enhance-prompt)
app.post(["/api/enhance-prompt", "/enhance-prompt"], async (req, res) => {
  try {
    const { prompt, style = "", cameraAngle = "", lighting = "", characterConsistency = "" } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const ai = getAiClient();
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
    return res.json({ enhancedPrompt: enhanced });
  } catch (error: any) {
    console.error("Error enhancing prompt:", error);
    return res.status(500).json({
      error: cleanErrorMessage(error),
    });
  }
});

export default app;
