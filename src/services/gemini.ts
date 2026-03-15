import { GoogleGenAI } from "@google/genai";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";

const getApiKey = async (forceSelect = false) => {
  // 1. Check if user is logged in and has a key in Firestore
  if (auth?.currentUser && db) {
    try {
      const docRef = doc(db, 'settings', auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.geminiKey) {
          return data.geminiKey;
        }
      }
    } catch (error) {
      console.error("Error fetching key from Firestore:", error);
    }
  }

  // 2. Fallback to platform key selection
  if (typeof window !== 'undefined' && (window as any).aistudio) {
    if (forceSelect || !(await (window as any).aistudio.hasSelectedApiKey())) {
      await (window as any).aistudio.openSelectKey();
    }
    return process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  }
  return process.env.GEMINI_API_KEY || "";
};

const isPermissionError = (error: any) => {
  const message = error?.message || "";
  const status = error?.status || "";
  return message.includes("permission") || 
         message.includes("403") || 
         message.includes("Requested entity was not found") ||
         status === "PERMISSION_DENIED";
};

export const generateText = async (prompt: string, model: string = "gemini-3.1-pro-preview", systemInstruction?: string) => {
  if (model.startsWith('gpt-')) {
    try {
      const response = await fetch('/api/ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, systemInstruction }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.text;
    } catch (error: any) {
      console.error("OpenAI error:", error);
      throw new Error("Failed to generate text with OpenAI.");
    }
  }

  try {
    const apiKey = await getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction,
      },
    });
    return response.text || "No content generated.";
  } catch (error: any) {
    if (isPermissionError(error)) {
      const apiKey = await getApiKey(true);
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
          systemInstruction,
        },
      });
      return response.text || "No content generated.";
    }
    console.error("Text generation error:", error);
    throw new Error("Failed to generate text. Please try again.");
  }
};

export const generateCode = async (prompt: string, model: string = "gemini-3.1-pro-preview", language: string = "javascript", complexity: string = "intermediate") => {
  const systemInstruction = `You are an expert software engineer. Provide only the code block in ${language} without much explanation unless asked. The code should be at an ${complexity} level. Use markdown for the code.`;
  return generateText(prompt, model, systemInstruction);
};

export const generateImage = async (
  prompt: string, 
  model: string = "gemini-2.5-flash-image",
  size: "512px" | "1K" | "2K" = "1K", 
  quality: "standard" | "HD" = "standard", 
  aspectRatio: "1:1" | "16:9" | "9:16" | "custom" = "1:1",
  width?: number,
  height?: number
) => {
  if (model === 'stable-diffusion') {
    try {
      const response = await fetch('/api/ai/stability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, width, height }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.image;
    } catch (error: any) {
      console.error("Stability AI error:", error);
      throw new Error("Failed to generate image with Stability AI.");
    }
  }

  const finalModel = model;
  
  const config: any = {
    imageConfig: {
      aspectRatio: aspectRatio === 'custom' ? undefined : aspectRatio,
    }
  };

  if (aspectRatio === 'custom' && width && height) {
    config.imageConfig.width = width;
    config.imageConfig.height = height;
  }

  if (finalModel === "gemini-3.1-flash-image-preview" && aspectRatio !== 'custom') {
    config.imageConfig.imageSize = size;
  }

  const executeImageGen = async (key: string) => {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: finalModel,
      contents: {
        parts: [{ text: prompt }],
      },
      config: config
    });
    
    for (const part of response.candidates?.[0]?.content.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  };

  try {
    const apiKey = await getApiKey(finalModel === "gemini-3.1-flash-image-preview"); 
    return await executeImageGen(apiKey);
  } catch (error: any) {
    if (isPermissionError(error)) {
      const apiKey = await getApiKey(true);
      return await executeImageGen(apiKey);
    }
    console.error("Image generation error:", error);
    throw error;
  }
};

export const generateVideo = async (prompt: string, model: string = 'veo-3.1-fast-generate-preview', aspectRatio: string = '16:9', resolution: '720p' | '1080p' = '720p') => {
  const executeVideoGen = async (key: string) => {
    const aiVeo = new GoogleGenAI({ apiKey: key });
    let operation = await aiVeo.models.generateVideos({
      model: model,
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: resolution,
        aspectRatio: aspectRatio
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      // Re-fetch key to ensure it's still valid/up-to-date
      const pollKey = await getApiKey();
      const pollAi = new GoogleGenAI({ apiKey: pollKey });
      operation = await pollAi.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) return null;

    const finalKey = await getApiKey();
    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': finalKey,
      },
    });
    
    if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  try {
    const apiKey = await getApiKey(true); 
    return await executeVideoGen(apiKey);
  } catch (error: any) {
    if (isPermissionError(error)) {
      const apiKey = await getApiKey(true);
      return await executeVideoGen(apiKey);
    }
    console.error("Veo generation error:", error);
    throw error;
  }
};
