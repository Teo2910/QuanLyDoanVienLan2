import { GoogleGenAI } from "@google/genai";
import fetch from "node-fetch";

const ai = new GoogleGenAI({ apiKey: "invalid_key" });

const contents = [{ role: "user", parts: [{ text: "hello" }] }];

ai.models.generateContent({
  model: "gemini-3.1-pro-preview",
  contents,
  config: {
    systemInstruction: "You are an AI"
  }
}).then(r => console.log(r)).catch(e => console.error(e.message));
