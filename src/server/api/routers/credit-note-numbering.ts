import { createTRPCRouter, accountantProcedure } from "../trpc"

/**
 * Build the next credit note number: D + YY + MM + padded sequence
 * e.g. D260301
 */
function buildCreditNoteNumberPreview(
  prefix: string,
  currentNumber: number,
  date = new Date()
): { creditNoteNumber: string; sequencePreview: string } {
  const yy = date.getFullYear().toString().slice(-2)
  const mm = (date.getMonth() + 1).toString().padStart(2, "0")
  const nextSeq = currentNumber + 1
  const seq = nextSeq.toString().padStart(2, "0")
  return {
    creditNoteNumber: `${prefix}${yy}${mm}${seq}`,
    sequencePreview: seq,
  }
}

export const creditNoteNumberingRouter = createTRPCRouter({
  preview: accountantProcedure.query(async ({ ctx }) => {
    let numbering = await ctx.db.creditNoteNumbering.findUnique({
      where: { id: 1 },
    })

    numbering ??= await ctx.db.creditNoteNumbering.create({
      data: { id: 1, prefix: "D", currentNumber: 0 },
    })

    return buildCreditNoteNumberPreview(
      numbering.prefix,
      numbering.currentNumber
    )
  }),
})
