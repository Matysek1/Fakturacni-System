import { createTRPCRouter, accountantProcedure } from "../trpc"
import {
  normalizeInvoiceNumbering,
  buildInvoiceNumber,
} from "../../services/invoice-number"

export const invoiceNumberingRouter = createTRPCRouter({
  preview: accountantProcedure.query(async ({ ctx }) => {
    const numbering = await ctx.db.invoiceNumbering.findFirst()

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
