import { notFound } from 'next/navigation';
import { type Metadata } from 'next';
import Link from 'next/link';
import { createServerCaller } from '@/lib/trpc/server';
import { highlightCode } from '@/lib/shiki';
import { LikeButton } from '@/components/LikeButton';
import { CopyButton } from '@/components/CopyButton';
import { ViewersCount } from '@/components/ViewersCount';
import { AiExplanation } from '@/components/AiExplanation';

export const revalidate = 60;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { id } = await params;
    const trpc = await createServerCaller();
    const snippet = await trpc.snippet.getById({ id });
    return {
      title: snippet.title,
      description: snippet.description ?? `${snippet.language} code snippet`,
    };
  } catch {
    return { title: 'Snippet not found' };
  }
}

const LANG_COLORS: Record<string, string> = {
  typescript: 'bg-blue-50 text-blue-700 ring-blue-100',
  javascript: 'bg-yellow-50 text-yellow-700 ring-yellow-100',
  python:     'bg-green-50 text-green-700 ring-green-100',
  rust:       'bg-orange-50 text-orange-700 ring-orange-100',
  go:         'bg-cyan-50 text-cyan-700 ring-cyan-100',
  sql:        'bg-purple-50 text-purple-700 ring-purple-100',
  bash:       'bg-slate-50 text-slate-700 ring-slate-100',
  json:       'bg-rose-50 text-rose-700 ring-rose-100',
  css:        'bg-pink-50 text-pink-700 ring-pink-100',
  html:       'bg-red-50 text-red-700 ring-red-100',
  markdown:   'bg-slate-50 text-slate-700 ring-slate-100',
};

export default async function SnippetPage({ params }: Props) {
  const { id } = await params;
  const trpc = await createServerCaller();

  let snippet;
  try {
    snippet = await trpc.snippet.getById({ id });
  } catch {
    notFound();
  }

  const highlightedCode = await highlightCode(snippet.code, snippet.language);
  const profile = (snippet.profiles as unknown) as {
    username: string;
    avatar_url: string | null;
    github_url: string | null;
  } | null;

  const langColor = LANG_COLORS[snippet.language] ?? 'bg-slate-50 text-slate-700 ring-slate-100';

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
        <Link href="/" className="hover:text-slate-600">Browse</Link>
        <span>/</span>
        <span className="truncate text-slate-600">{snippet.title}</span>
      </div>

      {/* Title block */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-slate-900">{snippet.title}</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${langColor}`}>
            {snippet.language}
          </span>
        </div>
        {snippet.description && (
          <p className="mt-2 text-slate-500">{snippet.description}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          {profile && (
            <a
              href={profile.github_url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-medium text-slate-600 hover:text-slate-900"
            >
              {profile.avatar_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" className="h-5 w-5 rounded-full" />
              )}
              {profile.username}
            </a>
          )}
          <span>·</span>
          <span>{snippet.created_at ? new Date(snippet.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</span>
          <span>·</span>
          <span>{snippet.views_count} views</span>
          <ViewersCount snippetId={id} />
        </div>
      </div>

      {/* Code block */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0d1117] shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
              <div className="h-3 w-3 rounded-full bg-green-500/60" />
            </div>
            <span className="ml-1 text-xs text-slate-500">{snippet.language}</span>
          </div>
          <CopyButton code={snippet.code} />
        </div>
        <div
          className="overflow-auto p-4 text-sm leading-relaxed [&>pre]:bg-transparent! [&>pre]:p-0!"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </div>

      {/* Actions row */}
      <div className="mt-4 flex items-center gap-3">
        <LikeButton
          snippetId={id}
          initialCount={snippet.likes_count}
          initialLiked={snippet.liked}
        />
      </div>

      {/* AI Explanations */}
      <div className="mt-8 flex flex-col gap-4">
        <AiExplanation
          snippetId={id}
          provider="claude"
          initialExplanation={snippet.ai_explanation}
          initialExplainedAt={snippet.ai_explained_at}
        />
        <AiExplanation
          snippetId={id}
          provider="grok"
          initialExplanation={(snippet as unknown as Record<string, string | null>).grok_explanation ?? null}
          initialExplainedAt={(snippet as unknown as Record<string, string | null>).grok_explained_at ?? null}
        />
      </div>
    </div>
  );
}
