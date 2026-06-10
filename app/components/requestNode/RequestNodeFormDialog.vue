<script setup lang="ts">
interface ExpertiseOption {
	id: number
	title: string
}

defineProps<{
	saving?: boolean
	editMode?: boolean
	expertiseOptions?: ExpertiseOption[]
}>()

const visible = defineModel<boolean>('visible', { default: false })
const form = defineModel<{ title: string; body: string; expertiseNodeId: number | null }>('form', { default: { title: '', body: '', expertiseNodeId: null } })

const emit = defineEmits<{
	save: []
}>()
</script>

<template>
	<Dialog
		v-model:visible="visible"
		:header="editMode ? 'Edit Node' : 'New Node'"
		:modal="true"
		dismissableMask
		:style="{ width: '450px' }"
		:breakpoints="{ '640px': '95vw' }"
		show-effect="fadeIn"
		hide-effect="fadeOut">
		<div class="flex flex-col gap-3 pt-1">
			<div class="form-field">
				<label for="node-title">Title *</label>
				<InputText
					id="node-title"
					v-model="form.title"
					placeholder="Node title"
					autofocus
					@keydown.enter="$emit('save')" />
			</div>
			<div class="form-field">
				<label for="node-body">Description</label>
				<Textarea
					id="node-body"
					v-model="form.body"
					placeholder="Describe the node"
					rows="3" />
			</div>
			<div class="form-field">
				<label for="node-expertise">Required Expertise</label>
				<Dropdown
					id="node-expertise"
					v-model="form.expertiseNodeId"
					:options="expertiseOptions ?? []"
					optionLabel="title"
					optionValue="id"
					placeholder="Select expertise (optional)"
					showClear
					class="w-full" />
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
