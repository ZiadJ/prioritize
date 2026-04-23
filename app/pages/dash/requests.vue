<script lang="ts" setup>
definePageMeta({
	layout: 'dashboard',
})

const { $trpcClient } = useNuxtApp()
const toast = usePausableToast()
const { data: session } = useAuth()

const requests = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const searchQuery = ref('')
const selectedRequests = ref<any[]>([])

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'update' | 'view'>('create')
const requestToDelete = ref<any>(null)
const deleteDialogVisible = ref(false)

const formData = ref({
	title: '',
	body: '',
	type: 0,
	level: 0,
	recurrencePeriod: 0,
	isActive: true,
	tagIds: [] as number[],
	selectedTags: [] as any[],
})

const availableTags = ref<any[]>([])
const tagSuggestions = ref<any[]>([])
const tagSearch = ref('')
const tagAutocomplete = useTemplateRef('tagAutocomplete')

const searchTags = (event: { query: string }) => {
	const query = event.query || ''
	tagSearch.value = query

	const excludeIds = new Set(formData.value.selectedTags.map((t: any) => t.id))

	if (!query) {
		tagSuggestions.value = availableTags.value.filter(
			tag => !excludeIds.has(tag.id),
		)
		return
	}

	const filtered = availableTags.value.filter(
		tag =>
			tag.name.toLowerCase().startsWith(query.toLowerCase()) &&
			!excludeIds.has(tag.id),
	)
	tagSuggestions.value = filtered
}

const addNewTag = async () => {
	const tagName = tagSearch.value.trim()
	if (!tagName) return

	// Don't create if autocomplete shows suggestions - user is selecting from list
	if (tagSuggestions.value.length > 0) {
		return
	}

	try {
		const newTag = await $trpcClient.requests.createTag.mutate({
			name: tagName,
		})

		formData.value.selectedTags = [...formData.value.selectedTags, newTag]

		tagSearch.value = ''
		tagSuggestions.value = [...availableTags.value];

		// Clear the AutoComplete input
		(tagAutocomplete.value as any).$el.querySelector('input').value = '';
		(tagAutocomplete.value as any).hide()
	} catch (error) {
		console.error('Failed to create tag:', error)
		toast.addObject({
			severity: 'error',
			summary: 'Error',
			detail: 'Failed to create tag',
			life: 0,
		})
	}
}

const typeOptions = [
	{ label: 'Emotional', value: 0 },
	{ label: 'Observational', value: 1 },
	{ label: 'Material', value: 2 },
]

const levelOptions = [
	{ label: 'Safety', value: 0 },
	{ label: 'Health', value: 1 },
	{ label: 'Belonging', value: 2 },
	{ label: 'Esteem', value: 3 },
	{ label: 'Self-Actualization', value: 4 },
]

const getTypeLabel = (type: number) => typeOptions[type]?.label || 'Unknown'
const getTypeSeverity = (type: number) => {
	const severities = ['warn', 'info', 'success']
	return severities[type] || 'secondary'
}

const getLevelLabel = (level: number) => levelOptions[level]?.label || 'Unknown'
const getLevelSeverity = (level: number) => {
	if (level <= 1) return 'danger'
	if (level <= 2) return 'warn'
	return 'success'
}

const fetchRequests = async () => {
	loading.value = true
	try {
		const result = await $trpcClient.requests.list.query({
			search: searchQuery.value || undefined,
		})
		requests.value = result || []
	} catch (error) {
		console.error('Failed to fetch requests:', error)
		toast.addObject({
			severity: 'error',
			summary: 'Error',
			detail: 'Failed to fetch requests',
			life: 3000,
		})
	} finally {
		loading.value = false
	}
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
const debouncedSearch = () => {
	if (searchTimeout) clearTimeout(searchTimeout)
	searchTimeout = setTimeout(() => {
		fetchRequests()
	}, 300)
}

const openNewDialog = () => {
	formData.value = {
		title: '',
		body: '',
		type: 0,
		level: 0,
		recurrencePeriod: 0,
		isActive: true,
		tagIds: [],
		selectedTags: [],
	}
	tagSearch.value = ''
	tagSuggestions.value = availableTags.value
	dialogMode.value = 'create'
	dialogVisible.value = true
}

const viewRequest = (request: any) => {
	const tags = request.tags || []
	tagSearch.value = ''
	formData.value = {
		title: request.title,
		body: request.body,
		type: request.type,
		level: request.level,
		recurrencePeriod: request.recurrencePeriod,
		isActive: request.isActive,
		tagIds: tags.map((t: any) => t.id) || [],
		selectedTags: tags,
	}
	dialogMode.value = 'view'
	dialogVisible.value = true
}

const editRequest = (request: any) => {
	const tags = request.tags || []
	tagSearch.value = ''
	formData.value = {
		title: request.title,
		body: request.body,
		type: request.type,
		level: request.level,
		recurrencePeriod: request.recurrencePeriod,
		isActive: request.isActive,
		tagIds: tags.map((t: any) => t.id) || [],
		selectedTags: tags,
	}
	tagSuggestions.value = availableTags.value
	dialogMode.value = 'update'
	currentRequestId.value = request.id
	dialogVisible.value = true
}

const currentRequestId = ref<number | null>(null)

const saveRequest = async () => {
	if (!formData.value.title) {
		toast.addObject({
			severity: 'warn',
			summary: 'Warning',
			detail: 'Title is required',
			life: 3000,
		})
		return
	}

	const tagIds =
		formData.value.selectedTags?.map((t: any) => t.id) ||
		formData.value.tagIds ||
		[]

	saving.value = true
	try {
		if (dialogMode.value === 'create') {
			await $trpcClient.requests.create.mutate({
				title: formData.value.title,
				body: formData.value.body,
				type: formData.value.type,
				level: formData.value.level,
				recurrencePeriod: formData.value.recurrencePeriod,
				tagIds,
			})
			toast.addObject({
				severity: 'success',
				summary: 'Success',
				detail: 'Request created successfully',
				life: 3000,
			})
		} else if (dialogMode.value === 'update' && currentRequestId.value) {
			await $trpcClient.requests.update.mutate({
				id: currentRequestId.value,
				title: formData.value.title,
				body: formData.value.body,
				type: formData.value.type,
				level: formData.value.level,
				recurrencePeriod: formData.value.recurrencePeriod,
				isActive: formData.value.isActive,
				tagIds,
			})
			toast.addObject({
				severity: 'success',
				summary: 'Success',
				detail: 'Request updated successfully',
				life: 3000,
			})
		}
		dialogVisible.value = false
		fetchRequests()
	} catch (error: any) {
		console.error('Failed to save request:', error)
		const message =
			error?.message ||
			error?.cause?.message ||
			JSON.stringify(error) ||
			'Failed to save request'
		toast.addObject({ severity: 'error', summary: 'Error', detail: message, life: 0 })
	} finally {
		saving.value = false
	}
}

const confirmDelete = (request: any) => {
	requestToDelete.value = request
	deleteDialogVisible.value = true
}

const deleteRequest = async () => {
	if (!requestToDelete.value) return

	deleting.value = true
	try {
		await $trpcClient.requests.delete.mutate({ id: requestToDelete.value.id })
		toast.addObject({
			severity: 'success',
			summary: 'Success',
			detail: 'Request deleted successfully',
			life: 3000,
		})
		deleteDialogVisible.value = false
		fetchRequests()
	} catch (error) {
		console.error('Failed to delete request:', error)
		toast.addObject({
			severity: 'error',
			summary: 'Error',
			detail: 'Failed to delete request',
			life: 0,
		})
	} finally {
		deleting.value = false
	}
}

onMounted(async () => {
	fetchRequests()
	try {
		availableTags.value = (await $trpcClient.requests.listTags.query()) || []
		tagSuggestions.value = availableTags.value
	} catch (error) {
		console.error('Failed to fetch tags:', error)
	}
})
</script>

<template>
	<div class="requests-page">
		<div
			class="header-actions flex justify-content-between align-items-center mb-4">
			<h2 class="text-xl font-semibold m-0">Requests</h2>
			<div class="flex gap-2">
				<IconField>
					<InputIcon>
						<i class="pi pi-search" />
					</InputIcon>
					<InputText
						v-model="searchQuery"
						placeholder="Search requests..."
						@input="debouncedSearch"
						class="w-full" />
				</IconField>
				<Button label="New Request" icon="pi pi-plus" @click="openNewDialog" />
			</div>
		</div>

		<DataTable
			:value="requests"
			:loading="loading"
			:paginator="true"
			:rows="10"
			v-model:selection="selectedRequests"
			dataKey="id"
			:rowHover="true"
			stripedRows
			tableStyle="min-width: 50rem"
			class="p-datatable-sm">
			<Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
			<Column field="title" header="Title" sortable>
				<template #body="{ data }">
					<span class="font-semibold">{{ data.title }}</span>
				</template>
			</Column>
			<Column field="body" header="Description">
				<template #body="{ data }">
					<span class="line-clamp-2">{{ data.body || '-' }}</span>
				</template>
			</Column>
			<Column field="type" header="Type" sortable>
				<template #body="{ data }">
					<Tag
						:value="getTypeLabel(data.type)"
						:severity="getTypeSeverity(data.type)" />
				</template>
			</Column>
			<Column field="level" header="Level" sortable>
				<template #body="{ data }">
					<Tag
						:value="getLevelLabel(data.level)"
						:severity="getLevelSeverity(data.level)" />
				</template>
			</Column>
			<Column field="tags" header="Tags">
				<template #body="{ data }">
					<div class="flex flex-wrap gap-1">
						<Tag
							v-for="tag in data.tags"
							:key="tag.id"
							:value="tag.name"
							severity="info" />
					</div>
				</template>
			</Column>
			<Column field="_count" header="Children">
				<template #body="{ data }">
					<span>{{ data._count?.children || 0 }}</span>
				</template>
			</Column>
			<Column field="isActive" header="Status">
				<template #body="{ data }">
					<Tag
						:value="data.isActive ? 'Active' : 'Inactive'"
						:severity="data.isActive ? 'success' : 'danger'" />
				</template>
			</Column>
			<Column header="Actions" :exportable="false" style="min-width: 8rem">
				<template #body="{ data }">
					<div class="flex gap-1">
						<Button
							icon="pi pi-eye"
							text
							rounded
							severity="info"
							@click="viewRequest(data)"
							v-tooltip.top="'View'" />
						<Button
							v-if="session?.id === data.userId"
							icon="pi pi-pencil"
							text
							rounded
							severity="success"
							@click="editRequest(data)"
							v-tooltip.top="'Edit'" />
						<Button
							v-if="session?.id === data.userId"
							icon="pi pi-trash"
							text
							rounded
							severity="danger"
							@click="confirmDelete(data)"
							v-tooltip.top="'Delete'" />
					</div>
				</template>
			</Column>
			<template #empty>
				<div class="flex justify-content-center align-items-center p-4">
					<span class="text-zinc-500">No requests found.</span>
				</div>
			</template>
		</DataTable>

		<Dialog
			v-model:visible="dialogVisible"
			:header="
				dialogMode === 'create'
					? 'New Request'
					: dialogMode === 'update'
						? 'Edit Request'
						: 'View Request'
			"
			:modal="true"
			:style="{ width: '500px' }"
			:breakpoints="{ '960px': '90vw', '640px': '95vw' }">
			<div class="form-content gap-3">
				<div class="form-field">
					<label for="title">Title *</label>
					<InputText
						id="title"
						v-model="formData.title"
						:disabled="dialogMode === 'view'" />
				</div>
				<div class="form-field">
					<label for="body">Description</label>
					<Textarea
						id="body"
						v-model="formData.body"
						:disabled="dialogMode === 'view'"
						rows="3" />
				</div>
				<div class="form-row gap-3">
					<div class="form-field flex-1">
						<label for="type">Type</label>
						<Dropdown
							id="type"
							v-model="formData.type"
							:options="typeOptions"
							optionLabel="label"
							optionValue="value"
							:disabled="dialogMode === 'view'" />
					</div>
					<div class="form-field flex-1">
						<label for="level">Level</label>
						<Dropdown
							id="level"
							v-model="formData.level"
							:options="levelOptions"
							optionLabel="label"
							optionValue="value"
							:disabled="dialogMode === 'view'" />
					</div>
				</div>
				<div class="form-field">
					<label for="recurrence">Recurrence Period (days)</label>
					<InputNumber
						id="recurrence"
						v-model="formData.recurrencePeriod"
						:disabled="dialogMode === 'view'" />
				</div>
				<div class="form-field">
					<label for="tags">Tags</label>
					<AutoComplete
						ref="tagAutocomplete"
						v-model="formData.selectedTags"
						:suggestions="tagSuggestions"
						@complete="searchTags"
						optionLabel="name"
						:multiple="true"
						:dropdown="true"
						:disabled="dialogMode === 'view'"
						placeholder="Search or create tags"
						class="w-full"
						@keydown.enter.stop="addNewTag">
						<template #option="{ option }">
							<div>{{ option.name }}</div>
						</template>
						<template #empty>
							<Button
								v-if="tagSearch && tagSearch.trim()"
								label="Create tag"
								size="small"
								text
								@click="addNewTag" />
						</template>
					</AutoComplete>
				</div>
				<div v-if="dialogMode === 'update'" class="form-field">
					<label for="isActive">Status</label>
					<SelectButton
						id="isActive"
						v-model="formData.isActive"
						:options="[
							{ label: 'Active', value: true },
							{ label: 'Inactive', value: false },
						]"
						optionLabel="label"
						optionValue="value" />
				</div>
			</div>
			<template #footer>
				<div class="flex justify-content-end gap-2">
					<Button label="Cancel" text @click="dialogVisible = false" />
					<Button
						v-if="dialogMode !== 'view'"
						:label="dialogMode === 'create' ? 'Create' : 'Update'"
						@click="saveRequest"
						:loading="saving" />
				</div>
			</template>
		</Dialog>

		<Dialog
			v-model:visible="deleteDialogVisible"
			header="Confirm Delete"
			:modal="true"
			class="w-full md:w-4">
			<div class="flex align-items-center gap-2">
				<i class="pi pi-exclamation-triangle text-3xl text-primary" />
				<span
					>Are you sure you want to delete
					<strong>{{ requestToDelete?.title }}</strong
					>?</span
				>
			</div>
			<template #footer>
				<div class="flex justify-content-end gap-2">
					<Button label="Cancel" text @click="deleteDialogVisible = false" />
					<Button
						label="Delete"
						severity="danger"
						@click="deleteRequest"
						:loading="deleting" />
				</div>
			</template>
		</Dialog>
	</div>
</template>

<style scoped>
.requests-page {
	padding: 1rem;
}

.form-content {
	display: flex;
	flex-direction: column;
}

.form-content > *:not(.form-row) {
	flex: 0 0 auto;
	width: 100%;
}

.form-row {
	display: flex;
	gap: 1rem;
}

.form-row > * {
	flex: 1;
}

.form-field {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
}

.form-field label {
	font-size: 0.875rem;
	font-weight: 600;
	color: var(--text-color);
}

.form-field :deep(.p-inputtext),
.form-field :deep(.p-dropdown),
.form-field :deep(.p-inputnumber),
.form-field :deep(.p-textarea),
.form-field :deep(.p-multiselect),
.form-field :deep(.p-selectbutton),
.form-field :deep(.p-autocomplete) {
	width: 100%;
}

.line-clamp-2 {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

:deep(.p-datatable .p-datatable-thead > tr > th) {
	font-weight: 600;
}

:deep(.p-datatable .p-datatable-tbody > tr:hover) {
	background: #f8f9fa;
}

:deep(.p-toast-message) {
	opacity: 0.5;
	transition: opacity 0.3s ease;
}

:deep(.p-toast-message:hover) {
	opacity: 1;
}
</style>
