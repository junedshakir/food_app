import { NextResponse } from "next/server";

// Placeholder health check. DB status is added in US-02 (core infrastructure).
export function GET() {
  return NextResponse.json({ data: { status: "ok" } });
}
