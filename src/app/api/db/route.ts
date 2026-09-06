import { NextResponse } from "next/server";
import { saveDb } from "@/lib/config";
import { resetRedisClient } from "@/lib/redis";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const db = Number(body.db);
  if (!Number.isInteger(db) || db < 0 || db > 15) {
    return NextResponse.json({ error: "db must be an integer between 0 and 15" }, { status: 400 });
  }
  saveDb(db);
  resetRedisClient();
  return NextResponse.json({ ok: true, db });
}
