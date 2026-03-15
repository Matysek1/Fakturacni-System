import { createTRPCRouter, accountantProcedure } from "../trpc"

/**
 * Build the next expense number preview: N + YY + MM + padded sequence
 */
function buildExpenseNumberPreview(
  prefix: string,
  currentNumber: number,
  date = new Date()
): { expenseNumber: string; sequencePreview: string } {
  const yy = date.getFullYear().toString().slice(-2)
  const mm = (date.getMonth() + 1).toString().padStart(2, "0")
  const nextSeq = currentNumber + 1
  const seq = nextSeq.toString().padStart(2, "0")
  return {
    expenseNumber: `${prefix}${yy}${mm}${seq}`,
    sequencePreview: seq,
  }
}

export const expenseNumberingRouter = createTRPCRouter({
  preview: accountantProcedure.query(async ({ ctx }) => {
    let numbering = await ctx.db.expenseNumbering.findUnique({
      where: { id: 1 },
    })

    // Auto-seed if not exists
    numbering ??= await ctx.db.expenseNumbering.create({
      data: { id: 1, prefix: "N", currentNumber: 0 },
    })  

    return buildExpenseNumberPreview(
      numbering.prefix,
      numbering.currentNumber
    )
  }),
})
