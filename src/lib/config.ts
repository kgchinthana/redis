import fs from "fs";
import path from "path";

export interface RedisConnectionConfig {
  host: string;
  port: number;
  password: string;
  tls: boolean;
  db: number;
}

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "connection.json");

function defaultConfig(): RedisConnectionConfig {
  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || "",
    tls: false,
    db: 0,
  };
}

export function getConnectionConfig(): RedisConnectionConfig {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...defaultConfig(), ...parsed };
  } catch {
    return defaultConfig();
  }
}

export function saveConnectionConfig(config: RedisConnectionConfig): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function saveDb(db: number): void {
  const current = getConnectionConfig();
  saveConnectionConfig({ ...current, db });
}
