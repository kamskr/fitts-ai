export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function optionalString(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function optionalNumber(value?: number | null) {
  return value === null || value === undefined || Number.isNaN(value)
    ? undefined
    : value;
}
