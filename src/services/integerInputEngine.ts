export type PositiveIntegerInputOptions = {
  defaultValue: number
  min?: number
  max?: number
}

export function normalizePositiveIntegerInput(
  rawValue: string | number,
  {
    defaultValue,
    min = 1,
    max = Number.MAX_SAFE_INTEGER,
  }: PositiveIntegerInputOptions,
) {
  const numericValue =
    typeof rawValue === 'string' &&
    rawValue.trim() === ''
      ? defaultValue
      : Number(rawValue)
  const safeValue = Number.isFinite(numericValue)
    ? Math.trunc(numericValue)
    : defaultValue

  return Math.min(max, Math.max(min, safeValue))
}
