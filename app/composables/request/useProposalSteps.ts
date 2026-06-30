import { ref, computed, watch, shallowRef, type Ref } from 'vue'
import type { StepNode } from '~~/prisma/generated/interfaces'

/**
 * Shallow view of a step node. We deliberately avoid embedding the full
 * recursive `StepNode` (mutually recursive with `Proposal`) into the
 * TreeTable node data to keep type resolution shallow.
 */
export interface StepData {
	id: number
	title: string
	description: string
	duration: number
}

export interface StepTreeNode {
	key: string
	data: StepData
	children?: StepTreeNode[]
}

export type StepInput = {
	title: string
	description?: string
	duration?: number
	durationVariance?: number
	riskFactor?: number
}

/**
 * Manages the ordered, sequential steps attached to a proposal.
 *
 * The backend returns the chain already ordered by following the `next`
 * pointer, so the frontend keeps a flat list of root rows for now.
 * Parallel branches (the `children`/`parent` tree) will nest under each
 * step when introduced — only `buildTreeNode` needs to change then.
 */
export function useProposalSteps(
	proposalId: Ref<number | null | undefined>,
) {
	const { $trpcClient } = useNuxtApp()
	const toast = usePausableToast()
	const confirm = useConfirm()

	// shallowRef avoids deep-unwrapping the recursive StepNode type
	const steps = shallowRef<StepNode[]>([])
	const loading = ref(false)
	const saving = ref(false)

	async function load() {
		const id = proposalId.value
		if (!id) {
			steps.value = []
			return
		}
		loading.value = true
		try {
			steps.value = await $trpcClient.stepNodes.byProposalId.query({
				proposalId: id,
			})
		} catch (e: any) {
			toast.add('Failed to load steps', e.message, 'error')
		} finally {
			loading.value = false
		}
	}

	watch(proposalId, load, { immediate: true })

	const treeNodes = computed(() =>
		steps.value.map(step => buildTreeNode(step)),
	)

	/**
	 * Maps a step to a TreeTable node. The steps are already returned in
	 * execution (topological) order by the backend, so the series renders as
	 * a flat list. Parallel branches will nest here once the UI supports
	 * them — derived from the StepLink edges, not a stored `children` field.
	 */
	function buildTreeNode(step: StepNode): StepTreeNode {
		return {
			key: String(step.id),
			data: {
				id: step.id,
				title: step.title,
				description: step.description,
				duration: step.duration,
			},
			children: [],
		}
	}

	async function reload() {
		const id = proposalId.value
		if (!id) return
		steps.value = await $trpcClient.stepNodes.byProposalId.query({
			proposalId: id,
		})
	}

	async function addStep(input: StepInput) {
		const id = proposalId.value
		if (!id || !input.title.trim()) return

		saving.value = true
		try {
			const created = await $trpcClient.stepNodes.create.mutate({
				proposalId: id,
				title: input.title.trim(),
				description: input.description?.trim() ?? '',
				duration: input.duration ?? 0,
				durationVariance: input.durationVariance ?? 0,
				riskFactor: input.riskFactor ?? 0,
			})
			await reload()
			toast.add('Step added', created?.title)
		} catch (e: any) {
			toast.add('Failed to add step', e.message, 'error')
		} finally {
			saving.value = false
		}
	}

	async function updateStep(
		id: number,
		patch: Partial<{
			title: string
			description: string
			duration: number
			isActive: boolean
		}>,
	) {
		saving.value = true
		try {
			await $trpcClient.stepNodes.update.mutate({ id, ...patch })
			await reload()
			toast.add('Step updated')
		} catch (e: any) {
			toast.add('Failed to update step', e.message, 'error')
		} finally {
			saving.value = false
		}
	}

	function removeStep(step: StepData) {
		confirm.require({
			group: 'stepDelete',
			header: 'Delete Step',
			message: `Delete step "${step.title}" from the proposal?`,
			icon: 'pi pi-info-circle',
			acceptClass: 'p-button-danger',
			accept: async () => {
				try {
					await $trpcClient.stepNodes.delete.mutate({ id: step.id })
					await reload()
					toast.add('Step deleted', step.title)
				} catch (e: any) {
					toast.add('Failed to delete step', e.message, 'error')
				}
			},
		})
	}

	/**
	 * Persists a new execution order for the proposal's steps.
	 *
	 * The local list is reordered optimistically (preserving object refs so
	 * the table's row identity holds), then the new positions are written
	 * via the `stepNodes.reorder` mutation and reconciled from the server.
	 */
	async function reorder(orderedIds: number[]) {
		const id = proposalId.value
		if (!id || !orderedIds.length) return

		const byId = new Map<number, StepNode>()
		for (const s of steps.value) byId.set(s.id, s)
		const optimistic = orderedIds
			.map(sid => byId.get(sid))
			.filter((s): s is StepNode => !!s)
		if (optimistic.length) steps.value = optimistic

		saving.value = true
		try {
			const reordered = await $trpcClient.stepNodes.reorder.mutate({
				proposalId: id,
				orderedStepIds: orderedIds,
			})
			steps.value = reordered
		} catch (e: any) {
			toast.add('Failed to reorder steps', e.message, 'error')
			await reload()
		} finally {
			saving.value = false
		}
	}

	return {
		steps,
		treeNodes,
		loading,
		saving,
		addStep,
		updateStep,
		removeStep,
		reorder,
		reload,
	}
}
