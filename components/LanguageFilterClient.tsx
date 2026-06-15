'use client';

import { useRouter } from 'next/navigation';
import { SUPPORTED_LANGUAGES } from '@/lib/shiki';

export function LanguageFilterClient({ current }: { current?: string }) {
  const router = useRouter();

  return (
    <select
      value={current ?? ''}
      onChange={(e) => {
        const val = e.target.value;
        router.push(val ? `/?lang=${val}` : '/');
      }}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:outline-none"
    >
      <option value="">All languages</option>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang} value={lang}>
          {lang}
        </option>
      ))}
    </select>
  );
}
