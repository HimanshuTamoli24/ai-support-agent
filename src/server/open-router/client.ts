import { OpenRouter } from "@openrouter/agent";
import { weatherTool } from "./tools";
import { env } from "~/env";

// Direct client variable export
export const openrouter = new OpenRouter({
  apiKey: env.OPENROUTER_API_KEY || "",
});

// Example callable function using openrouter
export async function askWeather(city: string) {
  const result = openrouter.callModel({
    model: "~anthropic/claude-sonnet-latest",
    input: `What is the weather in ${city}?`,
    tools: [weatherTool],
  });

  return await result.getText();
}
