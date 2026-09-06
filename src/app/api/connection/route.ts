import { NextResponse } from "next/server";
import { getConnectionConfig, saveConnectionConfig } from "@/lib/config";
import { resetRedisClient, testConnection } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET() {
  const config = getConnectionConfig();
  return NextResponse.json({
    host: config.host,
    port: config.port,
    tls: config.tls,
    hasPassword: Boolean(config.password),
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const host = String(body.host || "127.0.0.1");
  const port = Number(body.port) || 6379;
  const tls = Boolean(body.tls);
  // Keep existing password if the client sends the "unchanged" sentinel or omits it.
  const existing = getConnectionConfig();
  const password = body.password === undefined || body.password === "__unchanged__" ? existing.password : String(body.password);

  const candidate = { host, port, password, tls };
  const result = await testConnection(candidate);
  if (!result.ok) {
    return NextResponse.json({ error: `Could not connect: ${result.error}` }, { status: 400 });
  }

  saveConnectionConfig(candidate);
  resetRedisClient();

  return NextResponse.json({ ok: true });
}
