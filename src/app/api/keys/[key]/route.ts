import { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

export const runtime = "nodejs";

const MAX_ELEMENTS = 1000;

async function readValue(client: ReturnType<typeof getRedisClient>, key: string, type: string) {
  switch (type) {
    case "string":
      return client.get(key);
    case "hash": {
      const entries = await client.hgetall(key);
      return Object.entries(entries).slice(0, MAX_ELEMENTS);
    }
    case "list":
      return client.lrange(key, 0, MAX_ELEMENTS - 1);
    case "set":
      return client.smembers(key).then((m) => m.slice(0, MAX_ELEMENTS));
    case "zset": {
      const raw = await client.zrange(key, "0", String(MAX_ELEMENTS - 1), "WITHSCORES");
      const members: { member: string; score: string }[] = [];
      for (let i = 0; i < raw.length; i += 2) {
        members.push({ member: raw[i], score: raw[i + 1] });
      }
      return members;
    }
    case "stream": {
      const entries = await client.xrange(key, "-", "+", "COUNT", MAX_ELEMENTS);
      return entries;
    }
    default:
      return null;
  }
}

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  try {
    const client = getRedisClient();
    const type = await client.type(key);
    if (type === "none") {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }
    const [ttl, value] = await Promise.all([client.ttl(key), readValue(client, key, type)]);
    return NextResponse.json({ key, type, ttl, value });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  const body = await request.json();
  try {
    const client = getRedisClient();
    const type = await client.type(key);

    if (body.value !== undefined) {
      if (type !== "string" && type !== "none") {
        return NextResponse.json({ error: `Editing raw value is only supported for string keys (this key is ${type})` }, { status: 400 });
      }
      await client.set(key, String(body.value));
    }

    if (body.ttl !== undefined) {
      const ttl = Number(body.ttl);
      if (ttl === -1) {
        await client.persist(key);
      } else if (ttl > 0) {
        await client.expire(key, ttl);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  try {
    const client = getRedisClient();
    const deleted = await client.del(key);
    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
