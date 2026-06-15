'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useUser } from '@/hooks/useUser';

type Provider = 'claude' | 'grok';

interface AiExplanationProps {
  snippetId: string;
  provider: Provider;
  initialExplanation?: string | null;
  initialExplainedAt?: string | null;
}

const CONFIG: Record<Provider, {
  label: string;
  buttonLabel: string;
  icon: () => React.ReactElement;
  bg: string;
  border: string;
  title: string;
  titleColor: string;
  bodyColor: string;
  badgeBg: string;
  badgeText: string;
  btnBg: string;
  btnHover: string;
  regenColor: string;
}> = {
  claude: {
    label: 'Explain with Claude',
    buttonLabel: '✨ Explain with Claude',
    icon: ClaudeIcon,
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    title: 'Claude Explanation',
    titleColor: 'text-purple-800',
    bodyColor: 'text-purple-900',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-600',
    btnBg: 'bg-purple-600',
    btnHover: 'hover:bg-purple-700',
    regenColor: 'text-purple-500 hover:text-purple-700',
  },
  grok: {
    label: 'Explain with Grok',
    buttonLabel: '⚡ Explain with Grok',
    icon: GrokIcon,
    bg: 'bg-slate-900',
    border: 'border-slate-700',
    title: 'Grok Explanation',
    titleColor: 'text-slate-100',
    bodyColor: 'text-slate-300',
    badgeBg: 'bg-slate-700',
    badgeText: 'text-slate-300',
    btnBg: 'bg-white/10',
    btnHover: 'hover:bg-white/20',
    regenColor: 'text-slate-400 hover:text-slate-200',
  },
};

export function AiExplanation({ snippetId, provider, initialExplanation, initialExplainedAt }: AiExplanationProps) {
  const { user } = useUser();
  const [explanation, setExplanation] = useState(initialExplanation ?? null);
  const [explainedAt] = useState(initialExplainedAt ?? null);
  const cfg = CONFIG[provider];

  const isCached = useMemo(
    () =>
      !!explanation &&
      !!explainedAt &&
      new Date(explainedAt).getTime() > Date.now() - 24 * 60 * 60 * 1000,
    [explanation, explainedAt]
  );

  const explain = trpc.snippet.explainCode.useMutation({
    onSuccess: (data) => setExplanation(data.explanation),
  });

  const Icon = cfg.icon;

  if (!user) {
    return (
      <div className={`rounded-xl border ${cfg.border} ${cfg.bg} px-4 py-3`}>
        <div className="flex items-center gap-2">
          <Icon />
          <span className={`text-sm font-medium ${cfg.titleColor}`}>{cfg.title}</span>
        </div>
        <p className={`mt-2 text-sm ${cfg.bodyColor} opacity-60 italic`}>
          Sign in to get an AI explanation.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon />
          <span className={`text-sm font-medium ${cfg.titleColor}`}>{cfg.title}</span>
          {isCached && (
            <span className={`rounded-full ${cfg.badgeBg} ${cfg.badgeText} px-2 py-0.5 text-xs`}>
              cached
            </span>
          )}
        </div>
        {!explanation && (
          <button
            onClick={() => explain.mutate({ snippetId, provider })}
            disabled={explain.isPending}
            className={`flex items-center gap-1.5 rounded-lg ${cfg.btnBg} ${cfg.btnHover} border ${cfg.border} px-3 py-1.5 text-xs font-medium ${cfg.titleColor} transition-colors disabled:opacity-60`}
          >
            {explain.isPending ? <LoadingDots /> : cfg.buttonLabel}
          </button>
        )}
      </div>

      {explanation ? (
        <p className={`text-sm leading-relaxed ${cfg.bodyColor}`}>{explanation}</p>
      ) : explain.isPending ? (
        <div className={`flex items-center gap-2 text-sm ${cfg.bodyColor} opacity-70`}>
          <LoadingDots />
          <span>Thinking...</span>
        </div>
      ) : explain.isError ? (
        <p className="text-sm text-red-400">Failed to get explanation. Try again.</p>
      ) : (
        <p className={`text-sm ${cfg.bodyColor} opacity-50 italic`}>
          Click the button to get an AI-powered explanation.
        </p>
      )}

      {explanation && (
        <button
          onClick={() => explain.mutate({ snippetId, provider })}
          disabled={explain.isPending}
          className={`mt-3 text-xs ${cfg.regenColor} transition-colors disabled:opacity-60`}
        >
          {explain.isPending ? 'Regenerating...' : '↺ Regenerate'}
        </button>
      )}
    </div>
  );
}

function ClaudeIcon() {
  return (
    <svg className="h-4 w-4 text-purple-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function GrokIcon() {
  return (
    <svg className="h-4 w-4 text-slate-300 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.357 3.867C12.946 3.318 12.29 3 11.59 3H4.667C3.747 3 3 3.746 3 4.667v14.666C3 20.253 3.747 21 4.667 21H19.333C20.253 21 21 20.253 21 19.333V10.41c0-.7-.318-1.356-.867-1.767l-6.776-4.776ZM11.59 5l6.776 4.776.134.224H6.5a.5.5 0 0 1-.5-.5V6.667C6 5.747 6.747 5 7.667 5H11.59ZM5 19.333V11.5h13v7.833a.333.333 0 0 1-.333.334H5.333A.333.333 0 0 1 5 19.333Z" />
    </svg>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1 w-1 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
