import { describe, expect, it } from 'vitest';
import { passwordStrength } from '@/lib/password-strength';

describe('passwordStrength', () => {
  it('returns null for an empty password', () => {
    expect(passwordStrength('')).toBeNull();
  });

  it('rates short, repetitive, sequential and common passwords as very weak', () => {
    for (const value of ['1234', '0000', 'aaaaaaaaaa', 'abcdefgh', '87654321', 'Passwort1', 'wiewarm']) {
      expect(passwordStrength(value)?.level, value).toBe(0);
    }
  });

  it('caps passwords under 8 characters at weak, even when varied', () => {
    expect(passwordStrength('aB3$xY')?.level).toBeLessThanOrEqual(1);
  });

  it('rates longer and more varied passwords higher', () => {
    expect(passwordStrength('kuhglocke')?.level).toBe(1);
    expect(passwordStrength('Seerose42')?.level).toBe(2);
    expect(passwordStrength('Seerose42!Ufer')?.level).toBeGreaterThanOrEqual(3);
    expect(passwordStrength('rot-blau-gelb-gruen-braun')?.level).toBe(4);
  });
});
