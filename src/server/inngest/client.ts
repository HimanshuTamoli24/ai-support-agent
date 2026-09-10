import { Inngest } from "inngest";
import { env } from "~/env";

export const inngest = new Inngest({
  id: "ai-support-engine",
  eventKey: env.INNGEST_EVENT_KEY,
  isDev:
    env.NODE_ENV !== "production" ||
    process.env.INNGEST_DEV === "1" ||
    !env.INNGEST_EVENT_KEY,
});

