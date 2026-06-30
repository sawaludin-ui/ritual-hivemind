import { NextResponse } from "next/server";
import { getMatches } from "@/lib/fixtures";

export const runtime = "nodejs";
export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  try {
    const matches = await getMatches();
    return NextResponse.json({ matches });
  } catch (err) {
    return NextResponse.json({ matches: [], error: "Failed to fetch fixtures" }, { status: 500 });
  }
}