import { tool } from "@openrouter/agent";
import { z } from "zod/v4";

export const weatherTool = tool({
  name: "get_weather",
  description: "Get the current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City name"),
  }) as any,
  execute: async ({ location }: { location: string }) => {
    return { temperature: 72, condition: "sunny", location };
  },
});
