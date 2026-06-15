'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useRealtimeLikes } from '@/hooks/useRealtimeLikes';
import { useUser } from '@/hooks/useUser';

interface LikeButtonProps {
  snippetId: string;
  initialCount: number;
  initialLiked: boolean;
}

export function LikeButton({ snippetId, initialCount, initialLiked }: LikeButtonProps) {
  const { user } = useUser();
  const [liked, setLiked] = useState(initialLiked);
  const { likesCount, setLikesCount } = useRealtimeLikes(snippetId, initialCount);

  const utils = trpc.useUtils();
  const toggleLike = trpc.snippet.toggleLike.useMutation({
    onMutate: async () => {
      await utils.snippet.getById.cancel({ id: snippetId });
      const previous = utils.snippet.getById.getData({ id: snippetId });

      setLiked((prev) => !prev);
      setLikesCount((prev) => (liked ? Math.max(0, prev - 1) : prev + 1));

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        utils.snippet.getById.setData({ id: snippetId }, ctx.previous);
      }
      setLiked(initialLiked);
      setLikesCount(initialCount);
    },
    onSettled: () => {
      utils.snippet.getById.invalidate({ id: snippetId });
    },
  });

  const handleClick = () => {
    if (!user) return;
    toggleLike.mutate({ snippetId });
  };

  const isDisabled = !user || toggleLike.isPending;

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleClick}
        disabled={isDisabled}
        title={!user ? 'Sign in to like' : undefined}
        className={`
          flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium
          transition-all duration-150 select-none
          ${liked
            ? 'bg-pink-50 text-pink-600 hover:bg-pink-100'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }
          ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-95'}
        `}
      >
        <HeartIcon filled={liked} />
        <span>{likesCount}</span>
      </button>
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform duration-150 ${filled ? 'scale-110' : ''}`}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}
