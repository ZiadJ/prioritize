import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { requestsRouter } from './requests';
import { requestNodesRouter } from './requestNodes'
import { proposalsRouter } from './proposals'
import { resourcesRouter } from './resources'
import { feedbackRouter } from './feedback'
import { expertiseRouter } from './expertise'

export const appRouter = router({
	requests: requestsRouter,
	requestNodes: requestNodesRouter,
	proposals: proposalsRouter,
	resourceNodes: resourcesRouter,
	feedback: feedbackRouter,
	expertise: expertiseRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter;
