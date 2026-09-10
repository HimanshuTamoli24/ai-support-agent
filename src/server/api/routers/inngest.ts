import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { getInngestClient } from "~/server/inngest/client";

export const inngestRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // 1. Create post in database
      const post = await ctx.db.post.create({
        data: {
          name: input.name,
          createdBy: { connect: { id: ctx.session.user.id } },
        },
      });

      // 2. Trigger background event via Inngest
      const inngest = getInngestClient();
      await inngest.send({
        name: "app/task.created",
        data: {
          id: post.id,
          name: post.name,
          userId: ctx.session.user.id,
        },
      });

      return post;
    }),

  triggerTask: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ input }) => {
      const inngest = getInngestClient();
      return await inngest.send({
        name: "app/task.created",
        data: { id: input.taskId },
      });
    }),
});
