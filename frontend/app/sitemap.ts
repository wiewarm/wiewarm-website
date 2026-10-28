import type { MetadataRoute } from 'next';
import { getSwimmingLocationReferences } from '@/lib/wiewarm-api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://wiewarm.ch';
  try {
    const references = await getSwimmingLocationReferences();
    const unique = new Map(references.map((reference) => [reference.badid, reference.badidText]));
    return [
      { url: base, lastModified: new Date(), changeFrequency: 'hourly', priority: 1 },
      ...[...unique.values()].map((identifier) => ({ url: `${base}/bad/${encodeURIComponent(identifier)}`, changeFrequency: 'daily' as const, priority: 0.7 })),
    ];
  } catch (error) {
    console.error('Could not build swimming location sitemap', error);
    return [{ url: base, changeFrequency: 'hourly', priority: 1 }];
  }
}
