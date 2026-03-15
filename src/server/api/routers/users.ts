import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
} from "~/server/api/trpc";

export const userRouter = createTRPCRouter({

  create: adminProcedure
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

    get : adminProcedure
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

    delete : adminProcedure
    .input(z.object({ id: z.string().min(1)}))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.user.delete({
          where: {
            id: input.id,
          },
        });
      } catch (error) {
        // Handle Prisma relation constraint error (P2003)
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003') {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Uživatele nelze smazat, protože má na sebe navázané záznamy (např. faktury).",
          });
        }
        throw error;
      }
    }),

    edit : adminProcedure
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
    
  checkExists: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      return { exists: !!user };
    }),
});