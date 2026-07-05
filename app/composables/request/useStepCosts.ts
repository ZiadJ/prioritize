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
 * Feasibility of a single step cost, in [0, 1].
 *
 * In the feasible region (required <= resourceQuantity) it follows the linear
 * curve  1 - required / resourceQuantity, falling from 1 as required approaches
 * 0 down to 0 when required reaches the available quantity. When the
 * requirement exceeds what is available the step cannot be fulfilled, so
 * feasibility is 0.
 *
 * Returns 1 (no constraint) when there is no community resource or nothing is
 * required.
 */
export function stepCostFeasibility(cost: StepCostRow): number {
	const resourceQuantity = cost.communityResource?.quantity
	if (resourceQuantity == null) return 1
	const required = cost.quantity
	if (!Number.isFinite(required) || required <= 0) return 1
	if (required > resourceQuantity) return 0
	return 1 - required / resourceQuantity
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
