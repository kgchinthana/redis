import Redis from "ioredis";
import { getConnectionConfig, type RedisConnectionConfig } from "./config";

declare global {
  var __redisClient: Redis | undefined;
  var __redisConfigKey: string | undefined;
}

function configKey(config: RedisConnectionConfig): string {
  return `${config.host}:${config.port}:${config.password}:${config.tls}:${config.db}`;
}

export function getRedisClient(): Redis {
  const config = getConnectionConfig();
  const key = configKey(config);

  if (global.__redisClient && global.__redisConfigKey === key) {
    return global.__redisClient;
  }

  if (global.__redisClient) {
    global.__redisClient.disconnect();
  }

  const client = new Redis({
    host: config.host,
    port: config.port,
    password: config.password || undefined,
    tls: config.tls ? {} : undefined,
    db: config.db,
    lazyConnect: false,
    maxRetriesPerRequest: 2,
    retryStrategy(times) {
      return Math.min(times * 200, 2000);
    },
  });

  client.on("error", (err) => {
    console.error("[redis] connection error:", err.message);
  });

  global.__redisClient = client;
  global.__redisConfigKey = key;
  return client;
}

export function resetRedisClient(): void {
  if (global.__redisClient) {
    global.__redisClient.disconnect();
    global.__redisClient = undefined;
    global.__redisConfigKey = undefined;
  }
}

export async function testConnection(config: RedisConnectionConfig): Promise<{ ok: boolean; error?: string }> {
  const client = new Redis({
    host: config.host,
    port: config.port,
    password: config.password || undefined,
    tls: config.tls ? {} : undefined,
    lazyConnect: true,
    connectTimeout: 3000,
    maxRetriesPerRequest: 1,
  });
  try {
    await client.connect();
    await client.ping();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    client.disconnect();
  }
}
