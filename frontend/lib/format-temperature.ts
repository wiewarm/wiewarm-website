/** Formats every user-facing temperature consistently. */
export function formatTemperature(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '–';
  return `${value.toFixed(1)} °C`;
}
