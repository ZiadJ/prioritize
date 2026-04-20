import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { requestsRouter } from './requests';

export const appRouter = router({
  hello: publicProcedure
    .input(z.string().nullish())
    .query(({ input }) => {
      return { greeting: `hello ${input ?? 'world'}` };
    }),
  greet: publicProcedure
    .input(
      z.object({
        name: z.string(),
        greeting: z.string().nullish(),
      })
    )
    .query(({ input }) => {
      return { greeting: `${input.greeting ?? 'hello'} ${input.name}` };
    }),
  requests: requestsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;