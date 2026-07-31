export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** POS touch targets — larger than Material minimums. */
export const touchTarget = {
  min: 48,
  comfortable: 56,
  pinKey: 72,
} as const;

/** Brand radius scale */
export const radii = {
  input: 12,
  button: 14,
  sm: 12,
  md: 14,
  card: 18,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;
