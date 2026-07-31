/** Preset palette for category chips — distinct, readable on light backgrounds. */
export const CATEGORY_COLOR_PRESETS = [
  '#C9A457',
  '#B88E3A',
  '#E7D3A2',
  '#3CB371',
  '#2E8B57',
  '#14B8A6',
  '#0D9488',
  '#3A86FF',
  '#2563EB',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#EC4899',
  '#DB2777',
  '#E74C3C',
  '#DC2626',
  '#F39C12',
  '#F97316',
  '#84CC16',
  '#65A30D',
  '#64748B',
  '#475569',
  '#78716C',
  '#57534E',
] as const;

export function normalizeCategoryColor(value: string): string {
  return value.trim().toUpperCase();
}

export function isCategoryColorPreset(value: string): boolean {
  const normalized = normalizeCategoryColor(value);
  return CATEGORY_COLOR_PRESETS.some((preset) => preset.toUpperCase() === normalized);
}
