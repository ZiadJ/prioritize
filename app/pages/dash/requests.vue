<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import type { Tag } from '~/components/Tags.vue'
import Tags from '~/components/Tags.vue'

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
const currentRequestId = ref<number | null>(null)

const allTags = ref<Tag[]>([])

const formData = ref({
	title: '',
	body: '',
	recurrencePeriod: 0,
	quantity: 0,
	isActive: true,
	isBasicNeed: false,
	selectedTags: [] as Tag[],
})

const viewCommunity = ref('')
const viewCountry = ref('')

const fetchRequests = async () => {
	loading.value = true
	try {
		const result = await $trpcClient.requests.list.query({
			search: searchQuery.value || undefined,
		})
		requests.value = result || []
	} catch (error: any) {
		console.error('Failed to fetch requests:', error)
		toast.add(
			'error',
			'Error',
			error.message || 'Failed to fetch requests',
			5000,
		)
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
		recurrencePeriod: 0,
		quantity: 0,
		isActive: true,
		isBasicNeed: false,
		selectedTags: [],
	}
	dialogMode.value = 'create'
	dialogVisible.value = true
}

const viewRequest = (request: any) => {
	const tags = request.tags || []
	const order = request.orders?.[0]
	formData.value = {
		title: request.title,
		body: request.body,
		recurrencePeriod: order?.recurrencePeriod || 0,
		quantity: order?.quantity || 1,
		isActive: request.isActive,
		isBasicNeed: request.isBasicNeed || false,
		selectedTags: tags,
	}
	viewCommunity.value = request.communityNode?.title || '-'
	viewCountry.value = request.country?.name || '-'
	dialogMode.value = 'view'
	dialogVisible.value = true
}

const editRequest = (request: any) => {
	const tags = request.tags || []
	const order = request.orders?.[0]
	formData.value = {
		title: request.title,
		body: request.body,
		recurrencePeriod: order?.recurrencePeriod || 0,
		quantity: order?.quantity || 1,
		isActive: request.isActive,
		isBasicNeed: request.isBasicNeed || false,
		selectedTags: tags,
	}
	dialogMode.value = 'update'
	currentRequestId.value = request.id
	dialogVisible.value = true
}

const saveRequest = async () => {
	if (!formData.value.title) {
		toast.add('warn', 'Warning', 'Title is required', 3000)
		return
	}

	saving.value = true
	try {
		// Resolve any temporary tag IDs to persisted IDs
		const selectedTags = formData.value.selectedTags || []
		const realTagIds: number[] = []

		for (const tag of selectedTags) {
			if (!tag.id) continue

			if (tag.id < 0) {
				// Persist temp tag on server
				const createdTag = await $trpcClient.requests.createTag.mutate({
					name: tag.name,
				})
				realTagIds.push(createdTag.id)
				allTags.value = [...allTags.value, createdTag]
			} else {
				realTagIds.push(tag.id)
			}
		}

		// Build payload with tagIds; selectedTags will be stripped by Zod
		const payload = {
			...formData.value,
			tagIds: realTagIds,
		}

		if (dialogMode.value === 'create') {
			// Ensure user has community and country assigned
			if (!session.value?.user?.communityId) {
				throw new Error('User must be assigned to a community')
			}
			if (!session.value?.user?.countryId) {
				throw new Error('User must have a country assigned')
			}

			await $trpcClient.requests.create.mutate(payload)
			toast.add('success', 'Success', 'Request created successfully', 3000)
		} else if (dialogMode.value === 'update' && currentRequestId.value) {
			await $trpcClient.requests.update.mutate({
				...payload,
				id: currentRequestId.value,
			})
			toast.add('success', 'Success', 'Request updated successfully', 3000)
		}
		dialogVisible.value = false
		fetchRequests()
	} catch (error: any) {
		console.error('Failed to save request:', error)
		toast.add('error', 'Error', error.message || 'Failed to save request', 5000)
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
		toast.add('success', 'Success', 'Request deleted successfully', 3000)
		deleteDialogVisible.value = false
		fetchRequests()
	} catch (error: any) {
		console.error('Failed to delete request:', error)
		toast.add('error', 'Error', error.message || 'Failed to delete request', 0)
	} finally {
		deleting.value = false
	}
}

onMounted(async () => {
	fetchRequests()
	try {
		allTags.value = (await $trpcClient.requests.listTags.query()) || []
	} catch (error: any) {
		toast.add('error', 'Error', error.message || 'Failed to load tags', 5000)
		console.error('Failed to fetch tags:', error.message || error)
	}
})
</script>

<template>
	<div class="requests-page">
		<div
			class="header-actions flex justify-content-between align-items-center mb-4">
			<!-- <h2 class="text-xl font-semibold m-0">Requests</h2> -->
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
				<Button
					label="New Request"
					class="ml-2"
					icon="pi pi-plus"
					@click="openNewDialog" />
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
					<span>{{ data.body || '-' }}</span>
				</template>
			</Column>
			<Column field="communityNode" header="Community">
				<template #body="{ data }">
					<span>{{ data.communityNode?.title || '-' }}</span>
				</template>
			</Column>
			<Column field="isBasicNeed" header="Basic Need">
				<template #body="{ data }">
					<Tag
						:value="data.isBasicNeed ? 'Yes' : 'No'"
						:severity="data.isBasicNeed ? 'danger' : 'secondary'" />
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
			<Column header="Actions" :exportable="false" style="min-width: 0rem">
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
							v-if="
								session?.user.id === data.ownerId ||
								data.editors?.some((e: any) => e.id === session?.user.id)
							"
							icon="pi pi-pencil"
							text
							rounded
							severity="success"
							@click="editRequest(data)"
							v-tooltip.top="'Edit'" />
						<Button
							v-if="
								session?.user.id === data.ownerId ||
								data.editors?.some((e: any) => e.id === session?.user.id)
							"
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
						placeholder="Enter a question, issue or request"
						v-model="formData.title"
						:disabled="dialogMode === 'view'" />
				</div>
				<div class="form-field">
					<label for="body">Description</label>
					<Textarea
						id="body"
						placeholder="A brief description of the question, issue or request"
						v-model="formData.body"
						:disabled="dialogMode === 'view'"
						rows="3" />
				</div>
				<div class="form-field">
					<label for="recurrence">Recurrence</label>
					<Dropdown
						id="recurrence"
						v-model="formData.recurrencePeriod"
						:options="[
							{ label: 'None', value: 0 },
							{ label: 'Daily', value: 1 },
							{ label: 'Weekly', value: 7 },
							{ label: 'Monthly', value: 30 },
							{ label: 'Quarterly', value: 90 },
							{ label: 'Semi-annually', value: 180 },
							{ label: 'Annually', value: 365 },
						]"
						optionLabel="label"
						optionValue="value"
						:disabled="dialogMode === 'view'"
						placeholder="Select recurrence" />
				</div>
				<div class="flex gap-4">
					<div class="form-field flex-1">
						<label for="quantity">Quantity</label>
						<InputNumber
							placeholder="Not quantifiable"
							id="quantity"
							v-model="formData.quantity"
							:disabled="dialogMode === 'view'" />
					</div>
					<div class="form-field flex-1">
						<label for="isBasicNeed">Basic Need</label>
						<Checkbox
							id="isBasicNeed"
							v-model="formData.isBasicNeed"
							:binary="true"
							:disabled="dialogMode === 'view'" />
					</div>
				</div>

				<div class="form-field">
					<label for="tags">Tags</label>
					<Tags
						v-model="formData.selectedTags"
						:tags="allTags"
						:disabled="dialogMode === 'view'"
						placeholder="Search or create tags" />
				</div>
				<div v-if="dialogMode === 'view'" class="form-field">
					<label>Community and Country</label>
					<div class="flex items-baseline">
						<span>{{ viewCommunity }}</span>
						<span class="mx-2">/</span>
						<span>{{ viewCountry || 'global' }}</span>
					</div>
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
			:style="{ width: '500px' }"
			:breakpoints="{ '960px': '90vw', '640px': '95vw' }">
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
</style>
