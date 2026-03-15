import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "../trpc"

/**
 * Build the next credit note number: D + YY + MM + padded sequence
 */
function buildCreditNoteNumber(
  prefix: string,
  currentNumber: number,
  date = new Date()
): string {
  const yy = date.getFullYear().toString().slice(-2)
  const mm = (date.getMonth() + 1).toString().padStart(2, "0")
  const seq = (currentNumber + 1).toString().padStart(2, "0")
  return `${prefix}${yy}${mm}${seq}`
}

export const creditNoteRouter = createTRPCRouter({
  /**
   * CREATE CREDIT NOTE + ITEMS
   */
  create: protectedProcedure
    .input(
      z
        .object({
          invoiceId: z.string().min(1),
          customerId: z.number(),
          issueDate: z.date(),
          duzpDate: z.date(),
          total: z.number(),
          reason: z.string().optional(),

          items: z
            .array(
              z.object({
                description: z.string().min(1),
                qty: z.number().int(),
                price: z.number(),
                vat: z.number().optional().nullable(),
                unit: z.string().optional().nullable(),
              })
            )
            .min(1),
        })
        .strict()
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        // Get or create numbering row
        const numbering =
          (await tx.creditNoteNumbering.findUnique({
            where: { id: 1 },
          })) ??
          (await tx.creditNoteNumbering.create({
            data: { id: 1, prefix: "D", currentNumber: 0 },
          }))

        const creditNoteId = buildCreditNoteNumber(
          numbering.prefix,
          numbering.currentNumber
        )

        // Check uniqueness
        const exists = await tx.creditNote.findFirst({
          where: { id: creditNoteId },
          select: { id: true },
        })

        if (exists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Číslo dobropisu už existuje",
          })
        }

        // Verify the referenced invoice exists
        const invoice = await tx.invoice.findUnique({
          where: { id: input.invoiceId },
          select: { id: true },
        })

        if (!invoice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Odkazovaná faktura nenalezena",
          })
        }

        await tx.creditNote.create({
          data: {
            id: creditNoteId,
            invoiceId: input.invoiceId,
            customerId: input.customerId,
            userId: ctx.session.user.id,
            issueDate: input.issueDate,
            duzpDate: input.duzpDate,
            total: input.total,
            reason: input.reason ?? null,

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
        await tx.creditNoteNumbering.update({
          where: { id: 1 },
          data: {
            currentNumber: { increment: 1 },
          },
        })

        return { id: creditNoteId }
      })
    }),

  /**
   * GET ALL CREDIT NOTES
   */
  get: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.creditNote.findMany({
        where: input.id ? { id: input.id } : undefined,

        select: {
          id: true,
          invoiceId: true,
          customerId: true,
          userId: true,
          issueDate: true,
          duzpDate: true,
          total: true,
          reason: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              name: true,
            },
          },
          invoice: {
            select: {
              id: true,
              total: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })
    }),

  /**
   * GET CREDIT NOTE BY ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const creditNote = await ctx.db.creditNote.findUnique({
        where: { id: input.id },
        include: {
          customer: true,
          invoice: {
            include: {
              items: true,
            },
          },
          items: true,
        },
      })

      if (!creditNote) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dobropis nenalezen",
        })
      }

      return creditNote
    }),
})
