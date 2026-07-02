<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StepNode } from '~~/prisma/generated/interfaces'
import type { StepData } from '~/composables/request/useProposalSteps'
import { useProposalSteps } from '~/composables/request/useProposalSteps'
import StepCostEditor from '@/components/proposal/StepCostEditor.vue'

const props = defineProps<{
	proposalId: number
}>()

const proposalIdRef = computed(() => props.proposalId)
const {
	steps,
	loading,
	saving,
	addStep,
	updateStep,
	removeStep,
	reorder,
	costsByStepId,
	communityResources,
	addCost,
	updateCost,
	removeCost,
} = useProposalSteps(proposalIdRef)

// Rows expanded to reveal their StepCost editor.
const expandedRows = ref<StepNode[]>([])

// The execution-order badge is derived from the current display order so it
// tracks drag-and-drop reordering immediately.
const positionById = computed(() => {
	const map = new Map<number, number>()
	steps.value.forEach((s, i) => map.set(s.id, i + 1))
	return map
})

// Add-step dialog
const addDialogVisible = ref(false)
const newTitle = ref('')
const newDescription = ref('')
const newDuration = ref(0)

function openAddDialog() {
	newTitle.value = ''
	newDescription.value = ''
	newDuration.value = 0
	addDialogVisible.value = true
}

async function onAdd() {
	if (!newTitle.value.trim()) return
	await addStep({
		title: newTitle.value,
		description: newDescription.value,
		duration: newDuration.value,
	})
	addDialogVisible.value = false
}

// Inline edit of an existing step
const editingId = ref<number | null>(null)
const draft = ref({ title: '', description: '', duration: 0 })

function startEdit(step: StepData) {
	editingId.value = step.id
	draft.value = {
		title: step.title,
		description: step.description,
		duration: step.duration,
	}
}

function cancelEdit() {
	editingId.value = null
}

async function saveEdit() {
	if (editingId.value == null || !draft.value.title.trim()) return
	await updateStep(editingId.value, { ...draft.value })
	editingId.value = null
}

// DataTable row reorder: persist the new execution order.
function onRowReorder(event: { value: StepNode[] }) {
	reorder(event.value.map(s => s.id))
}
</script>

<template>
	<ConfirmDialog group="stepDelete"></ConfirmDialog>
	<ConfirmDialog group="stepCostDelete"></ConfirmDialog>

	<div class="form-field -mt-1">
		<DataTable
			:value="steps"
			v-model:expandedRows="expandedRows"
			dataKey="id"
			:loading="loading"
			@rowReorder="onRowReorder"
			:showHeaders="false"
			:showGridlines="false"
			rowHover>
			<Column :rowReorder="true" headerClass="!p-0" bodyClass="!p-0" />
			<Column expander headerClass="!p-0" bodyClass="!p-0" />

			<Column field="title" header="Step" style="min-width: 16rem">
				<template #body="{ data }">
					<div class="flex items-start gap-2 w-full">
						<!-- <span class="step-badge shrink-0">
							{{ positionById.get(data.id) }}
						</span> -->
						<template v-if="editingId === data.id">
							<div class="flex flex-col gap-1 w-full">
								<InputText
									v-model="draft.title"
									size="small"
									placeholder="Step title"
									@keydown.enter="saveEdit" />
								<Textarea
									v-model="draft.description"
									rows="2"
									autoResize
									size="small"
									placeholder="Description (optional)"
									class="!text-xs" />
							</div>
						</template>
						<template v-else>
							<div class="min-w-0">
								<div class="font-medium leading-tight break-words">
									{{ data.title }}
								</div>
								<div
									v-if="data.description"
									class="text-xs text-gray-500 dark:text-gray-400 break-words">
									{{ data.description }}
								</div>
							</div>
						</template>
					</div>
				</template>
			</Column>

			<!-- <Column
				field="duration"
				header="Days"
				class="!w-24 text-center"
				bodyClass="!text-center !align-top">
				<template #body="{ data }">
					<span v-if="editingId !== data.id">
						{{ data.duration ? formatNumber(data.duration) : '—' }}
					</span>
					<InputNumber
						v-else
						v-model="draft.duration"
						:min="0"
						size="small"
						:inputClass="'!w-16'"
						mode="decimal"
						:minFractionDigits="0"
						:maxFractionDigits="2" />
				</template>
			</Column> -->

			<Column header="" class="!w-28" bodyClass="!text-center !align-top">
				<template #body="{ data }">
					<div class="flex justify-center gap-1">
						<template v-if="editingId === data.id">
							<Button
								icon="pi pi-check"
								severity="success"
								text
								rounded
								size="small"
								:loading="saving"
								aria-label="Save step"
								v-tooltip.top="'Save'"
								@click="saveEdit" />
							<Button
								icon="pi pi-times"
								severity="secondary"
								text
								rounded
								size="small"
								aria-label="Cancel"
								v-tooltip.top="'Cancel'"
								@click="cancelEdit" />
						</template>
						<template v-else>
							<Button
								icon="pi pi-pencil"
								text
								rounded
								size="small"
								aria-label="Edit step"
								v-tooltip.top="'Edit'"
								@click="startEdit(data)" />
							<Button
								icon="pi pi-trash"
								severity="danger"
								text
								rounded
								size="small"
								aria-label="Delete step"
								v-tooltip.top="'Delete'"
								@click="removeStep(data)" />
						</template>
					</div>
				</template>
			</Column>

		<template #expansion="{ data }">
			<div class="step-cost-panel">
				<StepCostEditor
					:stepId="data.id"
					:costs="costsByStepId.get(data.id) ?? []"
					:communityResources="communityResources"
					:saving="saving"
					:create="(input) => addCost(data.id, input)"
					:update="updateCost"
					:remove="removeCost" />
			</div>
		</template>

		<template #empty>
			<div class="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
				No steps yet.
			</div>
		</template>
	</DataTable>

	<div class="mt-2 flex justify-end">
		<Button
			label="Add step"
			icon="pi pi-plus"
			size="small"
			@click="openAddDialog" />
	</div>

	<Dialog
		v-model:visible="addDialogVisible"
		header="Add Step"
		:modal="true"
		dismissableMask
		:style="{ width: '480px' }"
		:breakpoints="{ '520px': '95vw' }"
		show-effect="fadeIn"
		hide-effect="fadeOut">
		<div class="flex flex-col gap-2 pt-1">
			<div class="form-field !mb-0">
				<label class="!text-xs">Step title *</label>
				<InputText
					v-model="newTitle"
					placeholder="New step title"
					@keydown.enter="onAdd" />
			</div>
			<div class="form-field !mb-0">
				<label class="!text-xs">Description</label>
				<Textarea
					v-model="newDescription"
					rows="2"
					autoResize
					placeholder="Description (optional)" />
			</div>
			<!-- <div class="form-field !mb-0">
				<label class="!text-xs">Duration (days)</label>
				<InputNumber
					v-model="newDuration"
					:min="0"
					showButtons
					:maxFractionDigits="2" />
			</div> -->
		</div>

		<template #footer>
			<div class="flex justify-end gap-2">
				<Button label="Cancel" text @click="addDialogVisible = false" />
				<Button
					label="Add"
					icon="pi pi-plus"
					size="small"
					:loading="saving"
					:disabled="!newTitle.trim()"
					@click="onAdd" />
			</div>
		</template>
	</Dialog>
</div>
</template>

<style scoped>
.step-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 1.25rem;
	height: 1.25rem;
	padding: 0 0.25rem;
	border-radius: 9999px;
	font-size: 0.7rem;
	font-weight: 600;
	background: var(--p-primary-color, #6b7280);
	color: var(--p-primary-contrast-color, #fff);
}

.steps-table :deep(.p-datatable-tbody > tr > td) {
	vertical-align: top;
}

.step-cost-panel {
	padding: 0.5rem 0.25rem;
}
</style>
