# CodeSnap — CLAUDE.md

## Project Overview
Code snippet sharing service. Next.js 14 App Router + tRPC + Supabase.
Users share code snippets with syntax highlighting.
Real-time likes via Supabase Realtime (PostgreSQL LISTEN/NOTIFY).
AI explanation via Supabase Edge Function (Deno) calling Claude API.

## Key Concepts (read before writing code)

### tRPC pattern in this project
- All API calls go through tRPC — NO direct fetch() to /api/* except OAuth callback
- Input validation: Zod schemas in router (not in components)
- Error handling: TRPCError, not throw new Error
- Server components: use server-side caller (lib/trpc/server.ts), not useQuery

### Supabase Auth + RLS
- NEVER bypass RLS by using service_role key in client-side code
- ALWAYS use anon key on client, service_role only in Edge Functions or tRPC server
- RLS policies are the primary security layer — trust them, don't duplicate in code
- Auth state: useUser() hook from @supabase/auth-helpers-nextjs

### Supabase Realtime pattern
- Use channel per resource: supabase.channel('snippet:${id}')
- Always unsubscribe on component unmount: return () => supabase.removeChannel(channel)
- Realtime is for display only — source of truth is DB (don't update local state without DB confirm)

### Next.js App Router rules
- Server Components: fetch data, no useState/useEffect, no browser APIs
- Client Components: 'use client', interactive UI, Realtime subscriptions
- tRPC in Server Component: use lib/trpc/server.ts caller
- tRPC in Client Component: use useQuery/useMutation hooks

## Sub-Agents

### @supabase-agent
**Role**: Database schema, RLS policies, Realtime, Storage, Migrations
**Files**: supabase/migrations/**, lib/supabase/**, hooks/useRealtime*.ts
**Best practices**:
- Every table: enable RLS immediately (ALTER TABLE ... ENABLE ROW LEVEL SECURITY)
- RLS naming: {table}_{operation}_{condition} (e.g. snippets_select_public)
- Test RLS in Supabase Studio before writing application code
- Realtime: use Broadcast for ephemeral events (cursor), Postgres Changes for persistent
- Storage buckets: always private, use signed URLs, RLS on objects table
- Migrations: always additive (no DROP, no RENAME without multi-step)
- After schema change: regenerate types → npx supabase gen types typescript

### @trpc-agent
**Role**: tRPC routers, procedures, middleware, Zod schemas
**Files**: server/routers/**, server/trpc.ts
**Best practices**:
- Public procedures: t.procedure (no auth check)
- Protected procedures: protectedProcedure (throws if no session)
- Input: always Zod schema, even for simple IDs (z.string().uuid())
- Never return raw DB rows — map to Response type
- Mutations: return updated entity (client uses it for optimistic update)
- Infinite queries: use cursor-based pagination (not offset) for snippets list
- Error codes: NOT_FOUND, FORBIDDEN, UNAUTHORIZED, BAD_REQUEST — never INTERNAL_SERVER_ERROR to client

### @frontend-agent
**Role**: Next.js pages, React components, hooks, tRPC client
**Files**: app/**, components/**, hooks/**
**Best practices**:
- Prefer Server Components — only add 'use client' when needed
- Skeleton UI while loading, not spinners
- Optimistic updates for like button (useMutation + onMutate)
- useRealtimeLikes: subscribe on mount, update local count, unsubscribe on unmount
- Shiki: import singleton from lib/shiki.ts (don't create new highlighter per render)
- Code editor: textarea with monospace font (no heavy libs — this is a small project)
- No any types, strict TypeScript

### @edge-agent
**Role**: Supabase Edge Functions (Deno runtime)
**Files**: supabase/functions/**
**Best practices**:
- Deno imports: use npm: prefix or esm.sh (not node_modules)
- ANTHROPIC_API_KEY: Supabase Secrets (supabase secrets set), not hardcoded
- Always verify request is from our app: check Authorization header
- Return streaming response for AI (don't wait for full completion)
- Timeout: Edge Functions max 150 seconds — AI explanation must fit
- CORS: set Access-Control-Allow-Origin header for browser requests

## Security Rules
- GitHub OAuth only — no email/password (simpler, no password hashing needed)
- RLS is the auth layer — don't duplicate ownership checks in tRPC
- Supabase anon key: safe to expose to client (RLS protects data)
- Supabase service_role: NEVER in client-side code, only server/Edge Functions
- Rate limit explain endpoint: max 3 AI requests per user per hour (check in tRPC)
- Sanitize code before displaying: Shiki handles XSS (outputs safe HTML)

## Code Style
- TypeScript strict mode
- Inferring tRPC types: use RouterOutputs['snippet']['list'] — no manual typing
- Supabase types: always generated (npx supabase gen types typescript > lib/database.types.ts)
- No console.log — use console.error only for real errors

## Common Tasks

### Добавить новый язык программирования
1. Добавить в SUPPORTED_LANGUAGES в lib/shiki.ts
2. Добавить в z.enum() в CreateSnippetSchema в snippet.router.ts
3. Обновить LanguageSelect компонент
4. Запустить: npx supabase gen types typescript (если добавили в CHECK constraint)

### Добавить новое поле к snippets
Expand-and-contract паттерн:
1. Создать новую миграцию: ALTER TABLE snippets ADD COLUMN new_field TYPE DEFAULT NULL
2. Обновить database.types.ts: npx supabase gen types typescript
3. Обновить tRPC router (входные/выходные данные)
4. Обновить UI компоненты

### Отладить RLS
В Supabase Studio: SQL Editor → выполни от имени пользователя:
SET role authenticated;
SET request.jwt.claim.sub = 'user-uuid-here';
SELECT * FROM snippets;

### Отладить Realtime
В браузере Console:
const c = supabase.channel('test').on('postgres_changes', ...).subscribe()
// Вставь запись в likes → в консоли должно появиться событие
