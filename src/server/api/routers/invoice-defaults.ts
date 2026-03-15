import { z } from "zod";

import {
  createTRPCRouter,
  accountantProcedure,
} from "~/server/api/trpc";

export const invoiceDefaultsRouter = createTRPCRouter({
  get: accountantProcedure.query(async ({ ctx }) => {
    // Get the first (and only) defaults row, or return null
    const defaults = await ctx.db.invoiceDefaults.findFirst()
    return defaults
  }),

  upsert: accountantProcedure
    .input(
      z.object({
        dueDays: z.number().int().min(1),
        invoiceType: z.string(),
        vatRate: z.number().int().min(0),
        unit: z.string(),
        paymentMethod: z.string(),
        currency: z.string(),
        language: z.string(),
        vatCalculation: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.invoiceDefaults.findFirst()

      if (existing) {
        return ctx.db.invoiceDefaults.update({
          where: { id: existing.id },
          data: input,
        })
      } else {
        return ctx.db.invoiceDefaults.create({
          data: input,
        })
      }
    }),
});