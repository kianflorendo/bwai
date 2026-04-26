import { GoogleGenAI } from '@google/genai';
import { TelemetryData, AlertLevel } from '../types.ts';

// Initialize the SDK. It automatically picks up process.env.API_KEY in the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY, vertexai: true });

export const generateEnvironmentalAdvice = async (
  telemetry: TelemetryData,
  level: AlertLevel
): Promise<string> => {
  const prompt = `
    You are an Autonomous Environmental Orchestration Agent monitoring a sensitive facility.
    Current Telemetry:
    - Temperature: ${telemetry.temperature.toFixed(1)}°C
    - Humidity: ${telemetry.humidity.toFixed(1)}%
    - Heat Index: ${telemetry.heatIndex.toFixed(1)}
    - Alert Level: ${level}

    Based on these metrics, provide a concise, real-time operational suggestion or warning.
    If NORMAL, suggest maintaining current parameters.
    If WARNING, suggest preventative actions (e.g., increase ventilation).
    If CRITICAL, demand immediate corrective action.
    
    Keep the response under 3 sentences, professional, and highly actionable. Do not use markdown formatting like bolding.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.4, // Lower temperature for more deterministic, operational advice
      }
    });
    
    return response.text || "No suggestion generated.";
  } catch (error) {
    console.error("Error generating AI advice:", error);
    return "System Error: Unable to reach AI orchestration core. Please monitor metrics manually.";
  }
};
