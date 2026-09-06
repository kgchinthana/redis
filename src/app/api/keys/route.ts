import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") || "0";
  const pattern = searchParams.get("pattern") || "*";
  const count = Number(searchParams.get("count")) || 100;
  const typeFilter = searchParams.get("type");

  try {
    const client = getRedisClient();
    const scanArgs = [cursor, "MATCH", pattern, "COUNT", String(count)];
    if (typeFilter && typeFilter !== "all") scanArgs.push("TYPE", typeFilter);

    const [nextCursor, foundKeys] = (await client.call("SCAN", ...scanArgs)) as [string, string[]];

    if (foundKeys.length === 0) {
      return NextResponse.json({ cursor: nextCursor, keys: [] });
    }

    const pipeline = client.pipeline();
    for (const key of foundKeys) {
      pipeline.type(key);
      pipeline.ttl(key);
    }
    const results = await pipeline.exec();

    const keys = foundKeys.map((key, i) => {
      const type = results?.[i * 2]?.[1] as string;
      const ttl = results?.[i * 2 + 1]?.[1] as number;
      return { key, type, ttl };
    });

    return NextResponse.json({ cursor: nextCursor, keys });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
