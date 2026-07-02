import OpenAI from "openai";
import { observeOpenAI } from "@langfuse/openai";

export function hasOpenAI() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    return client;
  }

  return observeOpenAI(client, {
    traceName: "timecity-scene-generation",
    tags: ["timecity", "scene-generation"],
  });
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}
