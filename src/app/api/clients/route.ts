import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

export const runtime = "nodejs";

function parseClientList(raw: string): Record<string, string>[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const fields: Record<string, string> = {};
      for (const token of line.split(" ")) {
        const idx = token.indexOf("=");
        if (idx === -1) continue;
        fields[token.slice(0, idx)] = token.slice(idx + 1);
      }
      return fields;
    });
}

export async function GET() {
  try {
    const client = getRedisClient();
    const raw = (await client.call("CLIENT", "LIST")) as string;
    return NextResponse.json({ clients: parseClientList(raw) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }
  try {
    const client = getRedisClient();
    await client.call("CLIENT", "KILL", "ID", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
