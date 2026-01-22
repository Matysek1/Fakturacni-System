import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const companyRouter = createTRPCRouter({
    get : publicProcedure
    .query(async ({ ctx }) => {
      return ctx.db.company.findFirst({
        select: {
            id: true,
            name: true,
            ico: true,
            dic: true,
            address: true,
            bankAccount: true,
            bankCode: true,
            isPayer: true,
            mesto: true,
            psc: true,
        },
      });
    }),

    update: publicProcedure
    .input(z.object({
        name: z.string(),
        address: z.string(),
        mesto: z.string(),
        psc: z.string(),
        ico: z.string(),
        dic: z.string(),
        bankAccount: z.string(),
        bankCode: z.string(),
        isPayer: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
        const existingCompany = await ctx.db.company.findFirst();
        if (existingCompany) {
            return ctx.db.company.update({
                where: { id: existingCompany.id },
                data: {

                    name: input.name,
                    address: input.address,
                    mesto: input.mesto,
                    psc: input.psc,
                    ico: input.ico,
                    dic: input.dic,
                    bankAccount: input.bankAccount,
                    bankCode: input.bankCode,
                    isPayer: input.isPayer,
                },
            });
        }
    }),

    getseries : publicProcedure
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

    editSeries : publicProcedure
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