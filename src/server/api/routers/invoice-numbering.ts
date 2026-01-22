import { createTRPCRouter, protectedProcedure } from "../trpc"
import {
  normalizeInvoiceNumbering,
  buildInvoiceNumber,
} from "../../services/invoice-number"

export const invoiceNumberingRouter = createTRPCRouter({
  preview: protectedProcedure.query(async ({ ctx }) => {
    const numbering = await ctx.db.invoiceNumbering.findUnique({
      where: { id : 1 },
    })

    if (!numbering) {
      return {
        invoiceNumber: "",
        sequencePreview: "",
      }
    }

    const config = normalizeInvoiceNumbering(numbering)

    return buildInvoiceNumber(
      config,
      numbering.currentNumber
    )
  }),
})
