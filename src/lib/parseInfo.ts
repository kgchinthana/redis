export type RedisInfo = Record<string, Record<string, string>>;

export function parseRedisInfo(raw: string): RedisInfo {
  const sections: RedisInfo = {};
  let currentSection = "default";

  for (const line of raw.split("\r\n")) {
    if (!line || line.startsWith("#")) {
      const match = line.match(/^# (.+)/);
      if (match) currentSection = match[1].trim();
      continue;
    }
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx);
    const value = line.slice(idx + 1);
    if (!sections[currentSection]) sections[currentSection] = {};
    sections[currentSection][key] = value;
  }

  return sections;
}
