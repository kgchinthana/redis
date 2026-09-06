import { REDIS_COMMANDS, SUBCOMMANDS } from "./redisCommands";

export interface Suggestion {
  label: string;
  syntax: string;
}

function splitTokens(input: string) {
  const endsWithSpace = /\s$/.test(input);
  const trimmedLeading = input.replace(/^\s+/, "");
  const tokens = trimmedLeading.length ? trimmedLeading.split(/\s+/) : [];
  const currentIndex = endsWithSpace ? tokens.length : Math.max(tokens.length - 1, 0);
  const currentText = endsWithSpace ? "" : tokens[tokens.length - 1] || "";
  return { tokens, currentIndex, currentText };
}

export function getSuggestions(input: string, limit = 8): Suggestion[] {
  if (!input.trim()) return [];
  const { tokens, currentIndex, currentText } = splitTokens(input);
  const prefix = currentText.toUpperCase();

  if (currentIndex === 0) {
    return REDIS_COMMANDS.filter((c) => c.name.startsWith(prefix))
      .slice(0, limit)
      .map((c) => ({ label: c.name, syntax: c.syntax }));
  }

  if (currentIndex === 1) {
    const subs = SUBCOMMANDS[tokens[0]?.toUpperCase()];
    if (!subs) return [];
    return subs
      .filter((s) => s.startsWith(prefix))
      .slice(0, limit)
      .map((s) => ({ label: s, syntax: `${tokens[0].toUpperCase()} ${s}` }));
  }

  return [];
}

export function applySuggestion(input: string, label: string): string {
  const { tokens, currentIndex } = splitTokens(input);
  const prefixTokens = tokens.slice(0, currentIndex);
  return [...prefixTokens, label].join(" ") + " ";
}
