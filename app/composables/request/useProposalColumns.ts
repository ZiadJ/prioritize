import { ref, computed, watch } from 'vue'
import type { Proposal } from '~~/prisma/generated/interfaces'
import type { ColumnProps } from 'primevue/column'

const PROPOSAL_DEFAULTS = {
	isActive: true,
	isComplete: false,
	duration: 0,
	priority: 0,
	riskFactor: 0,
	tags: [],
	tagIds: [],
}

export interface ProposalColumn extends ColumnProps {
	id?: number
	description: string
	duration?: number
	netBenefit?: number
	netFeasibility?: number
	approvedAt?: string | Date | null
	createdAt?: string | Date | null
	isDirty?: boolean
	isLoading?: boolean
	isActive?: boolean
	ownerId?: string
	ownerName?: string
}

type ProposalWithOwner = Omit<Proposal, 'owner'> & {
	owner?: { username?: string }
}

export function useProposalColumns(
	requestId: number,
	initialProposals: ProposalWithOwner[] = [],
) {
	const { $trpcClient } = useNuxtApp()
	const toast = usePausableToast()
	const confirm = useConfirm()

	const columns = ref<ProposalColumn[]>([])
	const visibleKeys = ref(new Set<string>())
	const visibleColumns = ref<ProposalColumn[]>([])

	const formDialogVisible = ref(false)
	const formSaving = ref(false)
	const formDeleting = ref(false)
	const formData = ref({
		title: '',
		description: '',
		isActive: true,
		duration: 0,
	})

	function syncVisibleColumns() {
		visibleColumns.value = columns.value.filter(c =>
			visibleKeys.value.has(c.columnKey!),
		)
	}

	function init(proposals: ProposalWithOwner[]) {
		columns.value = proposals.map(mapProposalToColumn)
		visibleKeys.value = new Set(columns.value.map(c => c.columnKey!))
		syncVisibleColumns()
	}

	init(initialProposals)

	const editingColumn = ref<ProposalColumn | null>(null)
	const isEditMode = computed(() => !!editingColumn.value)

	watch(formDialogVisible, visible => {
		if (!visible) editingColumn.value = null
	})

	function mapProposalToColumn(p: ProposalWithOwner): ProposalColumn {
		return {
			id: p.id,
			field: 'p' + p.id,
			columnKey: String(p.id),
			header: p.title,
			description: p.description,
			duration: p.duration,
			netBenefit: p.netBenefit ?? 0,
			netFeasibility: p.netFeasibility ?? 0,
			approvedAt: p.approvedAt ?? null,
			isActive: p.isActive,
			ownerId: p.ownerId,
			ownerName: p.owner?.username ?? undefined,
		}
	}

	function openCreateForm() {
		editingColumn.value = null
		formData.value = { title: '', description: '', isActive: true, duration: 0 }
		formDialogVisible.value = true
	}

	const addProposal = async () => {
		const { title, description, duration } = formData.value
		if (!title.trim()) return

		formSaving.value = true
		const tempKey = `temp_${Date.now()}`
		const tempCol: ProposalColumn = {
			id: undefined,
			field: tempKey,
			columnKey: tempKey,
			header: title,
			description,
			isLoading: true,
			isActive: true,
		}

		const tempIdx = columns.value.length
		columns.value.push(tempCol)
		visibleKeys.value.add(tempKey)
		syncVisibleColumns()
		formDialogVisible.value = false

		try {
			const result = (await $trpcClient.proposals.create.mutate({
				title,
				description,
				requestId,
				...PROPOSAL_DEFAULTS,
				duration: duration ?? 0,
			})) as any

			const col = mapProposalToColumn(result as Proposal)
			columns.value[tempIdx] = col
			visibleKeys.value.delete(tempKey)
			visibleKeys.value.add(col.columnKey!)
			syncVisibleColumns()

			toast.add('Proposal created', result.title)
		} catch (e: any) {
			columns.value.splice(tempIdx, 1)
			visibleKeys.value.delete(tempKey)
			syncVisibleColumns()
			toast.add('Failed to create proposal', e.message, 'error')
		} finally {
			formSaving.value = false
		}
	}

	const removeProposal = (col: ProposalColumn) => {
		confirm.require({
			group: 'proposalDelete',
			header: 'Delete Proposal',
			message: `Delete "${col.header}"? This cannot be undone.`,
			icon: 'pi pi-info-circle',
			acceptClass: 'p-button-danger',
			accept: async () => {
				const originalIdx = columns.value.indexOf(col)
				if (!col.id) {
					columns.value.splice(originalIdx, 1)
					visibleKeys.value.delete(col.columnKey!)
					syncVisibleColumns()
					if (editingColumn.value === col) {
						formDialogVisible.value = false
						editingColumn.value = null
					}
					toast.add('Proposal removed')
					return
				}

				formDeleting.value = true
				columns.value.splice(originalIdx, 1)
				visibleKeys.value.delete(col.columnKey!)
				syncVisibleColumns()

				try {
					await $trpcClient.proposals.delete.mutate({ id: col.id })
					if (editingColumn.value === col) {
						formDialogVisible.value = false
						editingColumn.value = null
					}
					toast.add('Proposal deleted', col.header)
				} catch (e: any) {
					columns.value.splice(originalIdx, 0, col)
					visibleKeys.value.add(col.columnKey!)
					syncVisibleColumns()
					toast.add('Failed to delete proposal', e.message, 'error')
				} finally {
					formDeleting.value = false
				}
			},
		})
	}

	const updateProposal = async (
		col: ProposalColumn,
		updates: Partial<
			Pick<ProposalColumn, 'header' | 'description' | 'duration'>
		>,
	) => {
		if (!col.id) return

		const previous = {
			header: col.header,
			description: col.description,
			duration: col.duration,
		}
		Object.assign(col, updates)

		try {
			await $trpcClient.proposals.update.mutate({
				id: col.id,
				...PROPOSAL_DEFAULTS,
				title: updates.header ?? col.header ?? '',
				description: updates.description ?? col.description ?? '',
				isActive: col.isActive ?? true,
				duration: updates.duration ?? col.duration ?? 0,
				requestId,
			})
			toast.add('Proposal updated', col.header)
		} catch (e: any) {
			Object.assign(col, previous)
			toast.add('Failed to update proposal', e.message, 'error')
		}
	}

	const editProposal = (col: ProposalColumn) => {
		editingColumn.value = col
		formData.value = {
			title: col.header || '',
			description: col.description || '',
			isActive: col.isActive ?? true,
			duration: col.duration ?? 0,
		}
		formDialogVisible.value = true
	}

	const saveProposalEdit = async () => {
		const col = editingColumn.value
		if (!col) return

		const { title, description, isActive, duration } = formData.value
		if (!title.trim()) return

		formSaving.value = true
		try {
			col.isActive = isActive
			await updateProposal(col, { header: title, description, duration })
			editingColumn.value = null
			formDialogVisible.value = false
		} finally {
			formSaving.value = false
		}
	}

	const onColumnVisibilityToggle = (filteredProposals: ProposalColumn[]) => {
		visibleKeys.value = new Set(filteredProposals.map(p => p.columnKey ?? ''))
		syncVisibleColumns()
	}

	async function refreshNetBenefits() {
		try {
			const updatedProposals =
				await $trpcClient.proposals.updateNetBenefits.query({ requestId })
			for (const updated of updatedProposals) {
				const col = columns.value.find(c => c.id === updated.id)
				if (col) {
					col.netBenefit = updated.netBenefit ?? 0
					col.netFeasibility = updated.netFeasibility ?? 0
				}
			}
			syncVisibleColumns()
		} catch (e: any) {
			// Silently fail — netBenefit will be stale until next refresh
		}
	}

	return {
		columns,
		visibleColumns,
		formDialogVisible,
		formSaving,
		formDeleting,
		formData,
		editingColumn,
		isEditMode,
		openCreateForm,
		addProposal,
		removeProposal,
		updateProposal,
		editProposal,
		saveProposalEdit,
		onColumnVisibilityToggle,
		refreshNetBenefits,
		init,
	}
}
