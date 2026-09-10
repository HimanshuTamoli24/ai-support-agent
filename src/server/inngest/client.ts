import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "ai-support-engine",
  isDev:
    process.env.NODE_ENV !== "production" || process.env.INNGEST_DEV === "1",
});

