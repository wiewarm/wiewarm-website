import { describe, expect, it } from 'vitest';
import { formatTemperature } from '@/lib/format-temperature';

describe('formatTemperature', () => {
  it('formats temperatures with one decimal, a space, and Celsius', () => {
    expect(formatTemperature(8.6)).toBe('8.6 °C');
    expect(formatTemperature(20)).toBe('20.0 °C');
    expect(formatTemperature(-1.25)).toBe('-1.3 °C');
  });

  it('returns a dash when no finite temperature is available', () => {
    expect(formatTemperature(null)).toBe('–');
    expect(formatTemperature(undefined)).toBe('–');
    expect(formatTemperature(Number.NaN)).toBe('–');
  });
});
