/** Shape required to compute a step cost's feasibility. */
export interface StepCostFeasibilityInput {
	communityResourceId?: number | null
	quantity: number
	communityResource?: { quantity: number; monetaryValuePerUnit: number } | null
}

/**
 * Per-cost evaluation against a shared, in-order consumption of community
 * resources.
 */
export interface StepCostEvaluation {
	/** Feasibility ranging from 0 to 1 */
	feasibility: number
	availableQuantity: number | null
}

/**
 * Evaluate, for each cost in `costs`, the feasibility and remaining available
 * quantity it sees in the context of the whole list.
 *
 * Costs are consumed in array order; the required quantity of each cost is
 * subtracted from the available quantity of every *other* cost sharing the
 * same `communityResourceId` before it is evaluated. The returned array is
 * parallel to `costs`: each entry holds that cost's individual feasibility
 * in `[0, 1]` and the available quantity it saw at the point of its own
 * evaluation, so callers can render "used / remaining" per row.
 *
 * Items are shallow-cloned alongside their `communityResource` so the
 * caller's objects are never mutated.
 */
export function evaluateStepCostFeasibilities(
	costs: StepCostFeasibilityInput[],
): StepCostEvaluation[] {
	// Shallow-clone each cost plus its communityResource so the caller's items
	// are never mutated.
	const items = costs.map(cost => ({
		...cost,
		communityResource:
			cost.communityResource != null ? { ...cost.communityResource } : null,
	}))

	const results: StepCostEvaluation[] = new Array(items.length)

	for (let i = 0; i < items.length; i++) {
		const cost = items[i]
		if (!cost) continue
		const requiredQuantity = cost.quantity
		const availableQuantity = cost.communityResource?.quantity ?? null

		let feasibility = 1
		// Feasibility of this single cost against its (possibly already
		// consumed) available quantity.
		if (
			availableQuantity == null ||
			!Number.isFinite(requiredQuantity) ||
			requiredQuantity <= 0
		) {
			// No consumption tracking possible (or nothing to consume): this
			// cost neither affects feasibility nor depletes shared stock.
			feasibility = 1
		} else if (requiredQuantity > availableQuantity) {
			feasibility = 0
		} else {
			feasibility = 1 - requiredQuantity / availableQuantity
		}

		results[i] = { feasibility, availableQuantity }

		// Subtract the consumed quantity from every cost sharing the same
		// community resource (including this one), so that subsequent
		// costs referencing it see the reduced capacity.
		const communityResourceId = cost.communityResourceId
		if (
			communityResourceId != null &&
			Number.isFinite(requiredQuantity) &&
			requiredQuantity !== 0
		) {
			for (const other of items) {
				if (
					other.communityResourceId === communityResourceId &&
					other.communityResource != null
				) {
					other.communityResource.quantity -= requiredQuantity
				}
			}
		}
	}

	return results
}

/**
 * Overall feasibility of a set of step costs, in `[0, 1]`.
 *
 * The product of every cost's individual feasibility as shared community
 * resources are consumed in array order. Used by the backend to persist a
 * proposal's `netFeasibility` (see `server/trpc/routers/stepCosts.ts`), and
 * kept here so client and server share one implementation.
 */
export function getStepCostsFeasibility(
	costs: StepCostFeasibilityInput[],
): number {
	let product = 1
	for (const { feasibility } of evaluateStepCostFeasibilities(costs)) {
		product *= feasibility
	}
	return product
}
