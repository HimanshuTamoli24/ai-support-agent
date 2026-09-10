import { serve } from "inngest/next";
import { inngest } from "~/server/inngest/client";
import { testTask } from "~/server/inngest/function";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [testTask],
});
