import { serve } from "inngest/next";
import { getInngestClient } from "~/server/inngest/client";
import { processTask } from "~/server/inngest/function";

export const { GET, POST, PUT } = serve({
  client: getInngestClient(),
  functions: [processTask],
});
