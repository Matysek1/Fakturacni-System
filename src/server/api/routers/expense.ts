 
import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "../trpc"

/**
 * Build the next expense number: N + YY + MM + padded sequence
 * e.g. N260201  (prefix N, year 26, month 02, sequence 01)
 */
function buildExpenseNumber(
  prefix: string,
  currentNumber: number,
  date = new Date()
): string {
  const yy = date.getFullYear().toString().slice(-2)
  const mm = (date.getMonth() + 1).toString().padStart(2, "0")
  const seq = (currentNumber + 1).toString().padStart(2, "0")
  return `${prefix}${yy}${mm}${seq}`
}

export const expenseRouter = createTRPCRouter({
  /**
   * CREATE EXPENSE + ITEMS
   */
  create: protectedProcedure
    .input(
      z.object({
        customerId: z.number().optional(),
        issueDate: z.date(),
        dueDate: z.date(),
        total: z.number(),
        description: z.string().optional(),
        statusId: z.number().int().min(1).default(2),

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
      return ctx.db.$transaction(async (tx) => {
        // Get or create numbering row
        const numbering = await tx.expenseNumbering.findUnique({
          where: { id: 1 },
        }) ?? await tx.expenseNumbering.create({
          data: { id: 1, prefix: "N", currentNumber: 0 },
        })

        const expenseId = buildExpenseNumber(
          numbering.prefix,
          numbering.currentNumber
        )

        // Check uniqueness
        const exists = await tx.expense.findFirst({
          where: { id: expenseId },
          select: { id: true },
        })

        if (exists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Číslo nákladu už existuje",
          })
        }

        await tx.expense.create({
          data: {
            id: expenseId,
            customerId: input.customerId ?? null,
            userId: ctx.session.user.id,
            issueDate: input.issueDate,
            dueDate: input.dueDate,
            total: input.total,
            description: input.description ?? null,
            statusId: input.statusId,

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

        // Increment numbering
        await tx.expenseNumbering.update({
          where: { id: 1 },
          data: {
            currentNumber: { increment: 1 },
          },
        })

        return { id: expenseId }
      })
    }),

  /**
   * GET ALL EXPENSES
   */
  get: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.expense.findMany({
        where: {
          ...(input.id ? { id: input.id } : {}),
        },

        select: {
          id: true,
          customerId: true,
          userId: true,
          issueDate: true,
          dueDate: true,
          total: true,
          description: true,
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
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    }),

  /**
   * GET EXPENSE BY ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const expense = await ctx.db.expense.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          customerId: true,
          userId: true,
          issueDate: true,
          dueDate: true,
          total: true,
          description: true,
          statusId: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              id: true,
              name: true,
              ico: true,
              dic: true,
              address: true,
              mesto: true,
              psc: true,
              contact: true,
            },
          },
          status: {
            select: {
              id: true,
              name: true,
              label: true,
            },
          },
          items: {
            select: {
              id: true,
              description: true,
              qty: true,
              unit: true,
              price: true,
              vat: true,
            },
          },
        },
      })

      if (!expense) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Náklad nenalezen",
        })
      }

      return expense
    }),

  /**
   * UPDATE EXPENSE + ITEMS
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        customerId: z.number().optional().nullable(),
        issueDate: z.date().optional(),
        dueDate: z.date().optional(),
        total: z.number().optional(),
        description: z.string().optional().nullable(),
        statusId: z.number().int().min(1).optional(),

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
        const existing = await tx.expense.findUnique({
          where: { id },
          select: { id: true },
        })

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Náklad nenalezen",
          })
        }

        await tx.expense.update({
          where: { id },
          data,
        })

        if (items) {
          await tx.expenseItem.deleteMany({ where: { expenseId: id } })
          await tx.expenseItem.createMany({
            data: items.map((item) => ({
              expenseId: id,
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
      return ctx.db.expense.update({
        where: { id: input.id },
        data: { statusId: input.statusId },
      })
    }),
})
