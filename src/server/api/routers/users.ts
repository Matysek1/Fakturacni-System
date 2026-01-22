import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const userRouter = createTRPCRouter({

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1),
        email: z.string().email(),
        roleId: z.number().min(1)}))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.create({
        data: {
        name: input.name,
        email: input.email,
        roleId: input.roleId},
      });
    }),

    get : protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            roleId: true,
            createdAt: true,
        },
      });
    }),

    delete : protectedProcedure
    .input(z.object({ id: z.string().min(1)}))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.delete({
        where: {
          id: input.id,
        },
      });
    }),

    edit : protectedProcedure
    .input(z.object({ id: z.string().min(1),
        name: z.string().min(1),
        email: z.string().email(),
        roleId: z.number().min(1)}))
    .mutation(async ({ ctx, input }) => {
        return ctx.db.user.update({
        where: {
            id: input.id,
        },
        data: {
            name: input.name,
            email: input.email,
            roleId: input.roleId,
        },
      });
    }),
});