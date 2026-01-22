export type InvoiceNumberingConfig = {
  yearFormat: "yyyy" | "yy" | "none"
  includeMonth: boolean
  sequencePosition: "START" | "END"
  digits: number
  prefix?: string | null
}

export type InvoiceNumberBuildResult = {
  invoiceNumber: string
  sequencePreview: string
}


export function normalizeInvoiceNumbering(db: {
  yearFormat: string
  includeMonth: boolean | number
  sequencePosition: string
  digits: number
  prefix?: string | null
}): InvoiceNumberingConfig {
  return {
    yearFormat:
      db.yearFormat === "2025"
        ? "yyyy"
        : db.yearFormat === "25"
        ? "yy"
        : "none",

    includeMonth: db.includeMonth === true || db.includeMonth === 1,

    sequencePosition:
      db.sequencePosition === "start" ? "START" : "END",

    digits: Number(db.digits),

    prefix: db.prefix ?? null,
  }
}


export function buildInvoiceNumber(
  config: InvoiceNumberingConfig,
  currentNumber: number,
  date = new Date()
): InvoiceNumberBuildResult {
  const parts: string[] = []

  const nextSequence = currentNumber + 1
  const paddedSequence = nextSequence
    .toString()
    .padStart(config.digits, "0")

  if (config.prefix) {
    parts.push(config.prefix)
  }

  if (config.sequencePosition === "START") {
    parts.push(paddedSequence)
  }

  if (config.yearFormat === "yyyy") {
    parts.push(date.getFullYear().toString())
  }

  if (config.yearFormat === "yy") {
    parts.push(date.getFullYear().toString().slice(-2))
  }

  if (config.includeMonth) {
    parts.push((date.getMonth() + 1).toString().padStart(2, "0"))
  }

  if (config.sequencePosition === "END") {
    parts.push(paddedSequence)
  }

  return {
    invoiceNumber: parts.join(""),
    sequencePreview: paddedSequence,
  }
}
