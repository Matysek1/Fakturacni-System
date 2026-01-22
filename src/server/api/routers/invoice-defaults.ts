import { z } from "zod";

import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

export const invoiceDefaultsRouter = createTRPCRouter({

    get : publicProcedure
    .query(async ({ ctx }) => {
      return ctx.db.invoiceNumbering.findFirst({
        select: {
            id: true,
            yearFormat: true,
            includeMonth: true,
            sequencePosition: true,
            digits: true,
            prefix: true,
            currentNumber: true,
        },
      });
    }),

    edit : publicProcedure
    .input(z.object({ id: z.number().min(1),
        yearFormat: z.string().min(1),
        includeMonth: z.boolean(),
        sequencePosition: z.string().min(1),
        digits: z.number().min(1),
        prefix: z.string().min(1),
        currentNumber: z.number().min(0)}))
    .mutation(async ({ ctx, input }) => {
        return ctx.db.invoiceNumbering.update({
        where: {
            id: input.id,
        },
        data: {
            yearFormat: input.yearFormat,
            includeMonth: input.includeMonth,
            sequencePosition: input.sequencePosition,
            digits: input.digits,
            prefix: input.prefix,
            currentNumber: input.currentNumber,
        },
      });
    }),
});