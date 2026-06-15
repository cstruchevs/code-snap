import { createCallerFactory } from '@/server/trpc';
import { appRouter } from '@/server/routers/_app';
import { createClient } from '@/lib/supabase/server';

const createCaller = createCallerFactory(appRouter);

export async function createServerCaller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return createCaller({ supabase, user });
}
