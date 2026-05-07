import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { requestsRouter } from './requests';
import { requestNodesRouter } from './requestNodes'
import { proposalsRouter } from './proposals'
import { resourcesRouter } from './resources'

export const appRouter = router({
	hello: publicProcedure.input(z.string().nullish()).query(({ input }) => {
		return { greeting: `hello ${input ?? 'world'}` }
	}),
	greet: publicProcedure
		.input(
			z.object({
				name: z.string(),
				greeting: z.string().nullish(),
			}),
		)
		.query(({ input }) => {
			return { greeting: `${input.greeting ?? 'hello'} ${input.name}` }
		}),
	requests: requestsRouter,
	requestNodes: requestNodesRouter,
	proposals: proposalsRouter,
	resourceNodes: resourcesRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter;
