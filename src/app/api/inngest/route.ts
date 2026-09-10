import { serve } from "inngest/next";
import { inngest } from "~/server/inngest/client";
import { supportAgent, uploadToPinecone } from "~/server/inngest/function";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [supportAgent,uploadToPinecone],
});
