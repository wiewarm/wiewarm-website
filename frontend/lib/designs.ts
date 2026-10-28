export const designs = [
  { value: 'sommerfrische', label: 'Sommerfrische' },
  { value: 'alpine-lake', label: 'Alpine Lake' },
  { value: 'swiss-lido', label: 'Swiss Lido' },
  { value: 'first-try', label: 'First Try' },
  { value: 'second-try', label: 'Second Try' },
  { value: 'summer-swim', label: 'Summer Swim' },
  { value: 'amiga', label: 'Amiga Chiptune' },
  { value: 'macos', label: 'Modern macOS' },
  { value: 'sixties', label: 'Vintage 60s' },
  { value: 'ms-dos', label: 'MS-DOS' },
  { value: 'goth', label: 'Goth' },
] as const;

export type DesignValue = (typeof designs)[number]['value'];
export const defaultDesign: DesignValue = 'alpine-lake';
// A new edition starts with the new design; subsequent choices still persist.
export const designStorageKey = 'wiewarm-design-v2';

export function isDesignValue(value: string | null): value is DesignValue {
  return designs.some((design) => design.value === value);
}

// Restore the selected skin before paint, including on server-rendered routes.
export const designBootstrap = `try{var d=localStorage.getItem(${JSON.stringify(designStorageKey)});if(${JSON.stringify(designs.map(({ value }) => value))}.includes(d))document.documentElement.dataset.design=d}catch{}`;
