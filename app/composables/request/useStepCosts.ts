import { MeasurementType } from '~~/prisma/generated/client/enums'

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
 * Feasibility of a single step cost:
 *   availability / (availability + stepCost.quantity)
 * where availability is the quantity of the community resource it draws from.
 * Returns 1 when availability is missing or non-positive (no constraint).
 */
export function stepCostFeasibility(cost: StepCostRow): number {
	const availability = cost.communityResource?.quantity
	if (!availability || availability <= 0) return 1
	const feasibility = availability / (availability + cost.quantity)
	return Number.isFinite(feasibility) ? feasibility : 1
}

/**
 * Feasibility of a step: the product of the feasibility of all its step costs.
 * Returns 1 when there are no costs.
 */
export function stepFeasibility(costs: StepCostRow[]): number {
	let product = 1
	for (const c of costs) product *= stepCostFeasibility(c)
	return product
}
