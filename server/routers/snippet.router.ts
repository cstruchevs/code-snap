import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '@/server/trpc';

export const SUPPORTED_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'rust',
  'go',
  'sql',
  'bash',
  'json',
  'css',
  'html',
] as const;

const CreateSnippetSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  code: z.string().min(1).max(50000),
  language: z.enum(SUPPORTED_LANGUAGES),
  isPublic: z.boolean().default(true),
});

export const snippetRouter = router({
  list: publicProcedure
    .input(
      z.object({
        language: z.string().optional(),
        cursor: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.supabase
        .from('snippets')
        .select('*, profiles(username, avatar_url)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(input.limit + 1);

      if (input.language) {
        query = query.eq('language', input.language);
      }

      if (input.cursor) {
        const { data: cursorRow } = await ctx.supabase
          .from('snippets')
          .select('created_at')
          .eq('id', input.cursor)
          .single();

        if (cursorRow) {
          query = query.lt('created_at', cursorRow.created_at);
        }
      }

      const { data, error } = await query;

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      const items = data ?? [];
      const hasMore = items.length > input.limit;
      if (hasMore) items.pop();

      return {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('snippets')
        .select('*, profiles(username, avatar_url, github_url)')
        .eq('id', input.id)
        .single();

      if (error || !data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Snippet not found' });

      // fire-and-forget view increment (SECURITY DEFINER bypasses RLS)
      ctx.supabase.rpc('increment_views', { snippet_id: input.id }).then(() => {});

      // check if current user has liked this snippet
      let liked = false;
      if (ctx.user) {
        const { data: like } = await ctx.supabase
          .from('likes')
          .select('id')
          .eq('snippet_id', input.id)
          .eq('user_id', ctx.user.id)
          .maybeSingle();
        liked = !!like;
      }

      return { ...data, liked };
    }),

  create: protectedProcedure
    .input(CreateSnippetSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('snippets')
        .insert({
          title: input.title,
          description: input.description ?? null,
          code: input.code,
          language: input.language,
          is_public: input.isPublic,
          user_id: ctx.user.id,
        })
        .select()
        .single();

      if (error || !data) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed to create snippet' });
      }

      return data;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error, count } = await ctx.supabase
        .from('snippets')
        .delete({ count: 'exact' })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      if (!count || count === 0) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your snippet' });

      return { success: true };
    }),

  toggleLike: protectedProcedure
    .input(z.object({ snippetId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: existing } = await ctx.supabase
        .from('likes')
        .select('id')
        .eq('snippet_id', input.snippetId)
        .eq('user_id', ctx.user.id)
        .maybeSingle();

      const { data: snippet } = await ctx.supabase
        .from('snippets')
        .select('likes_count')
        .eq('id', input.snippetId)
        .single();

      if (!snippet) throw new TRPCError({ code: 'NOT_FOUND' });

      if (existing) {
        await ctx.supabase.from('likes').delete().eq('id', existing.id);
        await ctx.supabase
          .from('snippets')
          .update({ likes_count: Math.max(0, snippet.likes_count - 1) })
          .eq('id', input.snippetId);
        return { liked: false, likesCount: Math.max(0, snippet.likes_count - 1) };
      } else {
        await ctx.supabase.from('likes').insert({ snippet_id: input.snippetId, user_id: ctx.user.id });
        await ctx.supabase
          .from('snippets')
          .update({ likes_count: snippet.likes_count + 1 })
          .eq('id', input.snippetId);
        return { liked: true, likesCount: snippet.likes_count + 1 };
      }
    }),

  explainCode: protectedProcedure
    .input(z.object({ snippetId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: snippet } = await ctx.supabase
        .from('snippets')
        .select('code, language, ai_explanation, ai_explained_at')
        .eq('id', input.snippetId)
        .single();

      if (!snippet) throw new TRPCError({ code: 'NOT_FOUND' });

      // return cached explanation if < 24h old
      if (snippet.ai_explanation && snippet.ai_explained_at) {
        const age = Date.now() - new Date(snippet.ai_explained_at).getTime();
        if (age < 24 * 60 * 60 * 1000) {
          return { explanation: snippet.ai_explanation, cached: true };
        }
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/explain-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EDGE_FUNCTION_SECRET}`,
          },
          body: JSON.stringify({ code: snippet.code, language: snippet.language }),
        }
      );

      if (!response.ok) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'AI service error' });

      const explanation = await response.text();

      await ctx.supabase
        .from('snippets')
        .update({ ai_explanation: explanation, ai_explained_at: new Date().toISOString() })
        .eq('id', input.snippetId);

      return { explanation, cached: false };
    }),
});
