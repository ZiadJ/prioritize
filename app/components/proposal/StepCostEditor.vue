<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { MeasurementType } from '~~/prisma/generated/client/enums'
import Quantity from '~/components/requests/Quantity.vue'
import type {
	StepCostInput,
	StepCostPatch,
	StepCostRow,
	CommunityResourceOption,
} from '~/composables/request/useStepCosts'
import {
	evaluateStepCostFeasibilities,
	type StepCostEvaluation,
} from '~/composables/request/useStepCosts'

/**
 * Stateless view over a step's costs. The cost list and all mutations are
 * owned by the proposal-level composable (`useProposalSteps`) and passed
 * down, so the list is already available the instant this row is expanded
 * (no per-row network fetch).
 */
const props = defineProps<{
	stepId: number
	costs: StepCostRow[]
	allCosts?: StepCostRow[]
	communityResources: CommunityResourceOption[]
	saving?: boolean
	create: (input: StepCostInput) => Promise<void>
	update: (id: number, patch: StepCostPatch) => Promise<void>
	remove: (cost: StepCostRow) => void
}>()

// const measurementTypeOptions = Object.keys(MeasurementType).map(key => ({
// 	label: key,
// 	value: key as MeasurementType,
// }))

interface CostForm {
	title: string
	description: string
	communityResourceId: number | null
	measurementType: MeasurementType
	quantity: number | undefined
	quantityMargin: number
	monetaryValue: number
}

function emptyForm(): CostForm {
	return {
		title: '',
		description: '',
		communityResourceId: null,
		measurementType: MeasurementType.Units,
		quantity: 0,
		quantityMargin: 0,
		monetaryValue: 0,
	}
}

const visible = ref(false)
const form = ref<CostForm>(emptyForm())
const editingId = ref<number | null>(null)

// Reset the form whenever the step changes so a stale draft from a
// previously expanded step never leaks into a new one.
watch(
	() => props.stepId,
	() => {
		visible.value = false
		resetForm()
	},
)

function resetForm() {
	form.value = emptyForm()
	editingId.value = null
}

function openAdd() {
	resetForm()
	visible.value = true
}

function startEdit(cost: StepCostRow) {
	editingId.value = cost.id
	form.value = {
		title: cost.title,
		description: cost.description ?? '',
		communityResourceId: cost.communityResourceId,
		measurementType: cost.measurementType,
		quantity: cost.quantity,
		quantityMargin: cost.quantityMargin,
		monetaryValue: cost.monetaryValue,
	}
	visible.value = true
}

const isEditing = computed(() => editingId.value != null)
const canSave = computed(
	() =>
		form.value.title.trim().length > 0 &&
		form.value.communityResourceId != null,
)

// Per-cost evaluation across the whole proposal's cost list, so each row's
// gauge and "used / remaining" reflect every cost already consumed across
// all steps (not just this step). Falls back to this step's costs when no
// proposal-wide list is passed (e.g. when the editor is used standalone).
// `allCosts` shares row references with the rendered `costs`, so lookups by
// identity always hit.
const evaluationByCost = computed(() => {
	const ctx = props.allCosts ?? props.costs
	const evaluations = evaluateStepCostFeasibilities(ctx)
	const map = new Map<StepCostRow, StepCostEvaluation>()
	for (let i = 0; i < ctx.length; i++) {
		const row = ctx[i]
		const evaluation = evaluations[i]
		if (row != null && evaluation != null) map.set(row, evaluation)
	}
	return map
})

const getFeasibilityFor = (cost: StepCostRow): number =>
	evaluationByCost.value.get(cost)?.feasibility ?? 1

const getAvailableQuantityFor = (cost: StepCostRow): number | null =>
	evaluationByCost.value.get(cost)?.availableQuantity ?? null

// const stepFeasibilityProduct = computed(() => stepFeasibility(props.costs))

function feasibilityColor(value: number): string {
	if (value < 0 || !Number.isFinite(value))
		return 'var(--p-red-500, #ef4444)'
	if (value >= 0.66) return 'var(--p-green-500, #22c55e)'
	if (value >= 0.33) return 'var(--p-yellow-500, #eab308)'
	return 'var(--p-red-500, #ef4444)'
}

// Default the cost's measurement type to that of the selected resource so
// the Quantity unit dropdown reflects how that resource is measured.
function onCommunityResourceChange() {
	const cr = props.communityResources.find(
		c => c.id === form.value.communityResourceId,
	)
	if (cr?.resource?.measurementType) {
		form.value.measurementType = cr.resource.measurementType
	}
}

async function onSave() {
	if (!canSave.value) return
	const payload: StepCostInput = {
		title: form.value.title.trim(),
		description: form.value.description.trim(),
		communityResourceId: form.value.communityResourceId!,
		measurementType: form.value.measurementType,
		quantity: form.value.quantity ?? 0,
		quantityMargin: form.value.quantityMargin ?? 0,
		monetaryValue: form.value.monetaryValue ?? 0,
	}
	if (isEditing.value) {
		await props.update(editingId.value!, payload)
	} else {
		await props.create(payload)
	}
	visible.value = false
	resetForm()
}
</script>

<template>
	<div class="step-cost-editor">
		<div class="flex items-center justify-between px-2">
			<div class="flex items-center gap-1">
			<span
				class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
					Costs
					<span v-if="costs.length" class="font-normal"
						>({{ costs.length }})</span
					>
				</span>
			<!-- The step-level feasibility product is already shown on the step row
			  	 in ProposalSteps.vue, so it's omitted here to avoid repetition.
			<span
				v-if="costs.length"
				class="text-xs text-gray-500 dark:text-gray-400 ml-2"
				>Feasibility</span
			>
			<Knob
				v-if="costs.length"
				:modelValue="stepFeasibilityProduct"
				:min="0"
				:max="1"
				:step="0.01"
				:size="36"
				readonly
				:valueColor="feasibilityColor(stepFeasibilityProduct)"
				rangeColor="#8882"
				pt:text:class="hidden" />
			-->
			</div>
			<Button
				label="Add cost"
				icon="pi pi-plus"
				size="small"
				text
				rounded
				aria-label="Add step cost"
				@click="openAdd" />
		</div>

		<div v-if="costs.length" class="flex flex-col gap-1">
			<div
				v-for="cost in costs"
				:key="cost.id"
				class="flex items-center gap-2 px-2 py-1 rounded text-sm">
				<div class="min-w-0 flex-1">
					<div class="font-medium leading-tight truncate">
						{{ cost.title }}
						<span v-if="!cost.isActive" class="text-xs text-gray-400"
							>(inactive)</span
						>
					</div>
					<div class="text-xs text-gray-500 dark:text-gray-400 truncate">
						{{ cost.communityResource?.resource?.title ?? 'No resource' }}
						·
						<Quantity
							v-if="cost.quantity"
							:modelValue="cost.quantity"
							:measurementType="cost.measurementType"
							readonly />
						<template v-if="getAvailableQuantityFor(cost) != null">
							/
						</template>
						<Quantity
							v-if="getAvailableQuantityFor(cost) != null"
							:modelValue="getAvailableQuantityFor(cost) ?? 0"
							:measurementType="cost.measurementType"
							readonly />
						<span v-if="cost.monetaryValue">
							· ${{ formatNumber(cost.monetaryValue) }}</span
						>
					</div>
				</div>
				<Knob
					:modelValue="getFeasibilityFor(cost)"
					:min="0"
					:max="1"
					:step="0.01"
					:size="36"
					readonly
					:valueColor="feasibilityColor(getFeasibilityFor(cost))"
					rangeColor="#8882"
					v-tooltip.top="`Feasibility: ${(getFeasibilityFor(cost) * 100).toFixed(0)}%`"
					pt:text:class="hidden" />
				<div class="flex gap-1 shrink-0">
					<Button
						icon="pi pi-pencil"
						text
						rounded
						size="small"
						aria-label="Edit step cost"
						v-tooltip.top="'Edit'"
						@click="startEdit(cost)" />
					<Button
						icon="pi pi-trash"
						severity="danger"
						text
						rounded
						size="small"
						aria-label="Delete step cost"
						v-tooltip.top="'Delete'"
						@click="remove(cost)" />
				</div>
			</div>
		</div>

		<div
			v-else
			class="text-center text-sm text-gray-500 dark:text-gray-400 py-3">
			No costs yet.
		</div>
	</div>

	<Dialog
		v-model:visible="visible"
		:header="isEditing ? 'Edit Step Cost' : 'Add Step Cost'"
		:modal="true"
		dismissableMask
		:style="{ width: '520px' }"
		:breakpoints="{ '560px': '95vw' }"
		show-effect="fadeIn"
		hide-effect="fadeOut">
		<div class="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
			<div class="form-field !mb-0 md:col-span-2">
				<label class="!text-xs">Cost title *</label>
				<InputText v-model="form.title" placeholder="e.g. Volunteer hours" />
			</div>

			<div class="form-field !mb-0 md:col-span-2">
				<label class="!text-xs">Community resource *</label>
				<Dropdown
					v-model="form.communityResourceId"
					:options="communityResources"
					optionLabel="resource.title"
					optionValue="id"
					placeholder="Select resource"
					:filter="true"
					@change="onCommunityResourceChange" />
			</div>

			<!-- 
			<div class="form-field !mb-0">
				<label class="!text-xs">Measurement type</label>
				<Dropdown
					v-model="form.measurementType"
					:options="measurementTypeOptions"
					optionLabel="label"
					optionValue="value" />
			</div>
			-->

			<div class="form-field !mb-0">
				<label class="!text-xs">Quantity</label>
				<Quantity
					v-model="form.quantity"
					:measurementType="form.measurementType" />
			</div>

			<div class="form-field !mb-0">
				<label class="!text-xs">Margin</label>
				<InputNumber
					v-model="form.quantityMargin"
					:min="0"
					:maxFractionDigits="2"
					showButtons />
			</div>

			<div class="form-field !mb-0 md:col-span-2">
				<label class="!text-xs">Monetary value</label>
				<InputNumber
					v-model="form.monetaryValue"
					:min="0"
					:maxFractionDigits="2" 
					placeholder="Auto-calculated when empty (not yet implemented)" />
			</div>
		</div>

		<template #footer>
			<div class="flex justify-end gap-2">
				<Button label="Cancel" text @click="visible = false" />
				<Button
					:label="isEditing ? 'Save cost' : 'Add cost'"
					icon="pi pi-check"
					:loading="saving"
					:disabled="!canSave"
					@click="onSave" />
			</div>
		</template>
	</Dialog>
</template>
