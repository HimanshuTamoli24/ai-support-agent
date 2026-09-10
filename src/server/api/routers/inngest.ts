import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";
import { inngest } from "~/server/inngest/client";

export const inngestRouter = createTRPCRouter({
  triggerTask: publicProcedure
    .input(z.object({ taskId: z.string().optional() }))
    .mutation(async ({ input }) => {
      return await inngest.send({
        name: "app/task.test",
        data: { id: input.taskId ?? "test-id" },
      });
    }),
});
