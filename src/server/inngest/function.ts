import { inngest } from "./client";

export const uploadToPinecone = inngest.createFunction(
  {
    id: "upload-to-pinecone",
    name: "Upload User Data to Pinecone",
    triggers: [{ event: "support/user.data.upload" }],
  },
  async ({ event, step }) => {
    const data = event.data;

    await step.run("process-data", async () => {
      // Implement retry logic here (try up to 3 times, max 2 consecutive failures)
    });

    return { message: "User data processed and uploaded" };
  },
);

export const supportAgent = inngest.createFunction(
  {
    id: "support-agent",
    name: "Support Agent Workflow",
    triggers: [{ event: "support/message.received" }],
  },
  async ({ event, step }) => {
    const intent = await step.run("classify-intent", async () => {
      // OpenRouter
    });

    const evidence = await step.run("retrieve-evidence", async () => {
      // Pinecone
    });

    const reply = await step.run("generate-reply", async () => {
      // OpenRouter + evidence
    });

    const escalation = await step.run("decide-escalation", async () => {
      // OpenRouter
    });

    await step.run("save-agent-run", async () => {
      // Prisma
    });

    return {
      intent,
      evidence,
      reply,
      escalation,
    };
  },
);
