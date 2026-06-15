import { Suspense } from 'react';
import Link from 'next/link';
import { createServerCaller } from '@/lib/trpc/server';
import { SnippetCard } from '@/components/SnippetCard';
import { LanguageFilterClient } from '@/components/LanguageFilterClient';

interface HomeProps {
  searchParams: Promise<{ lang?: string }>;
}

export default async function HomePage({ searchParams }: HomeProps) {
  const { lang } = await searchParams;
  const trpc = await createServerCaller();
  const { items: snippets } = await trpc.snippet.list({ language: lang, limit: 20 });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Share code,{' '}
          <span className="bg-linear-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
            instantly
          </span>
        </h1>
        <p className="mt-3 text-slate-500">
          Paste your code, get a link. Syntax highlighting, live likes, AI explanations.
        </p>
        <Link
          href="/create"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-700 transition-colors"
        >
          + New snippet
        </Link>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">
          {lang ? (
            <span>
              Filtered by <span className="rounded-md bg-slate-200 px-2 py-0.5 font-mono text-xs">{lang}</span>
            </span>
          ) : (
            'All snippets'
          )}
        </p>
        <Suspense>
          <LanguageFilterClient current={lang} />
        </Suspense>
      </div>

      {/* Grid */}
      {snippets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 py-28 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">✂️</div>
          <p className="mt-4 text-base font-medium text-slate-700">No snippets yet</p>
          <p className="mt-1 text-sm text-slate-400">Be the first to share some code!</p>
          <Link
            href="/create"
            className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Create snippet
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {snippets.map((snippet) => (
            <SnippetCard
              key={snippet.id}
              snippet={snippet as unknown as Parameters<typeof SnippetCard>[0]['snippet']}
            />
          ))}
        </div>
      )}
    </div>
  );
}
