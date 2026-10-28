export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  level: StrengthLevel;
  label: string;
  hint: string;
}

const LABELS = ['Sehr schwach', 'Schwach', 'Mittel', 'Stark', 'Sehr stark'] as const;

const COMMON = ['password', 'passwort', 'wiewarm', 'badi', 'bademeister', 'badmeister', 'sommer', 'schwimmen', 'qwertz', 'qwerty', 'admin', 'geheim', 'hallo', 'test'];

function isSequence(value: string): boolean {
  if (value.length < 4) return false;
  const codes = Array.from(value, (char) => char.charCodeAt(0));
  const step = codes[1] - codes[0];
  return (step === 1 || step === -1) && codes.every((code, index) => index === 0 || code - codes[index - 1] === step);
}

function isWeakPattern(value: string): boolean {
  const lower = value.toLowerCase();
  if (new Set(lower).size === 1) return true;
  if (isSequence(lower)) return true;
  // A common word, optionally followed by a few digits or one symbol, adds almost nothing.
  return COMMON.some((word) => lower.startsWith(word) && /^\d{0,4}[^a-z\d]?$/.test(lower.slice(word.length)));
}

function entropyBits(value: string): number {
  let pool = 0;
  if (/[a-zäöüß]/.test(value)) pool += 26;
  if (/[A-ZÄÖÜ]/.test(value)) pool += 26;
  if (/\d/.test(value)) pool += 10;
  if (/[^a-zA-ZäöüÄÖÜß\d]/.test(value)) pool += 33;
  const chars = Array.from(value);
  const distinct = new Set(chars).size;
  // Repeated characters add much less than new ones.
  const effectiveLength = distinct + (chars.length - distinct) * 0.25;
  return effectiveLength * Math.log2(Math.max(pool, 2));
}

export function passwordStrength(value: string): PasswordStrength | null {
  if (!value) return null;

  let level: StrengthLevel;
  if (isWeakPattern(value)) {
    level = 0;
  } else {
    const bits = entropyBits(value);
    level = bits < 28 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
    if (value.length < 8) level = Math.min(level, 1) as StrengthLevel;
  }

  const hint = level >= 3
    ? 'Gut gewählt.'
    : value.length < 8
      ? 'Verwende mindestens 8 Zeichen.'
      : 'Mische Grossbuchstaben, Kleinbuchstaben, Ziffern und Sonderzeichen oder wähle ein längeres Passwort.';

  return { level, label: LABELS[level], hint };
}
