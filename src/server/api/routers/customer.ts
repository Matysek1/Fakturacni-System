import { z } from "zod";
import { TRPCError } from "@trpc/server";


import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

export const customerRouter = createTRPCRouter({



    get: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.customer.findMany({
        select: {
          id: true,
          companyId: true,
          name: true,
          ico: true,
          dic: true,
          address: true,
          mesto: true,
          psc: true,
          contact: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    }),
    create: protectedProcedure
    .input(z.object({
      name: z.string(),
      ico: z.string().optional(),
      dic: z.string().optional(),
      address: z.string(),
      mesto: z.string().optional(),
      psc: z.string().optional(),
      contact: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.create({
        data: {
          companyId: 1,
          name: input.name,
          ico: input.ico,
          dic: input.dic,
          address: input.address,
          mesto: input.mesto,
          psc: input.psc,
          contact: input.contact,
        },
      });
      return customer;
    }
    ),

    update: protectedProcedure

    .input(z.object({
      id: z.number(),
      name: z.string(),
      ico: z.string().optional(),
      dic: z.string().optional(),
      address: z.string(),
      mesto: z.string().optional(),
      psc: z.string().optional(),
      contact: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          ico: input.ico,
          dic: input.dic,
          address: input.address,
          mesto: input.mesto,
          psc: input.psc,
          contact: input.contact,
        },
      });
      return customer;
    }
    ),
    delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.db.customer.delete({
          where: { id: input.id },
        })
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003') {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Zákazníka nelze smazat, protože má na sebe navázané faktury nebo náklady.",
          });
        }
        throw error;
      }
    }),

   
});