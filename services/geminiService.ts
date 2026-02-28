
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { MODELS } from "../constants";

export class GeminiService {
  private get ai() {
    return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async chat(prompt: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
    const chat = this.ai.chats.create({
      model: MODELS.TEXT,
      config: {
        systemInstruction: "You are ToletBro, a real estate expert assistant. Help users find properties, explain QR features, and provide market insights.",
      },
      history: history,
    });

    const response = await chat.sendMessage({ message: prompt });
    return response.text;
  }

  async generateImage(prompt: string, aspectRatio: string = '1:1') {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    }

    const response = await this.ai.models.generateContent({
      model: MODELS.IMAGE_GEN,
      contents: { parts: [{ text: `High quality real estate photo: ${prompt}` }] },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error('No image generated');
  }

  /**
   * Robustly extracts JSON from a string that might contain conversational text or markdown.
   */
  private extractJson(text: string) {
    if (!text) return null;
    try {
      // Find the first '{' and last '}'
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        const jsonStr = text.substring(start, end + 1);
        return JSON.parse(jsonStr);
      }
      return JSON.parse(text);
    } catch (e) {
      console.warn("JSON extraction failed for text:", text);
      return null;
    }
  }
}

export const gemini = new GeminiService();
