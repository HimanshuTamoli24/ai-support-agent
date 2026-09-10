import { getInngestClient } from "./client";

const inngest = getInngestClient();

export const processTask = inngest.createFunction(
  {
    id: "process-task",
    triggers: [{ event: "app/task.created" }],
  },
  async ({ event, step }) => {
    const result = await step.run("handle-task", async () => {
      const data = event.data as { id?: string; name?: string };
      return { processed: true, id: data?.id, name: data?.name };
    });

    await step.sleep("pause", "1s");

    const data = event.data as { id?: string };
    return { message: `Task ${data?.id} complete`, result };
  },
);
