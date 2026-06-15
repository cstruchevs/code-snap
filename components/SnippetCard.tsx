import Link from 'next/link';
import { highlightCode } from '@/lib/shiki';

interface SnippetCardProps {
  snippet: {
    id: string;
    title: string;
    description: string | null;
    code: string;
    language: string;
    likes_count: number;
    views_count: number;
    created_at: string | null;
    profiles: { username: string; avatar_url: string | null } | null;
  };
}

const LANG_COLORS: Record<string, string> = {
  typescript:  'bg-blue-50 text-blue-700 ring-blue-100',
  javascript:  'bg-yellow-50 text-yellow-700 ring-yellow-100',
  python:      'bg-green-50 text-green-700 ring-green-100',
  rust:        'bg-orange-50 text-orange-700 ring-orange-100',
  go:          'bg-cyan-50 text-cyan-700 ring-cyan-100',
  sql:         'bg-purple-50 text-purple-700 ring-purple-100',
  bash:        'bg-slate-50 text-slate-700 ring-slate-100',
  json:        'bg-rose-50 text-rose-700 ring-rose-100',
  css:         'bg-pink-50 text-pink-700 ring-pink-100',
  html:        'bg-red-50 text-red-700 ring-red-100',
  markdown:    'bg-slate-50 text-slate-700 ring-slate-100',
};

export async function SnippetCard({ snippet }: SnippetCardProps) {
  const preview = snippet.code.split('\n').slice(0, 7).join('\n');
  const highlightedPreview = await highlightCode(preview, snippet.language);
  const langColor = LANG_COLORS[snippet.language] ?? 'bg-slate-50 text-slate-700 ring-slate-100';
  const timeAgo = getTimeAgo(snippet.created_at);

  return (
    <Link
      href={`/s/${snippet.id}`}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-900 group-hover:text-violet-600 transition-colors">
            {snippet.title}
          </h2>
          {snippet.description && (
            <p className="mt-0.5 truncate text-xs text-slate-400">{snippet.description}</p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${langColor}`}>
          {snippet.language}
        </span>
      </div>

      {/* Code preview */}
      <div
        className="mx-3 mb-3 overflow-hidden rounded-lg text-xs [&>pre]:bg-[#0d1117]! [&>pre]:p-3 [&>pre]:overflow-hidden [&>pre]:max-h-28 [&>pre]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: highlightedPreview }}
      />

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          {snippet.profiles?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={snippet.profiles.avatar_url} alt="" className="h-4 w-4 rounded-full" />
          ) : (
            <div className="h-4 w-4 rounded-full bg-slate-200" />
          )}
          <span className="font-medium text-slate-500">{snippet.profiles?.username ?? 'anonymous'}</span>
          <span>·</span>
          <span>{timeAgo}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>♥ {snippet.likes_count}</span>
          <span>👁 {snippet.views_count}</span>
        </div>
      </div>
    </Link>
  );
}

function getTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
