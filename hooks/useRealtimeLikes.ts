'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useRealtimeLikes(snippetId: string, initialCount: number) {
  const [likesCount, setLikesCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`snippet-likes:${snippetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
          filter: `snippet_id=eq.${snippetId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLikesCount((prev) => prev + 1);
          }
          if (payload.eventType === 'DELETE') {
            setLikesCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [snippetId]);

  return { likesCount, setLikesCount };
}
