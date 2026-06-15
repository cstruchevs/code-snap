import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '@/server/trpc';

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from('profiles')
      .select('*')
      .eq('id', ctx.user.id)
      .single();

    if (error || !data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Profile not found' });

    return data;
  }),

  mySnippets: protectedProcedure.query(async ({ ctx }) => {
    // RLS automatically filters to only this user's snippets (public + private)
    const { data, error } = await ctx.supabase
      .from('snippets')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false });

    if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

    return data ?? [];
  }),
});
