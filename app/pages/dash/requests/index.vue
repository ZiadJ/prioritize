<script lang="ts" setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import type { Tag } from '~/components/Tags.vue'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '~~/server/trpc/routers'
import Tags from '~/components/Tags.vue'
import Quantity from '~/components/requests/Quantity.vue'
import { MeasurementType } from '~~/prisma/generated/client/enums'
import { useConfirm } from 'primevue/useconfirm'
import type { DataTableSortEvent } from 'primevue/datatable'

type RequestRouterOutput = inferRouterOutputs<AppRouter>['requests']
type Request = RequestRouterOutput['list'][number]
type RequestUserRequest = RequestRouterOutput['getUserRequests'][number]

definePageMeta({
	layout: 'dashboard',
})

const { $trpcClient } = useNuxtApp()
const toast = usePausableToast()
const confirm = useConfirm()
const { data: session } = useAuth()

const requests = ref<Request[]>([])
const loading = ref(true)
const saving = ref(false)
const searchQuery = ref('')
const selectedScope = ref<'community' | 'regional' | 'local' | undefined>(
	undefined,
)
const sortField = ref<string>('totalPriority')
const sortOrder = ref<number>(-1) // -1 for desc, 1 for asc

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'update'>('create')
const currentRequestId = ref<number | null>(null)
const currentRequest = ref<Request | null>(null)

const usersDialogVisible = ref(false)
const viewingUsersRequest = ref<Request | null>(null)
const userRequestsCache = ref<Record<number, RequestUserRequest[]>>({})
const loadingUserRequests = ref<Record<number, boolean>>({})
const savingUserRequest = ref(false)

// User request add/edit modal
const userRequestDialogVisible = ref(false)
const editingUserRequestRequest = ref<Request | null>(null)
const userRequestIsExisting = ref(false)
const userRequestMeasurementType = ref<MeasurementType>(MeasurementType.None)
const userRequestIsJoinable = ref(false)
const userRequestForm = ref({
	quantity: undefined as number | undefined,
	priority: 0,
	recurrencePeriod: 0,
	dueAt: undefined as Date | undefined,
	isBasicNeed: false,
	isJoined: false,
	comment: '',
})

const allTags = ref<Tag[]>([])
const selectedTagIds = ref<number[]>([])
const allExpertise = ref<{ id: number; title: string }[]>([])
const selectedExpertiseId = ref<number | null>(null)

const { setRef, checkOverflow, isOverflow } = useTextOverflow()

const scopeOptions = [
	{ label: 'Local', value: 'local' },
	{ label: 'Regional', value: 'regional' },
	{ label: 'Community', value: 'community' },
]

const recurrenceOptions = [
	{ label: 'None', value: 0 },
	{ label: 'Daily', value: 1 },
	{ label: 'Weekly', value: 7 },
	{ label: 'Monthly', value: 30 },
	{ label: 'Quarterly', value: 90 },
	{ label: 'Semi-annually', value: 180 },
	{ label: 'Annually', value: 365 },
]

const isOwner = computed(() => {
	if (dialogMode.value === 'create') return true
	return (
		currentRequest.value &&
		(session.value?.user?.id === currentRequest.value.ownerId ||
			currentRequest.value.editors?.some(
				editor => editor.id === session.value?.user?.id,
			))
	)
})

const formData = ref({
	title: '',
	description: '',
	isActive: true,
	isJoinable: false,
	selectedTags: [] as Tag[],
	measurementType: 'None' as MeasurementType,
})

const fetchRequests = async () => {
	loading.value = true
	try {
		const result = await $trpcClient.requests.list.query({
			search: searchQuery.value || undefined,
			scope: selectedScope.value ?? undefined,
			sortBy: sortField.value,
			sortOrder: sortOrder.value,
			tagIds:
				selectedTagIds.value.length > 0 ? selectedTagIds.value : undefined,
			expertiseId: selectedExpertiseId.value ?? undefined,
		})
		requests.value = result || []
	} catch (error: any) {
		console.error('Failed to fetch requests:', error)
		toast.add(
			'Failed to fetch requests',
			error.message || 'Failed to fetch requests',
			'error',
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
		description: '',
		isActive: true,
		isJoinable: false,
		selectedTags: [],
		measurementType: 'None' as MeasurementType,
	}
	dialogMode.value = 'create'
	dialogVisible.value = true
}

const editRequest = (request: Request) => {
	formData.value = {
		title: request.title,
		description: request.description || '',
		isActive: request.isActive,
		isJoinable: request.isJoinable ?? false,
		selectedTags: request.tags || [],
		measurementType: request.measurementType as MeasurementType,
	}
	currentRequestId.value = request.id
	currentRequest.value = request
	dialogMode.value = 'update'
	dialogVisible.value = true
}

const saveRequest = async () => {
	if (!formData.value.title) {
		toast.add('Warning', 'Title is required')
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

		const payload = {
			...formData.value,
			tagIds: realTagIds,
		}

		let createdId: number | null = null
		if (dialogMode.value === 'create') {
			// Ensure user has community and country assigned
			if (!session.value?.user?.communityId) {
				throw new Error('User must be assigned to a community')
			}
			if (!session.value?.user?.countryId) {
				throw new Error('User must have a country assigned')
			}

			const created = await $trpcClient.requests.create.mutate(payload)
			createdId = created?.id ?? null
			toast.add('Success', 'Request created successfully')
		} else if (dialogMode.value === 'update' && currentRequestId.value) {
			await $trpcClient.requests.update.mutate({
				...payload,
				id: currentRequestId.value,
			})
			toast.add('Success', 'Request updated successfully')
		}
		dialogVisible.value = false
		await fetchRequests()

		// Auto-open the add modal so the user can enter their request details
		// right away. The user request modal is deferred until the request
		// dialog's close animation has finished, otherwise the two modal dialogs
		// race for the shared mask layer and the second one never appears.
		if (createdId != null) {
			setTimeout(() => {
				nextTick(() => {
					if (!requests.value.some(r => r.id === createdId)) return
					openUserRequestModal({
						id: createdId,
						measurementType: formData.value.measurementType,
						isJoinable: formData.value.isJoinable,
					} as Request)
				})
			}, 200)
		}
	} catch (error: any) {
		console.error('Failed to save request:', error)
		toast.add('Error', error.message || 'Failed to save request')
	} finally {
		saving.value = false
	}
}

const confirmDelete = (event: MouseEvent, request: Request) => {
	confirm.require({
		target: event.currentTarget as HTMLElement,
		message: `Do you want to delete "${request.title}"?`,
		group: 'right',
		icon: 'pi pi-info-circle',
		rejectProps: {
			label: 'Cancel',
			severity: 'secondary',
			outlined: true,
		},
		acceptProps: {
			label: 'Delete',
			severity: 'danger',
		},
		accept: async () => {
			try {
				await $trpcClient.requests.delete.mutate({ id: request.id })
				toast.add('Success', 'Request deleted successfully')
				fetchRequests()
			} catch (error: any) {
				console.error('Failed to delete request:', error)
				toast.add('Error', error.message || 'Failed to delete request')
			}
		},
	})
}

const confirmDeleteUserRequest = (event: MouseEvent, request: Request) => {
	confirm.require({
		target: event.currentTarget as HTMLElement,
		message: 'Do you want to remove your request details?',
		group: 'right',
		icon: 'pi pi-info-circle',
		rejectProps: {
			label: 'Cancel',
			severity: 'secondary',
			outlined: true,
		},
		acceptProps: {
			label: 'Delete',
			severity: 'danger',
		},
		accept: async () => {
			try {
				await $trpcClient.requests.deleteUserRequest.mutate({
					requestId: request.id,
				})
				toast.add('Success', 'Your request details were deleted')
				await loadUserRequests(request.id)
				fetchRequests()
			} catch (error: any) {
				console.error('Failed to delete user request:', error)
				toast.add('Error', error.message || 'Failed to delete')
			}
		},
	})
}

const isRequestOwnerOrEditor = (data: Request) =>
	session.value?.user?.id === data.ownerId ||
	data.editors?.some((e: any) => e.id === session.value?.user?.id)

const currentUserId = computed(() => session.value?.user?.id)

// A row belongs to the current user when its user id matches theirs. The
// unsaved "add" row is seeded with the current user's id so it is editable too.
const isMine = (data: any) =>
	!!currentUserId.value && data?.user?.id === currentUserId.value

// Only persisted rows (those with an id) count towards the displayed total.
const realCount = (requestId: number) =>
	(userRequestsCache.value[requestId] || []).filter(r => r.id != null).length

// Whether the current user already has a (saved) row for this request.
const hasMyRow = (requestId: number) =>
	(userRequestsCache.value[requestId] || []).some(
		r => isMine(r) && r.id != null,
	)

const openUsersDialog = async (request: Request) => {
	viewingUsersRequest.value = request
	await loadUserRequests(request.id)
	usersDialogVisible.value = true
}

const loadUserRequests = async (requestId: number) => {
	loadingUserRequests.value[requestId] = true
	try {
		const result = await $trpcClient.requests.getUserRequests.query({
			requestId,
		})
		const list = (result || []) as RequestUserRequest[]
		// Current user's own row always shown first.
		const mine = list.filter(r => isMine(r))
		const others = list
			.filter(r => !isMine(r))
			.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
		userRequestsCache.value = {
			...userRequestsCache.value,
			[requestId]: [...mine, ...others],
		}
	} catch (error: any) {
		toast.add('Error', error.message || 'Failed to load user requests')
	} finally {
		loadingUserRequests.value[requestId] = false
	}
}

const resetUserRequestForm = () => {
	userRequestForm.value = {
		quantity: undefined,
		priority: 0,
		recurrencePeriod: 0,
		dueAt: undefined,
		isBasicNeed: false,
		isJoined: false,
		comment: '',
	}
}

// Open the add/edit modal for the current user's own request on a given request.
const openUserRequestModal = async (request: Request) => {
	editingUserRequestRequest.value = request
	userRequestMeasurementType.value = request.measurementType as MeasurementType
	userRequestIsJoinable.value = request.isJoinable ?? false
	resetUserRequestForm()
	try {
		const existing = await $trpcClient.requests.getUserRequest.query({
			requestId: request.id,
		})
		userRequestIsExisting.value = !!existing
		if (existing) {
			userRequestForm.value = {
				quantity: existing.quantity ?? undefined,
				priority: existing.priority ?? 0,
				recurrencePeriod: existing.recurrencePeriod ?? 0,
				dueAt: existing.dueAt ? new Date(existing.dueAt) : undefined,
				isBasicNeed: existing.isBasicNeed ?? false,
				isJoined: existing.isJoined ?? false,
				comment: existing.comment ?? '',
			}
		}
	} catch (error: any) {
		userRequestIsExisting.value = false
		toast.add('Error', error.message || 'Failed to load your request')
	}
	userRequestDialogVisible.value = true
}

// Wrappers used from the users dialog template. Passing the deep `Request`
// type (derived from the tRPC router output) into a `Request`-typed handler
// forces full type instantiation and trips TS2589, so we cast to `any` here to
// skip the assignability check (the value is a valid `Request` by construction).
const openViewingUserRequest = () => {
	if (viewingUsersRequest.value)
		openUserRequestModal(viewingUsersRequest.value as any)
}

const deleteViewingUserRequest = (event: MouseEvent) => {
	if (viewingUsersRequest.value)
		confirmDeleteUserRequest(event, viewingUsersRequest.value as any)
}

const onUserRequestJoinToggle = (val: boolean) => {
	if (val) userRequestForm.value.quantity = 0
}

const saveUserRequestForm = async () => {
	const request = editingUserRequestRequest.value
	if (!request) return
	savingUserRequest.value = true
	try {
		await $trpcClient.requests.saveUserRequest.mutate({
			requestId: request.id,
			quantity: userRequestForm.value.quantity ?? null,
			priority: userRequestForm.value.priority,
			recurrencePeriod: userRequestForm.value.recurrencePeriod,
			dueAt: userRequestForm.value.dueAt ?? null,
			isBasicNeed: userRequestForm.value.isBasicNeed,
			isJoined: userRequestForm.value.isJoined,
			comment: userRequestForm.value.comment,
		})
		toast.add('Success', 'Saved')
		userRequestDialogVisible.value = false
		await loadUserRequests(request.id)
		fetchRequests()
	} catch (error: any) {
		toast.add('Error', error.message || 'Failed to save')
	} finally {
		savingUserRequest.value = false
	}
}

const onSort = (event: DataTableSortEvent) => {
	if (!event.sortField || typeof event.sortField !== 'string') return
	sortField.value = event.sortField
	sortOrder.value = event.sortOrder ?? 1
	fetchRequests()
}

onMounted(async () => {
	fetchRequests()
	try {
		allTags.value = (await $trpcClient.requests.listTags.query()) || []
	} catch (error: any) {
		toast.add('Error', error.message || 'Failed to load tags')
		console.error('Failed to fetch tags:', error.message || error)
	}
	try {
		allExpertise.value =
			(await $trpcClient.requests.listExpertise.query()) || []
	} catch (error: any) {
		toast.add('Error', error.message || 'Failed to load expertise')
		console.error('Failed to fetch expertise:', error.message || error)
	}
})
</script>

<template>
	<div class="requests-page">
		<div class="flex justify-content-between align-items-center m-6">
			<InputGroup class="w-auto">
				<InputGroupAddon>
					<i class="pi pi-search" />
				</InputGroupAddon>
				<InputText
					v-model="searchQuery"
					placeholder="Search requests..."
					@input="debouncedSearch" />
				<Dropdown
					v-model="selectedScope"
					:options="scopeOptions"
					optionLabel="label"
					optionValue="value"
					placeholder="All regions"
					@change="fetchRequests"
					showClear />
				<Dropdown
					v-model="selectedExpertiseId"
					:options="allExpertise"
					optionLabel="title"
					optionValue="id"
					placeholder="All expertise"
					@change="fetchRequests"
					showClear
					filter
					class="w-40" />
				<MultiSelect
					v-model="selectedTagIds"
					:options="allTags"
					optionLabel="name"
					optionValue="id"
					placeholder="All tags"
					@change="fetchRequests"
					:showToggleAll="false"
					filter
					display="chip"
					class="w-40" />
			</InputGroup>
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
		:rows="25"
		dataKey="id"
		:rowHover="true"
		resizableColumns
		:sortField="sortField"
		:sortOrder="sortOrder"
		@sort="onSort"
		stripedRows>
		<Column field="title" header="Title" sortable>
			<template #body="{ data }">
				<NuxtLink :to="`/dash/requests/${data.id}`" class="underline">
					{{ data.title }}
				</NuxtLink>
			</template>
		</Column>
		<Column class="!p-0">
			<template #body="{ data }"> </template>
		</Column>
		<Column field="totalPriority" header="Priority" sortable>
			<template #body="{ data }">
				<span
					class="cursor-pointer underline"
					@click="openUsersDialog(data)"
					irv-tooltip.top="'View users who prioritize this request'"
					>{{ data.totalPriority }}</span
				>
			</template>
		</Column>
		<Column field="community.title" header="Community" sortable>
			<template #body="{ data }">
				<span>{{ data.community?.title || '-' }}</span>
			</template>
		</Column>
		<Column field="createdAt" header="Created" sortable>
			<template #body="{ data }">
				<span>{{ new Date(data.createdAt).toLocaleDateString() }}</span>
			</template>
		</Column>

		<Column field="tags" header="Tags">
			<template #body="{ data }">
				<div class="flex flex-wrap gap-1">
					<Tag
						class="!px-2 !py-1 !text-xs !font-light"
						v-for="tag in data.tags"
						:key="tag.id"
						:value="tag.name"
						severity="info" />
				</div>
			</template>
		</Column>
		<Column field="description" header="Description" style="max-width: 400px">
			<template #body="{ data }">
				<span
					:ref="el => setRef(data.id, el as HTMLElement)"
					v-tooltip.top="{
						value: data.description,
						disabled: !isOverflow(data.id),
						showDelay: 100,
						pt: { root: { style: { maxWidth: '450px' } } },
					}"
					class="auto-ellipsis"
					@mouseenter="checkOverflow(data.id)"
					>{{ data.description }}</span
				>
			</template>
		</Column>
		<Column header="Actions" :exportable="false" class="actions-column">
			<template #body="{ data }">
				<div class="action-buttons">
					<Button
						v-if="isRequestOwnerOrEditor(data)"
						icon="pi pi-pencil"
						text
						rounded
						severity="success"
						@click="editRequest(data)"
						v-tooltip.top="'Edit'" />
					<Button
						v-if="isRequestOwnerOrEditor(data)"
						icon="pi pi-trash"
						text
						rounded
						severity="danger"
						@click="confirmDelete($event, data)"
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
		:header="dialogMode === 'create' ? 'New Request' : 'Edit Request'"
		:modal="true"
		dismissableMask
		:style="{ width: '500px' }"
		:breakpoints="{ '960px': '90vw', '640px': '95vw' }"
		show-effect="fadeIn"
		hide-effect="fadeOut">
		<div class="form-content gap-3">
			<div class="form-field">
				<label for="title">Title *</label>
				<InputText
					id="title"
					placeholder="A request, issue or decisional question"
					v-model="formData.title"
					v-bind:autofocus="dialogMode === 'create'" />
			</div>
			<div class="form-field">
				<label for="description">Description</label>
				<Textarea
					id="description"
					placeholder="A brief description of the matter"
					v-model="formData.description"
					rows="3" />
			</div>
			<div v-if="!formData.title.endsWith('?')" class="flex items-end gap-4">
				<div class="form-field">
					<label for="measurementType">Measurement Type</label>
					<Dropdown
						id="measurementType"
						v-model="formData.measurementType"
						:options="
							Object.keys(MeasurementType).map(key => ({
								label: key,
								value: key as MeasurementType,
							}))
						"
						optionLabel="label"
						optionValue="value"
						placeholder="Select measurement"
						class="w-48" />
				</div>
				<div class="flex items-center gap-2 pb-2">
					<Checkbox
						inputId="isJoinable"
						v-model="formData.isJoinable"
						:binary="true" />
					<label for="isJoinable" class="cursor-pointer">Shared</label>
				</div>
			</div>
			<div class="form-field">
				<label for="tags">Tags</label>
				<Tags
					v-model="formData.selectedTags"
					:tags="allTags"
					placeholder="Search or create tags" />
			</div>
		</div>
		<template #footer>
			<div class="flex justify-end gap-2 w-full">
				<Button label="Cancel" text @click="dialogVisible = false" />
				<Button
					:label="dialogMode === 'create' ? 'Create' : 'Update'"
					@click="saveRequest"
					:loading="saving" />
			</div>
		</template>
	</Dialog>

	<Dialog
		v-model:visible="userRequestDialogVisible"
		:header="userRequestIsExisting ? 'Edit My Request' : 'Join Request'"
		:modal="true"
		dismissableMask
		:style="{ width: '500px' }"
		:breakpoints="{ '960px': '90vw', '640px': '95vw' }"
		show-effect="fadeIn"
		hide-effect="fadeOut">
		<div class="form-content gap-3">
			<div v-if="userRequestIsJoinable" class="flex items-center gap-2">
				<Checkbox
					inputId="urIsJoined"
					v-model="userRequestForm.isJoined"
					:binary="true"
					@update:model-value="onUserRequestJoinToggle" />
				<label for="urIsJoined" class="cursor-pointer"
					>Join as shared request (no separate quantity)</label
				>
			</div>
			<div
				v-if="
					!userRequestForm.isJoined &&
					userRequestMeasurementType !== MeasurementType.None
				"
				class="form-field">
				<label for="urQuantity">Quantity</label>
				<Quantity
					v-model="userRequestForm.quantity"
					:measurementType="userRequestMeasurementType" />
			</div>
			<div class="flex gap-4">
				<div class="form-field flex-1">
					<label for="urPriority">Priority</label>
					<InputNumber
						id="urPriority"
						v-model="userRequestForm.priority"
						showButtons />
				</div>
				<div class="form-field flex-1">
					<label for="urEssential" class="cursor-pointer">Essential</label>
					<Checkbox
						inputId="urEssential"
						v-model="userRequestForm.isBasicNeed"
						:binary="true" />
				</div>
			</div>
			<div class="flex gap-4">
				<div class="form-field flex-1">
					<label for="urRecurrence">Recurrence</label>
					<Dropdown
						id="urRecurrence"
						v-model="userRequestForm.recurrencePeriod"
						:options="recurrenceOptions"
						optionLabel="label"
						optionValue="value" />
				</div>
				<div class="form-field flex-1">
					<label for="urDueAt">Due Date</label>
					<DatePicker
						id="urDueAt"
						v-model="userRequestForm.dueAt"
						dateFormat="mm/dd/yy" />
				</div>
			</div>
			<div class="form-field">
				<label for="urComment">Comment</label>
				<Textarea
					id="urComment"
					v-model="userRequestForm.comment"
					rows="2"
					placeholder="Add a comment about your request" />
			</div>
		</div>
		<template #footer>
			<div class="flex justify-end gap-2 w-full">
				<Button label="Cancel" text @click="userRequestDialogVisible = false" />
				<Button
					:label="userRequestIsExisting ? 'Update' : 'Add'"
					@click="saveUserRequestForm"
					:loading="savingUserRequest" />
			</div>
		</template>
	</Dialog>

	<Dialog
		v-model:visible="usersDialogVisible"
		:header="viewingUsersRequest?.title"
		:modal="true"
		dismissableMask
		:style="{ width: '900px' }"
		:breakpoints="{ '960px': '90vw', '640px': '95vw' }"
		show-effect="fadeIn"
		hide-effect="fadeOut">
		<div v-if="viewingUsersRequest" class="py-1">
			<div
				v-if="loadingUserRequests[viewingUsersRequest.id]"
				class="flex justify-center items-center py-2">
				<i class="pi pi-spin pi-spinner text-zinc-400"></i>
			</div>
			<div v-else>
				<div class="flex justify-between items-center mb-3">
					<span class="text-sm font-medium text-zinc-500">
						{{ realCount(viewingUsersRequest.id) }}
						{{
							realCount(viewingUsersRequest.id) === 1
								? 'user joined this request'
								: 'users joined this request'
						}}
					</span>
					<Button
						v-if="!hasMyRow(viewingUsersRequest.id)"
						label="Join Request"
						icon="pi pi-plus"
						text
						size="small"
						@click="openViewingUserRequest" />
				</div>

				<DataTable
					v-if="
						(userRequestsCache[viewingUsersRequest.id] || []).length > 0
					"
					:value="userRequestsCache[viewingUsersRequest.id] || []"
					class="p-datatable-sm"
					dataKey="id">
					<Column field="user" header="User">
						<template #body="{ data }">
							<NuxtLink
								:to="`/dash/users/${data.user?.username}`"
								class="underline hover:opacity-70">
								{{
									[data.user?.firstname, data.user?.lastname]
										.filter(Boolean)
										.join(' ') || data.user?.username || '-'
								}}
							</NuxtLink>
							<Tag
								v-if="isMine(data)"
								value="you"
								severity="info"
								class="!ml-1 !text-xs" />
						</template>
					</Column>
					<Column
						v-if="
							viewingUsersRequest!.measurementType !== MeasurementType.None
						"
						field="quantity"
						header="Quantity">
						<template #body="{ data }">
							{{ data.quantity ?? '-' }}
						</template>
					</Column>
					<Column field="priority" header="Priority">
						<template #body="{ data }">
							{{ data.priority ?? '-' }}
						</template>
					</Column>
					<Column field="isBasicNeed" header="Essential">
						<template #body="{ data }">
							{{ data.isBasicNeed ? 'Yes' : '-' }}
						</template>
					</Column>
					<Column field="recurrencePeriod" header="Recurrence">
						<template #body="{ data }">
							{{
								data.recurrencePeriod > 0
									? data.recurrencePeriod + 'd'
									: '-'
							}}
						</template>
					</Column>
					<Column field="dueAt" header="Due Date">
						<template #body="{ data }">
							{{
								data.dueAt
									? new Date(data.dueAt).toLocaleDateString()
									: '-'
							}}
						</template>
					</Column>
					<Column field="comment" header="Comment" style="max-width: 300px">
						<template #body="{ data }">
							{{ data.comment || '-' }}
						</template>
					</Column>
					<Column
						header="Actions"
						:exportable="false"
						class="actions-column">
						<template #body="{ data }">
							<div v-if="isMine(data)" class="action-buttons">
								<Button
									icon="pi pi-pencil"
									text
									rounded
									size="small"
									severity="success"
									@click="openViewingUserRequest"
									v-tooltip.top="'Edit'" />
								<Button
									icon="pi pi-trash"
									text
									rounded
									size="small"
									severity="danger"
									@click="deleteViewingUserRequest($event)"
									v-tooltip.top="'Delete'" />
							</div>
						</template>
					</Column>
				</DataTable>
			</div>
		</div>
	</Dialog>
</template>

<style scoped>
.auto-ellipsis {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.action-buttons {
	display: flex;
}

.actions-column {
	padding: 0;
}

.actions-column .p-column-title {
	display: none;
}
</style>
