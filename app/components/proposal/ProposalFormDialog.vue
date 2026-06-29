<script setup lang="ts">
defineProps<{
	saving?: boolean
	deleting?: boolean
	editMode?: boolean
	isOwner?: boolean
	ownerName?: string
}>()

const visible = defineModel<boolean>('visible', { default: false })
const form = defineModel<{ title: string; description: string; isActive: boolean }>('form', { default: { title: '', description: '', isActive: true } })

const emit = defineEmits<{
	save: []
	delete: []
}>()
</script>

<template>
	<Dialog
		v-model:visible="visible"
		:header="editMode ? 'Edit Proposal' : 'New Proposal'"
		:modal="true"
		dismissableMask
		:style="{ width: '450px' }"
		:breakpoints="{ '640px': '95vw' }"
		show-effect="fadeIn"
		hide-effect="fadeOut">
		<div class="flex flex-col gap-3 pt-1">
			<div class="form-field">
				<label for="proposal-title">Title *</label>
				<InputText
					id="proposal-title"
					v-model="form.title"
					placeholder="Proposal title"
					autofocus
					@keydown.enter="$emit('save')" />
			</div>
			<div class="form-field">
				<label for="proposal-description">Description</label>
				<Textarea
					id="proposal-description"
					v-model="form.description"
					placeholder="Describe the proposal"
					rows="3" />
			</div>
			<div v-if="editMode && ownerName" class="form-field">
				<label>Author</label>
				<p class="mb-1 text-sm text-gray-600 dark:text-gray-400">{{ ownerName }}</p>
			</div>
			<div v-if="editMode && isOwner" class="form-field">
				<div class="flex items-center gap-2">
					<Checkbox v-model="form.isActive" :binary="true" inputId="proposal-active" />
					<label for="proposal-active">Active</label>
				</div>
			</div>
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
