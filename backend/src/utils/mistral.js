import axios from "axios";
import env from "../config/env.js";

export async function askMistral(messages, fallback) {
  if (!env.mistralApiKey || env.mistralApiKey === "your_key_here") return fallback();
  try {
    const { data } = await axios.post(
      "https://api.mistral.ai/v1/chat/completions",
      {
        model: env.mistralModel,
        messages,
        temperature: 0.5,
        response_format: { type: "json_object" },
      },
      {
        headers: { Authorization: `Bearer ${env.mistralApiKey}` },
        timeout: 30000,
      },
    );
    return { ...JSON.parse(data.choices[0].message.content), generated_by_ai: true };
  } catch (error) {
    console.warn("Mistral indisponible, fallback utilisé:", error.message);
    return fallback();
  }
}
