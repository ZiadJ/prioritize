import { ref, watch, type Ref } from 'vue'
import { MeasurementType } from '~~/prisma/generated/client/enums'

export interface StepCostRow {
	id: number
	title: string
	description: string
	isActive: boolean
	communityResourceId: number
	measurementType: MeasurementType
	quantity: number
	quantityMargin: number
	monetaryValue: number
	communityResource?: {
		id: number
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
 * Manages the StepCost rows attached to a StepNode. The schema allows
 * multiple costs per step, so we expose the full list.
 */
export function useStepCosts(stepNodeId: Ref<number | null | undefined>) {
	const { $trpcClient } = useNuxtApp()
	const toast = usePausableToast()
	const confirm = useConfirm()

	const costs = ref<StepCostRow[]>([])
	const communityResources = ref<CommunityResourceOption[]>([])
	const loading = ref(false)
	const saving = ref(false)

	async function load() {
		const id = stepNodeId.value
		if (id == null) {
			costs.value = []
			return
		}
		loading.value = true
		try {
			const [costRows, resources] = await Promise.all([
				$trpcClient.stepCosts.byStepNodeId.query({ stepNodeId: id }),
				$trpcClient.communityResources.list.query({ isActive: true }),
			])
			costs.value = costRows as StepCostRow[]
			communityResources.value = resources as CommunityResourceOption[]
		} catch (e: any) {
			toast.add('Failed to load step costs', e.message, 'error')
		} finally {
			loading.value = false
		}
	}

	watch(stepNodeId, load, { immediate: true })

	async function create(input: StepCostInput) {
		const id = stepNodeId.value
		if (id == null) return
		saving.value = true
		try {
			const created = await $trpcClient.stepCosts.create.mutate({
				stepNodeId: id,
				...input,
			})
			costs.value = [...costs.value, created as StepCostRow]
			toast.add('Step cost added', created?.title)
		} catch (e: any) {
			toast.add('Failed to add step cost', e.message, 'error')
		} finally {
			saving.value = false
		}
	}

	async function update(id: number, patch: StepCostPatch) {
		saving.value = true
		try {
			const updated = await $trpcClient.stepCosts.update.mutate({ id, ...patch })
			costs.value = costs.value.map(c =>
				c.id === id ? (updated as StepCostRow) : c,
			)
			toast.add('Step cost updated')
		} catch (e: any) {
			toast.add('Failed to update step cost', e.message, 'error')
		} finally {
			saving.value = false
		}
	}

	function remove(cost: StepCostRow) {
		const id = cost.id
		const title = cost.title
		confirm.require({
			group: 'stepCostDelete',
			header: 'Delete Step Cost',
			message: `Delete the cost "${title}" from this step?`,
			icon: 'pi pi-info-circle',
			acceptClass: 'p-button-danger',
			accept: async () => {
				saving.value = true
				try {
					await $trpcClient.stepCosts.delete.mutate({ id })
					costs.value = costs.value.filter(c => c.id !== id)
					toast.add('Step cost deleted', title)
				} catch (e: any) {
					toast.add('Failed to delete step cost', e.message, 'error')
				} finally {
					saving.value = false
				}
			},
		})
	}

	return {
		costs,
		communityResources,
		loading,
		saving,
		create,
		update,
		remove,
		reload: load,
	}
}
