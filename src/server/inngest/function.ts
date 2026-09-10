import { inngest } from "./client";

export const testTask = inngest.createFunction(
  {
    id: "test-task",
    name: "Test Background Task",
    triggers: [{ event: "app/task.test" }],
  },
  async ({ event, step }) => {
    const result = await step.run("handle-task", async () => {
      console.log("Inngest task running with event data:", event.data);
      return { processed: true, data: event.data };
    });

    await step.sleep("pause", "1s");

    return { message: "Task completed successfully!", result };
  },
);
