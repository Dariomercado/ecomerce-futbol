import { NextResponse } from "next/server";

export function catalogUnavailableResponse() {
  return NextResponse.json(
    {
      code: "CATALOG_UNAVAILABLE",
      message: "Catalog is temporarily unavailable.",
    },
    { status: 500 },
  );
}
