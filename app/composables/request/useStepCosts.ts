import { MeasurementType } from '~~/prisma/generated/client/enums'
import { getStepCostFeasibility as _getStepCostFeasibility } from '~~/server/trpc/routers/stepCosts'

/**
 * Shared types for step costs. The cost list and its mutations are owned by
 * the proposal-level composable (`useProposalSteps`) so all of a proposal's
 * steps + costs can be preloaded in a single round trip and kept in sync as
 * costs are added/edited/removed.
 */
export interface StepCostRow {
	id: number
	title: string
	description: string
	isActive: boolean
	stepId: number
	communityResourceId: number
	measurementType: MeasurementType
	quantity: number
	quantityMargin: number
	monetaryValue: number
	communityResource?: {
		id: number
		quantity: number
		monetaryValuePerUnit: number
		resource?: {
			id: number
			title: string
			measurementType: MeasurementType
		}
	}
}

export interface CommunityResourceOption {
	id: number
	resourceId: number
	resource: {
		id: number
		title: string
		measurementType: MeasurementType
	}
}

export type StepCostInput = {
	title: string
	description?: string
	communityResourceId: number
	measurementType: MeasurementType
	quantity: number
	quantityMargin: number
	monetaryValue: number
}

export type StepCostPatch = Partial<StepCostInput> & { isActive?: boolean }

/**
 * Feasibility of a single step cost, in [0, 1].
 * 
 * Thin wrapper over the canonical implementation in
 * `server/trpc/routers/stepCosts.ts` so client and server stay in sync.
 */
export function getStepCostFeasibility(cost: StepCostRow): number {
	return _getStepCostFeasibility(cost)
}

/**
 * Feasibility of a step: the product of the feasibility of all its step costs.
 * Returns 1 when there are no costs.
 */
export function getStepFeasibility(costs: StepCostRow[]): number {
	let product = 1
	for (const c of costs) product *= getStepCostFeasibility(c)
	return product
}
