import { date, z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "../trpc"

export const invoiceRouter = createTRPCRouter({
  /**
   * CREATE INVOICE + ITEMS
   */
  create: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1), 
        customerId: z.number(),

        issueDate: z.date(),
        dueDate: z.date(),
        duzpDate: z.date(),
        total: z.number(),
        status: z.string().default("pending"),

        items: z
          .array(
            z.object({
              description: z.string().min(1),
              qty: z.number().int().positive(),
              price: z.number().nonnegative(),
              vat: z.number().optional().nullable(),
              unit: z.string().optional().nullable(),
            })
          )
          .min(1),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.$transaction(async (tx) => {
        const exists = await tx.invoice.findFirst({
          where: { id: input.id },
          select: { id: true },
        })

        if (exists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Číslo faktury už existuje",
          })
        }

        await tx.invoice.create({
          data: {
            id: input.id,
            customerId: input.customerId,
            userId: ctx.session.user.id,

            issueDate: input.issueDate,
            dueDate: input.dueDate,
            duzpDate: input.duzpDate,
            total: input.total,
            status: "pending",

            items: {
              create: input.items.map((item) => ({
                description: item.description,
                qty: item.qty,
                unit: item.unit,
                price: item.price,
                vat: item.vat,
              })),
            },
          },
        })

        await tx.invoiceNumbering.update({
          where: { id: 1 }, 
          data: {
            currentNumber: { increment: 1 },
          },
        })
      })
    }),

  get: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.invoice.findMany({
        where: input.id
          ? { id: input.id }
          : undefined,

        select: {
          id: true,
          customerId: true,
          userId: true,

          issueDate: true,
          dueDate: true,
          total: true,
          status: true,

          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              name: true,
            }
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    }),
})