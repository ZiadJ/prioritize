import { ref, type Ref, type ShallowRef, computed, watch } from 'vue'
import type AutoComplete from 'primevue/autocomplete'

export interface Tag {
	id: number
	name: string
}

	export interface UseTagAutocompleteOptions {
		tagAutocomplete: Ref<any> | ShallowRef<any>,
		tags: Tag[]
		createTagMutation: (name: string) => Promise<Tag>
		getSelectedTagIds?: () => Set<number> | number[]
	}

export const useTagAutocomplete = (options: UseTagAutocompleteOptions) => {
	const { tagAutocomplete, tags, createTagMutation, getSelectedTagIds } =
		options

	const availableTags = ref<Tag[]>([])
	const tagSuggestions = ref<Tag[]>([])
	const tagSearch = ref('')
//tagAutocomplete.
	const fetchTags = async (newTags?: Tag[]) => {
		try {
			if (newTags) {
				availableTags.value = newTags
			} else {
				availableTags.value = tags
			}
		} catch (error: any) {
			console.error('Failed to fetch tags:', error)
		}
	}

	const excludedTagIds = computed(() => {
		const ids = getSelectedTagIds?.() ?? new Set()
		return ids instanceof Set ? ids : new Set(ids)
	})

	const filterSuggestions = () => {
		tagSuggestions.value = availableTags.value.filter(
			tag => !excludedTagIds.value.has(tag.id),
		)
	}

	watch(
		availableTags,
		() => {
			filterSuggestions()
		},
		{ immediate: true },
	)

	watch(excludedTagIds, () => {
		filterSuggestions()
	})

	const searchTags = (event: { query: string }) => {
		const query = event.query || ''
		tagSearch.value = query

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

		try {
			const newTag = await createTagMutation(tagName)

			availableTags.value = [...availableTags.value, newTag]
			tagSearch.value = ''
			tagSuggestions.value = availableTags.value.filter(
				tag => !excludedTagIds.value.has(tag.id)
			);

			// Clear the AutoComplete input
			(tagAutocomplete.value as any).$el.querySelector('input').value = '';
			(tagAutocomplete.value as any).hide()

			return newTag
		} catch (error: any) {
			console.error('Failed to create tag:', error)
			throw error
		}
	}

	return {
		tagSuggestions,
		tagSearch,
		searchTags,
		addNewTag,
		fetchTags,
	}
}
