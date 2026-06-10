import { ref, computed, watch } from 'vue'
import type { Proposal } from '~~/prisma/generated/interfaces'
import type { ColumnProps } from 'primevue/column'

const PROPOSAL_DEFAULTS = {
	isActive: true,
	isComplete: false,
	stepCount: 0,
	duration: 0,
	priority: 0,
	riskFactor: 0,
	deliveryDays: 0,
	avgRating: 0,
	tags: [],
	tagIds: [],
}

export interface ProposalColumn extends ColumnProps {
	id?: number
	description: string
	isDirty?: boolean
	isLoading?: boolean
	isActive?: boolean
}

export function useProposalColumns(requestId: number, initialProposals: Proposal[] = []) {
	const { $trpcClient } = useNuxtApp()
	const toast = usePausableToast()
	const confirm = useConfirm()

	const columns = ref<ProposalColumn[]>([])
	const visibleKeys = ref(new Set<string>())
	const visibleColumns = ref<ProposalColumn[]>([])

	const formDialogVisible = ref(false)
	const formSaving = ref(false)
	const formData = ref({ title: '', description: '' })

	function syncVisibleColumns() {
		visibleColumns.value = columns.value.filter(c => visibleKeys.value.has(c.columnKey!))
	}

	function init(proposals: Proposal[]) {
		columns.value = proposals.map(mapProposalToColumn)
		visibleKeys.value = new Set(columns.value.map(c => c.columnKey!))
		syncVisibleColumns()
	}

	init(initialProposals)

	const editingColumn = ref<ProposalColumn | null>(null)
	const isEditMode = computed(() => !!editingColumn.value)

	watch(formDialogVisible, (visible) => {
		if (!visible) editingColumn.value = null
	})

	function mapProposalToColumn(p: Proposal): ProposalColumn {
		return {
			id: p.id,
			field: 'p' + p.id,
			columnKey: String(p.id),
			header: p.title,
			description: p.description,
			isActive: p.isActive,
		}
	}

	function openCreateForm() {
		editingColumn.value = null
		formData.value = { title: '', description: '' }
		formDialogVisible.value = true
	}

	const addProposal = async () => {
		const { title, description } = formData.value
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
			const result = await $trpcClient.proposals.create.mutate({
				title,
				description,
				requestId,
				...PROPOSAL_DEFAULTS,
			}) as any

			const col = mapProposalToColumn(result as Proposal)
			columns.value[tempIdx] = col
			visibleKeys.value.delete(tempKey)
			visibleKeys.value.add(col.columnKey!)
			syncVisibleColumns()

			toast.show('Proposal created', result.title)
		} catch (e: any) {
			columns.value.splice(tempIdx, 1)
			visibleKeys.value.delete(tempKey)
			syncVisibleColumns()
			toast.show('Failed to create proposal', e.message, 'error')
		} finally {
			formSaving.value = false
		}
	}

	const removeProposal = (col: ProposalColumn, event: MouseEvent) => {
		confirm.require({
			header: 'Delete Proposal',
			target: event.currentTarget as HTMLElement,
			message: `Delete "${col.header}"? This cannot be undone.`,
			icon: 'pi pi-info-circle',
			acceptClass: 'p-button-danger',
			accept: async () => {
				const originalIdx = columns.value.indexOf(col)
				if (!col.id) {
					columns.value.splice(originalIdx, 1)
					visibleKeys.value.delete(col.columnKey!)
					syncVisibleColumns()
					toast.show('Proposal removed')
					return
				}

				columns.value.splice(originalIdx, 1)
				visibleKeys.value.delete(col.columnKey!)
				syncVisibleColumns()

				try {
					await $trpcClient.proposals.delete.mutate({ id: col.id })
					toast.show('Proposal deleted', col.header)
				} catch (e: any) {
					columns.value.splice(originalIdx, 0, col)
					visibleKeys.value.add(col.columnKey!)
					syncVisibleColumns()
					toast.show('Failed to delete proposal', e.message, 'error')
				}
			},
		})
	}

	const updateProposal = async (col: ProposalColumn, updates: Partial<Pick<ProposalColumn, 'header' | 'description'>>) => {
		if (!col.id) return

		const previous = { header: col.header, description: col.description }
		Object.assign(col, updates)

		try {
			await $trpcClient.proposals.update.mutate({
				id: col.id,
				...PROPOSAL_DEFAULTS,
				title: updates.header ?? col.header ?? '',
				description: updates.description ?? col.description ?? '',
				isActive: col.isActive ?? true,
				requestId,
			})
			toast.show('Proposal updated', col.header)
		} catch (e: any) {
			Object.assign(col, previous)
			toast.show('Failed to update proposal', e.message, 'error')
		}
	}

	const renameProposal = (col: ProposalColumn) => {
		editingColumn.value = col
		formData.value = { title: col.header || '', description: col.description || '' }
		formDialogVisible.value = true
	}

	const saveProposalEdit = async () => {
		const col = editingColumn.value
		if (!col) return

		const { title, description } = formData.value
		if (!title.trim()) return

		formSaving.value = true
		try {
			await updateProposal(col, { header: title, description })
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

	return {
		columns,
		visibleColumns,
		formDialogVisible,
		formSaving,
		formData,
		editingColumn,
		isEditMode,
		openCreateForm,
		addProposal,
		removeProposal,
		updateProposal,
		renameProposal,
		saveProposalEdit,
		onColumnVisibilityToggle,
		init,
	}
}
