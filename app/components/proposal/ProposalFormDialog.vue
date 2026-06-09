<script setup lang="ts">
defineProps<{
	saving?: boolean
	editMode?: boolean
}>()

const visible = defineModel<boolean>('visible', { default: false })
const form = defineModel<{ title: string; body: string }>('form', { default: { title: '', body: '' } })

const emit = defineEmits<{
	save: []
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
				<label for="proposal-body">Description</label>
				<Textarea
					id="proposal-body"
					v-model="form.body"
					placeholder="Describe the proposal"
					rows="3" />
			</div>
		</div>
		<template #footer>
			<div class="flex justify-end gap-2">
				<Button label="Cancel" text @click="visible = false" />
				<Button
					:label="editMode ? 'Save' : 'Create'"
					:loading="saving"
					:disabled="!form.title.trim()"
					@click="$emit('save')" />
			</div>
		</template>
	</Dialog>
</template>
