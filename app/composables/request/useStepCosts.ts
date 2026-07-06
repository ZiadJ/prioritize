import { MeasurementType } from '~~/prisma/generated/client/enums'
import {
	evaluateStepCostFeasibilities as _evaluateStepCostFeasibilities,
	type StepCostEvaluation,
} from '~~/lib/stepCostsFeasibility'

export type { StepCostEvaluation }

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
 * Per-cost evaluation (feasibility + remaining available quantity) across a
 * proposal's full cost list, in array order.
 *
 * Each cost's required quantity is subtracted from the available quantity of
 * every other cost sharing the same `communityResourceId` before it is
 * evaluated, so later costs on a shared resource see reduced capacity. Use
 * this for row-level display (e.g. a feasibility gauge plus "used /
 * remaining"). `allCosts` must be in the same order the server consumes
 * them (i.e. creation/execution order), not narrowed to a single step.
 */
export function evaluateStepCostFeasibilities(
	allCosts: StepCostRow[],
): StepCostEvaluation[] {
	return _evaluateStepCostFeasibilities(allCosts)
}

/**
 * Feasibility of a step in the context of the whole proposal, in `[0, 1]`.
 *
 * The product of each of the step's costs' feasibility, each computed
 * against the remaining capacity left after every cost consumed before it
 * across all steps. `allCosts` is the full, ordered cost list for the
 * proposal. Returns `1` when the step has no costs.
 */
export function getStepFeasibility(
	stepCosts: StepCostRow[],
	allCosts: StepCostRow[] = stepCosts,
): number {
	if (!stepCosts.length) return 1
	const feasibilityByCost = new Map<StepCostRow, number>()
	const evaluations = _evaluateStepCostFeasibilities(allCosts)
	for (let i = 0; i < allCosts.length; i++) {
		const row = allCosts[i]
		if (row) feasibilityByCost.set(row, evaluations[i]?.feasibility ?? 1)
	}
	let product = 1
	for (const cost of stepCosts) {
		product *= feasibilityByCost.get(cost) ?? 1
	}
	return product
}
