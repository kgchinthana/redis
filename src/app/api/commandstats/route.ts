import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";
import { parseRedisInfo } from "@/lib/parseInfo";

export const runtime = "nodejs";

export async function GET() {
  try {
    const client = getRedisClient();
    const raw = await client.info("commandstats");
    const parsed = parseRedisInfo(raw);
    const section = parsed["Commandstats"] || {};

    const stats = Object.entries(section).map(([key, value]) => {
      const command = key.replace(/^cmdstat_/, "");
      const fields: Record<string, string> = {};
      for (const part of value.split(",")) {
        const [k, v] = part.split("=");
        if (k && v !== undefined) fields[k] = v;
      }
      return {
        command,
        calls: Number(fields.calls || 0),
        usecPerCall: Number(fields.usec_per_call || 0),
        rejectedCalls: Number(fields.rejected_calls || 0),
        failedCalls: Number(fields.failed_calls || 0),
      };
    });

    stats.sort((a, b) => b.calls - a.calls);

    return NextResponse.json({ stats });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
