// src/inngest/client.ts
import { Inngest } from "inngest";

let inngest: Inngest | null = null;

export function getInngestClient(): Inngest {
  if (!inngest) {
    inngest = new Inngest({
      id: "ai-support-engine",
      isDev:
        process.env.NODE_ENV !== "production" ||
        process.env.INNGEST_DEV === "1",
    });
  }

  return inngest;
}
