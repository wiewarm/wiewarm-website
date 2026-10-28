import { permanentRedirect } from 'next/navigation';

type Params = Record<string, string | string[] | undefined>;

export default async function LegacyIndex({ searchParams }: { searchParams?: Promise<Params> }) {
  const params = (await searchParams) ?? {};
  const raw = Array.isArray(params.search) ? params.search[0] : params.search;
  permanentRedirect(raw ? `/?q=${encodeURIComponent(raw)}` : '/');
}
