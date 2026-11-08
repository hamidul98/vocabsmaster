/** Focus colours a learner can tag a word with (one per word). */
export const MARK_COLORS = [
  { key: 'red', label: 'Red', hex: '#ef4444' },
  { key: 'orange', label: 'Orange', hex: '#f97316' },
  { key: 'yellow', label: 'Yellow', hex: '#eab308' },
  { key: 'green', label: 'Green', hex: '#22c55e' },
  { key: 'blue', label: 'Blue', hex: '#3b82f6' },
  { key: 'purple', label: 'Purple', hex: '#a855f7' },
] as const;

export type MarkColor = (typeof MARK_COLORS)[number]['key'];

export const colorHex = (c?: MarkColor) => MARK_COLORS.find((m) => m.key === c)?.hex;
export const colorLabel = (c?: MarkColor) => MARK_COLORS.find((m) => m.key === c)?.label;
