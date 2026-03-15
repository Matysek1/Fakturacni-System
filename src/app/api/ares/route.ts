import { NextResponse } from "next/server"

interface AresSidlo {
  nazevUlice?: string
  cisloDomovni?: number
  cisloOrientacni?: number
  nazevObce?: string
  psc?: number
}

interface AresResponse {
  obchodniJmeno?: string
  ico?: string
  dic?: string
  sidlo?: AresSidlo
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const ico = searchParams.get("ico")

  if (!ico || !/^\d{1,8}$/.test(ico)) {
    return NextResponse.json(
      { error: "Neplatné IČO" },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(
      `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json(
          { error: "Subjekt s tímto IČO nebyl nalezen" },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: "Chyba při komunikaci s ARES" },
        { status: 502 }
      )
    }

    const data = (await res.json()) as AresResponse
    const sidlo: AresSidlo = data.sidlo ?? {}
    const addressParts: string[] = []

    if (sidlo.nazevUlice) {
      addressParts.push(
        sidlo.nazevUlice +
          (sidlo.cisloDomovni ? ` ${sidlo.cisloDomovni}` : "") +
          (sidlo.cisloOrientacni ? `/${sidlo.cisloOrientacni}` : "")
      )
    } else if (sidlo.cisloDomovni) {
      addressParts.push(`č.p. ${sidlo.cisloDomovni}`)
    }

    const result = {
      name: data.obchodniJmeno ?? "",
      ico: data.ico ?? ico,
      dic: data.dic ?? "",
      address: addressParts.join(", "),
      mesto: sidlo.nazevObce ?? "",
      psc: sidlo.psc?.toString() ?? "",
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error("ARES lookup error:", err)
    return NextResponse.json(
      { error: "Nepodařilo se spojit s ARES" },
      { status: 502 }
    )
  }
}
