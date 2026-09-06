import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";
import { parseRedisInfo } from "@/lib/parseInfo";

export const runtime = "nodejs";

export async function GET() {
  try {
    const client = getRedisClient();
    const [rawInfo, dbSizeRaw] = await Promise.all([client.info(), client.dbsize()]);
    const info = parseRedisInfo(rawInfo);
    return NextResponse.json({ info, dbSize: dbSizeRaw });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
