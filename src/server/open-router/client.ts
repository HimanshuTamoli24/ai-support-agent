import { OpenRouter } from "@openrouter/agent";
import { weatherTool } from "./tools";
import { env } from "~/env";

// Direct client variable export
export const openrouter = new OpenRouter({
  apiKey: env.OPENROUTER_API_KEY || "",
});

// Example callable function using openrouter
export async function askWeather(city: string) {
  if (!env.OPENROUTER_API_KEY) {
    console.warn("⚠️ OPENROUTER_API_KEY is not set in .env. Skipping OpenRouter call.");
    return `Simulated weather for ${city}: 72°F, Sunny (Set OPENROUTER_API_KEY in .env to use live model)`;
  }

  const result = openrouter.callModel({
    model: "~anthropic/claude-sonnet-latest",
    input: `What is the weather in ${city}?`,
    tools: [weatherTool],
  });

  return await result.getText();
}
