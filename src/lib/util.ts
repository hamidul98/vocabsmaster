export const shuffle = <T,>(a: T[]): T[] => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

/** Deterministic pick for "Word of the day" (seed = YYYYMMDD). */
export const pickByDate = <T,>(items: T[], d = new Date()): T | undefined => {
  if (!items.length) return undefined;
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return items[seed % items.length];
};
