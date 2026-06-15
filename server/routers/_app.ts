import { router } from '@/server/trpc';
import { snippetRouter } from './snippet.router';
import { userRouter } from './user.router';

export const appRouter = router({
  snippet: snippetRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
