import { NextResponse } from "next/server";

// Always reflect the currently deployed build; never cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/version
 * Returns the build identifier of the deployment currently serving this
 * request. Clients compare it against the version they booted with to detect
 * that a newer version has shipped.
 */
export async function GET() {
  return NextResponse.json(
    { version: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
