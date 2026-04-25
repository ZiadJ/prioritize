<template>
		<AutoComplete
			ref="tagAutocomplete"
			v-model="selectedTags"
			:suggestions="tagSuggestions"
			@complete="searchTags"
			optionLabel="name"
			:multiple="true"
			:dropdown="true"
			:disabled="disabled"
			:placeholder="placeholder"
			class="w-full"
			@keydown.enter.stop="addNewTag">
			<template #empty>
				<Button
					v-if="tagSearch && tagSearch.trim()"
					label="Create tag"
					size="small"
					text
					@click="addNewTag" />
			</template>
		</AutoComplete>
</template>

<script lang="ts" setup>
import { ref, computed, watch, onMounted, type ShallowRef } from 'vue'
import type AutoComplete from 'primevue/autocomplete'
import { useTemplateRef } from 'vue'

export interface Tag {
	id: number
	name: string
}

export interface TagsComponentProps {
	tags: Tag[]
	modelValue: Tag[]
	disabled?: boolean
	placeholder?: string
}

export interface TagsComponentEmits {
	(e: 'update:modelValue', value: Tag[]): void
	(e: 'tag-created', tag: Tag): void
	(e: 'search', query: string): void
}

const props = withDefaults(defineProps<TagsComponentProps>(), {
	tags: () => [],
	modelValue: () => [],
	disabled: false,
	placeholder: 'Search or create tags',
})

const emit = defineEmits<TagsComponentEmits>()

const tagAutocomplete = useTemplateRef('tagAutocomplete')

const availableTags = ref<Tag[]>([])
const tagSuggestions = ref<Tag[]>([])
const tagSearch = ref('')
const selectedTags = ref<Tag[]>([])

const excludedTagIds = computed(() => {
	return new Set(selectedTags.value.map(t => t.id))
})

const filterSuggestions = () => {
	tagSuggestions.value = availableTags.value.filter(
		tag => !excludedTagIds.value.has(tag.id),
	)
}

const updateAvailableTags = (newTags?: Tag[]) => {
	if (newTags) {
		availableTags.value = newTags
	} else {
		availableTags.value = props.tags
	}
	filterSuggestions()
}

watch(
	() => props.tags,
	() => {
		updateAvailableTags()
	},
	{ immediate: true },
)

watch(excludedTagIds, () => {
	filterSuggestions()
})

watch(
	() => props.modelValue,
	newVal => {
		selectedTags.value = newVal
	},
	{ immediate: true },
)

watch(selectedTags, newVal => {
	emit('update:modelValue', newVal)
})

const searchTags = (event: { query: string }) => {
	const query = event.query || ''
	tagSearch.value = query

	emit('search', query)

	if (!query) {
		filterSuggestions()
		return
	}

	const filtered = availableTags.value.filter(
		tag =>
			tag.name.toLowerCase().startsWith(query.toLowerCase()) &&
			!excludedTagIds.value.has(tag.id),
	)
	tagSuggestions.value = filtered
}

const addNewTag = async () => {
	const tagName = tagSearch.value.trim()
	if (!tagName) return

	// Don't create if user is selecting from existing suggestions
	if (tagSuggestions.value.length > 0) {
		return
	}

	// Create a temporary tag object to emit
	const newTag: Tag = {
		id: Date.now(), // temporary ID, will be replaced by server response
		name: tagName,
	}

	availableTags.value = [...availableTags.value, newTag]
	selectedTags.value = [...selectedTags.value, newTag]
	tagSearch.value = ''
	filterSuggestions()

	// Clear the AutoComplete input
	;(tagAutocomplete.value as any).$el.querySelector('input').value = ''
	;(tagAutocomplete.value as any).hide?.()

	emit('tag-created', newTag)
	emit('update:modelValue', selectedTags.value)
}

const addTagFromExternal = (tag: Tag) => {
	// Replace temporary tag with real server tag
	const idx = availableTags.value.findIndex(
		t => t.id === tag.id || t.name === tag.name,
	)
	if (idx !== -1) {
		availableTags.value[idx] = tag
	}
	// Also update in selected tags
	const selIdx = selectedTags.value.findIndex(
		t => t.id === tag.id || t.name === tag.name,
	)
	if (selIdx !== -1) {
		selectedTags.value[selIdx] = tag
	}
	filterSuggestions()
}

defineExpose({
	addTagFromExternal,
	tagSearch,
	tagSuggestions,
	availableTags,
	selectedTags,
	filterSuggestions,
})
</script>


