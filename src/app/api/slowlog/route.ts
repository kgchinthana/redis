import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const count = Number(searchParams.get("count")) || 50;

  try {
    const client = getRedisClient();
    const raw = (await client.call("SLOWLOG", "GET", count)) as [number, number, number, string[], string, string][];
    const entries = raw.map(([id, timestamp, microseconds, args, clientAddr, clientName]) => ({
      id,
      timestamp,
      microseconds,
      args,
      clientAddr,
      clientName,
    }));
    return NextResponse.json({ entries });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const client = getRedisClient();
    await client.call("SLOWLOG", "RESET");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
