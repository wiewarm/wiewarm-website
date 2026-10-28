'use client';

import { useEffect, useState } from 'react';

import { defaultDesign, designs, designStorageKey, isDesignValue, type DesignValue } from '@/lib/designs';

function applyDesign(design: DesignValue) {
  document.documentElement.dataset.design = design;
}

export function DesignSelector() {
  const [design, setDesign] = useState<DesignValue>(defaultDesign);

  useEffect(() => {
    const selected = document.documentElement.dataset.design ?? null;
    if (isDesignValue(selected)) setDesign(selected);
  }, []);

  return <label className="design-selector" htmlFor="design-selector">
    <span>Design</span>
    <select id="design-selector" value={design} onChange={(event) => {
      const nextDesign = event.target.value as DesignValue;
      setDesign(nextDesign);
      try { localStorage.setItem(designStorageKey, nextDesign); } catch { /* The skin also works without browser storage. */ }
      applyDesign(nextDesign);
    }}>
      {designs.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
}
