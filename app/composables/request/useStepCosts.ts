import { MeasurementType } from '~~/prisma/generated/client/enums'
import { getStepCostsFeasibility as _getStepCostsFeasibility } from '~~/lib/stepCostsFeasibility'

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
 * Feasibility of a set of step costs that may share community resources.
 *
 * Thin wrapper over the canonical implementation in
 * `lib/stepCostsFeasibility.ts` so client and server stay in sync.
 * Each cost's consumed quantity is subtracted from the available quantity of
 * every other cost sharing the same `communityResource`, so subsequent
 * costs referencing the same resource see the reduced capacity.
 */
export function getCostsFeasibility(costs: StepCostRow[]): number {
	return _getStepCostsFeasibility(costs)
}

/**
 * Feasibility of a single step cost, in [0, 1].
 *
 * Thin wrapper over the canonical implementation in
 * `lib/stepCostsFeasibility.ts` so client and server stay in sync.
 * Equivalent to `getCostsFeasibility([cost])`: a single cost has no siblings
 * to deplete shared stock from, so this is just its raw feasibility.
 */
export function getStepCostFeasibility(cost: StepCostRow): number {
	return _getStepCostsFeasibility([cost])
}

/**
 * Feasibility of a step: the product of the feasibility of all its step costs.
 * Returns 1 when there are no costs. Shared community resources across the
 * step's costs are consumed in order (see `getCostsFeasibility`).
 */
export function getStepFeasibility(costs: StepCostRow[]): number {
	return getCostsFeasibility(costs)
}
