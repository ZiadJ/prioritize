/** Shape required to compute a step cost's feasibility. */
export interface StepCostFeasibilityInput {
	communityResourceId?: number | null
	quantity: number
	communityResource?: { quantity: number; monetaryValuePerUnit: number } | null
}

/**
 * Feasibility of one or more step costs, in [0, 1].
 *
 * - For a single cost, this is its feasibility against its community resource's
 *   available quantity.
 * - For multiple costs, this is the product of every cost's feasibility, where
 *   the consumed quantity of each cost is subtracted from the available
 *   quantity of every other cost referencing the *same* `communityResourceId`
 *   before it is evaluated, so that shared community resources are consumed in
 *   order.
 *
 * Items are shallow-cloned alongside their `communityResource` so the caller's
 * objects are never mutated. Shared by `useStepCosts.ts` so that client and
 * server stay in sync.
 */
export function getStepCostsFeasibility(
	costs: StepCostFeasibilityInput[],
): number {
	// Shallow-clone each cost plus its communityResource so the caller's items
	// are never mutated.
	const items = costs.map((cost) => ({
		...cost,
		communityResource:
			cost.communityResource != null ? { ...cost.communityResource } : null,
	}))

	let product = 1
	for (const cost of items) {
		const requiredQuantity = cost.quantity
		const availableQuantity = cost.communityResource?.quantity

		// Feasibility of this single cost against its (possibly already
		// consumed) available quantity.
		if (
			availableQuantity == null ||
			!Number.isFinite(requiredQuantity) ||
			requiredQuantity <= 0
		) {
			// No consumption tracking possible (or nothing to consume): this
			// cost neither affects feasibility nor depletes shared stock.
			continue
		}
		if (requiredQuantity > availableQuantity) {
			product = 0
		} else {
			product *= 1 - requiredQuantity / availableQuantity
		}

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

	return product
}
