import { z } from "zod"
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
        statusId: z.number().int().min(1).default(2), // default "ceka"
        discount: z.number().optional().default(0),

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
            statusId: input.statusId,
            discount: input.discount,

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

        // Don't increment invoice number for drafts
        if (input.statusId !== 1) {
          const numbering = await tx.invoiceNumbering.findFirst()
          if (!numbering) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Číselná řada faktur není nastavena",
            })
          }
          await tx.invoiceNumbering.update({
            where: { id: numbering.id },
            data: {
              currentNumber: { increment: 1 },
            },
          })
        }
      })
    }),

  /**
   * GET ALL INVOICES
   */
  get: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.invoice.findMany({
        where: {
          ...(input.id ? { id: input.id } : {}),
        },

        select: {
          id: true,
          customerId: true,
          userId: true,

          issueDate: true,
          duzpDate: true,
          dueDate: true,
          total: true,
          discount: true,
          statusId: true,
          status: {
            select: {
              id: true,
              name: true,
              label: true,
            },
          },

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

  /**
   * GET INVOICE BY ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const invoice = await ctx.db.invoice.findUnique({
        where: { id: input.id },
        include: {
          customer: {
            include: {
              company: true,
            },
          },
          status: true,
          items: true,
          payments: true,
        },
      })

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Faktura nenalezena",
        })
      }

      return invoice
    }),

  /**
   * UPDATE INVOICE + ITEMS
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        customerId: z.number().optional(),

        issueDate: z.date().optional(),
        dueDate: z.date().optional(),
        duzpDate: z.date().optional(),
        total: z.number().optional(),
        statusId: z.number().int().min(1).optional(),
        discount: z.number().optional(),

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
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, items, ...data } = input

      await ctx.db.$transaction(async (tx) => {
        const existing = await tx.invoice.findUnique({
          where: { id },
          select: { id: true },
        })

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Faktura nenalezena",
          })
        }

        // Update invoice fields
        await tx.invoice.update({
          where: { id },
          data,
        })

        // If items provided, replace all items
        if (items) {
          await tx.invoiceItem.deleteMany({ where: { invoiceId: id } })
          await tx.invoiceItem.createMany({
            data: items.map((item) => ({
              invoiceId: id,
              description: item.description,
              qty: item.qty,
              unit: item.unit,
              price: item.price,
              vat: item.vat,
            })),
          })
        }
      })
    }),

  /**
   * UPDATE STATUS ONLY
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        statusId: z.number().int().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.invoice.update({
        where: { id: input.id },
        data: { statusId: input.statusId },
      })
    }),
})