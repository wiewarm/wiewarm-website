'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

const cleanFonts = [
  { value: 'geist', label: 'Geist' },
  { value: 'manrope', label: 'Manrope' },
  { value: 'dm-sans', label: 'DM Sans' },
  { value: 'ibm-plex-sans', label: 'IBM Plex Sans' },
  { value: 'nunito-sans', label: 'Nunito Sans' },
] as const;

const expressiveFonts = [
  { value: 'space-grotesk', label: 'Space Grotesk' },
  { value: 'bricolage-grotesque', label: 'Bricolage Grotesque' },
  { value: 'syne', label: 'Syne' },
  { value: 'unbounded', label: 'Unbounded' },
  { value: 'fraunces', label: 'Fraunces' },
] as const;

const fonts = [...cleanFonts, ...expressiveFonts];

type FontValue = (typeof fonts)[number]['value'];
const fontStorageKey = 'wiewarm-font';
const selectorStorageKey = 'wiewarm-font-selector';
const subscribe = () => () => {};

function isFontValue(value: string | null): value is FontValue {
  return fonts.some((font) => font.value === value);
}

function applyFont(font: FontValue) {
  document.documentElement.dataset.font = font;
}

function isSelectorEnabled() {
  const mode = new URLSearchParams(window.location.search).get('fontselect');
  if (mode === 'true') return true;
  if (mode === 'false') return false;
  return sessionStorage.getItem(selectorStorageKey) === 'true';
}

export function FontSelector() {
  const enabled = useSyncExternalStore(subscribe, isSelectorEnabled, () => false);
  const [font, setFont] = useState<FontValue>(() => {
    if (typeof window === 'undefined') return 'geist';
    const storedFont = localStorage.getItem(fontStorageKey);
    return isFontValue(storedFont) ? storedFont : 'geist';
  });

  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get('fontselect');
    if (mode === 'true') sessionStorage.setItem(selectorStorageKey, 'true');
    if (mode === 'false') sessionStorage.removeItem(selectorStorageKey);
    applyFont(font);
  }, [font]);

  if (!enabled) return null;

  return <label className="font-selector" htmlFor="font-selector">
    <span>Schrift</span>
    <select id="font-selector" value={font} onChange={(event) => {
      const nextFont = event.target.value as FontValue;
      setFont(nextFont);
      localStorage.setItem(fontStorageKey, nextFont);
      applyFont(nextFont);
    }}>
      <optgroup label="Clean">
        {cleanFonts.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </optgroup>
      <optgroup label="Wilder">
        {expressiveFonts.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </optgroup>
    </select>
  </label>;
}
