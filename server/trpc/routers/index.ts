import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { requestsRouter } from './requests';
import { requestNodesRouter } from './requestNodes'
import { proposalsRouter } from './proposals'
import { resourcesRouter } from './resources'
import { communityResourcesRouter } from './communityResources'
import { feedbackRouter } from './feedback'
import { expertiseRouter } from './expertise'
import { stepsRouter } from './steps'
import { stepCostsRouter } from './stepCosts'
import { stockMovementsRouter } from './stockMovements'

export const appRouter = router({
	requests: requestsRouter,
	requestNodes: requestNodesRouter,
	proposals: proposalsRouter,
	resourceNodes: resourcesRouter,
	communityResources: communityResourcesRouter,
	feedback: feedbackRouter,
	expertise: expertiseRouter,
	steps: stepsRouter,
	stepCosts: stepCostsRouter,
	stockMovements: stockMovementsRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter;
