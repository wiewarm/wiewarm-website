'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const maxSuggestions = 8;
const normalize = (value: string) => value.toLocaleLowerCase('de-CH');

function findSuggestions(suggestions: string[], value: string): string[] {
  const query = normalize(value.trim());
  if (!query) return [];
  const prefix: string[] = [];
  const word: string[] = [];
  const inner: string[] = [];
  for (const suggestion of suggestions) {
    const text = normalize(suggestion);
    const index = text.indexOf(query);
    if (index === 0) prefix.push(suggestion);
    else if (index > 0 && /[\s\-/(]/.test(text[index - 1])) word.push(suggestion);
    else if (index > 0) inner.push(suggestion);
  }
  return [...prefix, ...word, ...inner].slice(0, maxSuggestions);
}

export function SearchAutocomplete({ suggestions, defaultValue, placeholder }: { suggestions: string[]; defaultValue: string; placeholder: string }) {
  const id = useId();
  const listId = `${id}-list`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const matches = useMemo(() => findSuggestions(suggestions, value), [suggestions, value]);
  const expanded = open && matches.length > 0 && !(matches.length === 1 && matches[0] === value);

  const select = (suggestion: string) => {
    const input = rootRef.current?.querySelector('input');
    setValue(suggestion);
    setOpen(false);
    if (input) {
      input.value = suggestion;
      input.form?.requestSubmit();
    }
  };

  return <div className="search-field" ref={rootRef}>
    <label className="sr-only" htmlFor={`${id}-input`}>Alle Felder durchsuchen</label>
    <Search aria-hidden="true" />
    <Input
      id={`${id}-input`} name="q" type="search" role="combobox" value={value} placeholder={placeholder}
      autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} enterKeyHint="search"
      aria-autocomplete="list" aria-expanded={expanded} aria-controls={listId} aria-activedescendant={expanded && active >= 0 ? `${id}-option-${active}` : undefined}
      onChange={(event) => { setValue(event.target.value); setOpen(true); setActive(-1); }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { setOpen(false); setActive(-1); return; }
        if (!expanded) return;
        if (event.key === 'ArrowDown') { event.preventDefault(); setActive((active + 1) % matches.length); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((active - 1 + matches.length) % matches.length); }
        else if (event.key === 'Enter' && active >= 0) { event.preventDefault(); select(matches[active]); }
      }}
    />
    <ul id={listId} role="listbox" className="search-suggestions" hidden={!expanded} onMouseDown={(event) => event.preventDefault()}>
      {matches.map((suggestion, index) => <li key={suggestion} id={`${id}-option-${index}`} role="option" aria-selected={index === active} onClick={() => select(suggestion)}>
        {suggestion}
      </li>)}
    </ul>
  </div>;
}
