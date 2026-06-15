'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useRealtimeViewers(snippetId: string) {
  const [viewersCount, setViewersCount] = useState(1);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`snippet-viewers:${snippetId}`, {
        config: { presence: { key: crypto.randomUUID() } },
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setViewersCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [snippetId]);

  return viewersCount;
}
