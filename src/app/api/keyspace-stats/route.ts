import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

export const runtime = "nodejs";

const SAMPLE_CAP = 5000;
const SCAN_BATCH = 500;

export async function GET() {
  try {
    const client = getRedisClient();
    const counts: Record<string, number> = {};
    let cursor = "0";
    let scanned = 0;
    let truncated = false;

    do {
      const [nextCursor, batch] = await client.scan(cursor, "COUNT", SCAN_BATCH);
      cursor = nextCursor;

      if (batch.length > 0) {
        const pipeline = client.pipeline();
        for (const key of batch) pipeline.type(key);
        const results = await pipeline.exec();
        for (const result of results ?? []) {
          const type = (result?.[1] as string) || "other";
          counts[type] = (counts[type] || 0) + 1;
        }
        scanned += batch.length;
      }

      if (scanned >= SAMPLE_CAP && cursor !== "0") {
        truncated = true;
        break;
      }
    } while (cursor !== "0");

    return NextResponse.json({ counts, scanned, truncated });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
