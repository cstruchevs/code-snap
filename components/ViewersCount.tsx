'use client';

import { useRealtimeViewers } from '@/hooks/useRealtimeViewers';

interface ViewersCountProps {
  snippetId: string;
}

export function ViewersCount({ snippetId }: ViewersCountProps) {
  const count = useRealtimeViewers(snippetId);

  if (count <= 1) return null;

  return (
    <span className="flex items-center gap-1 text-sm text-gray-500">
      <EyeIcon />
      {count} viewing now
    </span>
  );
}

function EyeIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
    </svg>
  );
}
