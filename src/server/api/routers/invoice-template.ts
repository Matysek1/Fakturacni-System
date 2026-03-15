import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "../trpc"

export const invoiceTemplateRouter = createTRPCRouter({
  /**
   * CREATE TEMPLATE
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        customerId: z.number().optional(),
        paymentMethod: z.string().default("banka"),
        currency: z.string().default("czk"),
        daysToDue: z.number().int().default(14),
        discount: z.number().optional().default(0),
        invoiceType: z.string().default("faktura"),

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
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.invoiceTemplate.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name,
          customerId: input.customerId ?? null,
          paymentMethod: input.paymentMethod,
          currency: input.currency,
          daysToDue: input.daysToDue,
          discount: input.discount,
          invoiceType: input.invoiceType,

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
    }),

  /**
   * GET ALL TEMPLATES
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.invoiceTemplate.findMany({
      include: {
        customer: {
          select: { name: true },
        },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    })
  }),

  /**
   * GET TEMPLATE BY ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.invoiceTemplate.findUnique({
        where: { 
          id: input.id,
        },
        include: {
          customer: {
            select: { id: true, name: true },
          },
          items: true,
        },
      })

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Šablona nenalezena",
        })
      }

      return template
    }),

  /**
   * DELETE TEMPLATE
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.invoiceTemplate.delete({
        where: { 
          id: input.id,
        },
      })
    }),
})
