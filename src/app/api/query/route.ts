import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";
import { tokenizeCommand } from "@/lib/tokenize";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const line = String(body.command || "").trim();

  if (!line) {
    return NextResponse.json({ error: "Command is empty" }, { status: 400 });
  }

  const tokens = tokenizeCommand(line);
  if (tokens.length === 0) {
    return NextResponse.json({ error: "Command is empty" }, { status: 400 });
  }

  const [command, ...args] = tokens;

  try {
    const client = getRedisClient();
    const start = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (client.call as any)(command, ...args);
    const durationMs = Date.now() - start;
    return NextResponse.json({ result, durationMs });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
