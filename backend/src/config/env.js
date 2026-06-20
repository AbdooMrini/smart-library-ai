import dotenv from "dotenv";
import { fileURLToPath } from "url";

const envPath = fileURLToPath(new URL("../../.env", import.meta.url));
dotenv.config({ path: envPath });

const required = ["JWT_SECRET", "DB_HOST", "DB_USER", "DB_NAME"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error(
    `Configuration backend manquante dans backend/.env : ${missing.join(", ")}`,
  );
}

if (process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET doit contenir au moins 32 caractères.");
}

const env = {
  port: Number(process.env.PORT || 5000),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    name: process.env.DB_NAME,
  },
  jwtSecret: process.env.JWT_SECRET,
  mistralApiKey: process.env.MISTRAL_API_KEY || "",
  mistralModel: process.env.MISTRAL_MODEL || "mistral-small-latest",
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || "",
  elevenLabsModel: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb",
  elevenLabsTimeout: Number(process.env.ELEVENLABS_TIMEOUT || 120000),
};

export default env;
