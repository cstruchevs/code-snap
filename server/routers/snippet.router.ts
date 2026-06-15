import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '@/server/trpc';
import { uploadCodeFile, downloadCodeFile, deleteCodeFile } from '@/lib/supabase/storage';
import { SUPPORTED_LANGUAGES } from '@/lib/shiki';

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
        .select('*')
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
        if (cursorRow) query = query.lt('created_at', cursorRow.created_at);
      }

      const { data, error } = await query;
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });

      const items = data ?? [];
      const hasMore = items.length > input.limit;
      if (hasMore) items.pop();

      // fetch profiles for all snippets in one query
      const userIds = [...new Set(items.map((s) => s.user_id))];
      const { data: profiles } = await ctx.supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
      const itemsWithProfiles = items.map((s) => ({
        ...s,
        profiles: profileMap[s.user_id] ?? null,
      }));

      return {
        items: itemsWithProfiles,
        nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
      };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from('snippets')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error || !data) throw new TRPCError({ code: 'NOT_FOUND', message: 'Snippet not found' });

      // fire-and-forget view increment
      ctx.supabase.rpc('increment_views', { snippet_id: input.id }).then(() => {});

      // fetch profile separately
      const { data: profile } = await ctx.supabase
        .from('profiles')
        .select('username, avatar_url, github_url')
        .eq('id', data.user_id)
        .maybeSingle();

      // if code is stored in Storage, download it
      let code = data.code;
      if (data.storage_key) {
        code = await downloadCodeFile(ctx.supabase, data.storage_key);
      }

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

      return { ...data, code, liked, profiles: profile };
    }),

  create: protectedProcedure
    .input(CreateSnippetSchema)
    .mutation(async ({ ctx, input }) => {
      const CODE_SIZE_LIMIT = 50_000;
      let codeForDb = input.code;
      let storageKey: string | null = null;

      // store in Storage if code exceeds DB column limit
      if (Buffer.byteLength(input.code, 'utf8') > CODE_SIZE_LIMIT) {
        storageKey = await uploadCodeFile(ctx.supabase, ctx.user.id, input.code);
        codeForDb = '';
      }

      const { data, error } = await ctx.supabase
        .from('snippets')
        .insert({
          title: input.title,
          description: input.description ?? null,
          code: codeForDb,
          language: input.language,
          is_public: input.isPublic,
          user_id: ctx.user.id,
          storage_key: storageKey,
        })
        .select()
        .single();

      if (error || !data) {
        if (storageKey) await deleteCodeFile(ctx.supabase, storageKey);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error?.message ?? 'Failed to create snippet' });
      }

      return data;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: snippet } = await ctx.supabase
        .from('snippets')
        .select('storage_key')
        .eq('id', input.id)
        .eq('user_id', ctx.user.id)
        .maybeSingle();

      if (!snippet) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your snippet' });

      const { error, count } = await ctx.supabase
        .from('snippets')
        .delete({ count: 'exact' })
        .eq('id', input.id)
        .eq('user_id', ctx.user.id);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      if (!count || count === 0) throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your snippet' });

      if (snippet.storage_key) {
        await deleteCodeFile(ctx.supabase, snippet.storage_key);
      }

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
    .input(z.object({
      snippetId: z.string().uuid(),
      provider: z.enum(['claude', 'grok']).default('claude'),
    }))
    .mutation(async ({ ctx, input }) => {
      const { provider } = input;
      const explanationCol  = provider === 'grok' ? 'grok_explanation'  : 'ai_explanation';
      const explainedAtCol  = provider === 'grok' ? 'grok_explained_at' : 'ai_explained_at';

      const { data: snippet } = await ctx.supabase
        .from('snippets')
        .select(`code, storage_key, language, ai_explanation, ai_explained_at, grok_explanation, grok_explained_at`)
        .eq('id', input.snippetId)
        .single();

      if (!snippet) throw new TRPCError({ code: 'NOT_FOUND' });

      const cachedExplanation = snippet[explanationCol as keyof typeof snippet] as string | null;
      const cachedAt          = snippet[explainedAtCol  as keyof typeof snippet] as string | null;

      if (cachedExplanation && cachedAt) {
        const age = Date.now() - new Date(cachedAt).getTime();
        if (age < 24 * 60 * 60 * 1000) {
          return { explanation: cachedExplanation, cached: true };
        }
      }

      // resolve actual code — may be in Storage if the snippet was large
      const code = snippet.storage_key
        ? await downloadCodeFile(ctx.supabase, snippet.storage_key)
        : snippet.code;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/explain-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EDGE_FUNCTION_SECRET}`,
          },
          body: JSON.stringify({ code, language: snippet.language, provider }),
        }
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error(`AI service error (${provider}):`, response.status, errText);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `${provider === 'grok' ? 'Grok' : 'Claude'} service error` });
      }

      const explanation = await response.text();

      await ctx.supabase
        .from('snippets')
        .update({ [explanationCol]: explanation, [explainedAtCol]: new Date().toISOString() })
        .eq('id', input.snippetId);

      return { explanation, cached: false };
    }),
});
