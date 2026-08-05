<script setup lang="ts">
import { computed, ref } from 'vue'
import ProposalSteps from '@/components/proposal/ProposalSteps.vue'
import ProposalComments from '@/components/proposal/ProposalComments.vue'

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
	width: props.editMode ? '720px' : '450px',
}))

const discussionTab = ref<'steps' | 'comments'>('steps')

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
		:modal="true"
		dismissableMask
		:style="dialogStyle"
		:breakpoints="{ '760px': '95vw' }"
		show-effect="fadeIn"
		hide-effect="fadeOut">
		<template #header>
			<span v-if="editMode">
				Edit Proposal (author:
				<NuxtLink
					:to="`/dash/users/${ownerName}`"
					class="underline hover:opacity-70">
					{{ ownerName }} </NuxtLink
				>)
			</span>
			<span v-else>Create Proposal</span>
		</template>
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
					<label for="proposal-duration">Duration</label>
					<InputNumber
						id="proposal-duration"
						v-model="form.duration"
						:min="0"
						:inputStyle="{ width: '6rem' }"
						showButtons
						suffix="d"
						:maxFractionDigits="2" />
				</div>
				<div class="form-field">
					<label>{{ !approvedAt ? 'Approval' : 'Approval Date' }} </label>
					<p class="text-gray-600 dark:text-gray-400">
						{{ !approvedAt ? 'Pending' : formatApprovalDate(approvedAt) }}
					</p>
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

			<Tabs
				v-if="editMode && proposalId"
				v-model:value="discussionTab"
				class="-m-1">
				<TabList :pt="{ tabList: { class: 'justify-center' } }">
					<Tab value="steps">
						<i class="pi pi-list-check mr-2" />
						Steps Feasibility
					</Tab>
					<Tab value="comments">
						<i class="pi pi-comments mr-2" />
						Comments
					</Tab>
				</TabList>
				<TabPanels>
					<TabPanel value="steps">
						<ProposalSteps
							:proposalId="proposalId"
							:onCostsChanged="onCostsChanged" />
					</TabPanel>
					<TabPanel value="comments">
						<ProposalComments :proposalId="proposalId" />
					</TabPanel>
				</TabPanels>
			</Tabs>
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
