import { permanentRedirect } from 'next/navigation';

export default function LegacyStart() {
  permanentRedirect('/');
}
