<script setup lang="ts">
import { computed } from 'vue'
import ProposalSteps from '@/components/proposal/ProposalSteps.vue'

const props = defineProps<{
	saving?: boolean
	deleting?: boolean
	editMode?: boolean
	isOwner?: boolean
	ownerName?: string
	proposalId?: number
	approvedAt?: string | Date | null
	netBenefit?: number
	netFeasibility?: number
	onCostsChanged?: () => void | Promise<void>
}>()

const visible = defineModel<boolean>('visible', { default: false })
const form = defineModel<{
	title: string
	description: string
	isActive: boolean
	duration: number
}>('form', {
	default: { title: '', description: '', isActive: true, duration: 0 },
})

const emit = defineEmits<{
	save: []
	delete: []
}>()

const dialogStyle = computed(() => ({
	width: props.editMode ? '680px' : '450px',
}))

function formatApprovalDate(value: string | Date | null | undefined) {
	if (!value) return ''
	return new Date(value).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})
}
</script>

<template>
	<Dialog
		v-model:visible="visible"
		:header="editMode ? 'Edit Proposal' : 'New Proposal'"
		:modal="true"
		dismissableMask
		:style="dialogStyle"
		:breakpoints="{ '760px': '95vw' }"
		show-effect="fadeIn"
		hide-effect="fadeOut">
		<div class="flex flex-col gap-3 pt-1">
			<div class="flex gap-4 items-start">
				<div class="form-field flex-1">
					<label for="proposal-title">Title *</label>
					<InputText
						id="proposal-title"
						v-model="form.title"
						placeholder="Proposal title"
						autofocus
						@keydown.enter="$emit('save')" />
				</div>
				<div class="form-field">
					<label for="proposal-duration">Duration (days)</label>
					<InputNumber
						id="proposal-duration"
						v-model="form.duration"
						:min="0"
						:inputStyle="{ width: '6rem' }"
						showButtons
						:maxFractionDigits="2" />
				</div>
			</div>
			<div class="form-field">
				<label for="proposal-description">Description</label>
				<Textarea
					id="proposal-description"
					v-model="form.description"
					placeholder="Describe the proposal"
					rows="3" />
			</div>
			<div v-if="editMode" class="form-field items-center mt-2">
				<div class="grid grid-cols-2 gap-x-8 gap-y-2">
					<div class="flex flex-col gap-0.5">
						<label>Author</label>
						<p class="text-gray-600 dark:text-gray-400">
							<NuxtLink
								:to="`/dash/users/${ownerName}`"
								class="underline hover:opacity-70">
								{{ ownerName }}
							</NuxtLink>
						</p>
					</div>
					<div class="flex flex-col gap-0.5">
						<label>{{ !approvedAt ? 'Approval' : 'Approval Date' }} </label>
						<p class="text-gray-600 dark:text-gray-400">
							{{ !approvedAt ? 'Pending' : formatApprovalDate(approvedAt) }}
						</p>
					</div>
					<div class="flex flex-col gap-0.5">
						<label>Net Benefit</label>
						<p class="text-gray-600 dark:text-gray-400">
							{{ netBenefit ?? 0 }}
						</p>
					</div>
					<div class="flex flex-col gap-0.5">
						<label>Net Feasibility</label>
						<p class="text-gray-600 dark:text-gray-400">
							{{ formatNumber((netFeasibility ?? 0) * 100, 0) }}%
						</p>
					</div>
				</div>
			</div>
			<!--<div v-if="editMode && isOwner" class="form-field">
				<div class="flex items-center gap-2">
					<Checkbox
						v-model="form.isActive"
						:binary="true"
						inputId="proposal-active" />
					<label for="proposal-active">Active</label>
				</div>
			</div>-->

			<Divider v-if="editMode && proposalId" align="left" class="-m-1">
				Proposal Steps & Costs
			</Divider>
			<ProposalSteps
				v-if="editMode && proposalId"
				:proposalId="proposalId"
				:onCostsChanged="onCostsChanged" />
		</div>

		<template #footer>
			<div class="flex items-center justify-between w-full">
				<Button
					v-if="editMode"
					icon="pi pi-trash"
					severity="danger"
					text
					rounded
					:loading="deleting"
					aria-label="Delete proposal"
					v-tooltip.top="'Delete proposal'"
					@click="$emit('delete')" />
				<div class="flex gap-2">
					<Button label="Cancel" text @click="visible = false" />
					<Button
						:label="editMode ? 'Save' : 'Create'"
						:loading="saving"
						:disabled="!form.title.trim()"
						@click="$emit('save')" />
				</div>
			</div>
		</template>
	</Dialog>
</template>
