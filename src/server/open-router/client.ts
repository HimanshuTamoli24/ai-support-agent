import { OpenRouter } from "@openrouter/agent";
import { env } from "~/env";

export const openrouter = new OpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

export async function runOpenRouterModel(
  input: string,
  instructions: string,
) {
  const result = openrouter.callModel({
    model: "openrouter/free",
    input,
    instructions,
  });

  return await result.getText();
}