import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "ai-support-engine",
  eventKey: process.env.INNGEST_EVENT_KEY,
  isDev:
    process.env.NODE_ENV !== "production" ||
    process.env.INNGEST_DEV === "1" ||
    !process.env.INNGEST_EVENT_KEY,
});

