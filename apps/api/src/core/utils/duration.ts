const UNITS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** Parse a duration string such as "15m", "8h", "7d" into milliseconds. */
export function parseDuration(input: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/.exec(input.trim());
  if (!match) throw new Error(`Invalid duration: "${input}"`);
  const amount = Number(match[1]);
  const unit = UNITS[match[2] as string];
  if (unit === undefined) throw new Error(`Invalid duration unit in "${input}"`);
  return amount * unit;
}

/** Now + duration, as a Date. */
export function fromNow(duration: string): Date {
  return new Date(Date.now() + parseDuration(duration));
}
