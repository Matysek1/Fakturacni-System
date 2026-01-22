import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
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
          contact: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    }),

   
});