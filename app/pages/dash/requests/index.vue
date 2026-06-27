<script lang="ts" setup>
import {
	ref,
	onMounted,
	computed,
	nextTick,
	type ComponentPublicInstance,
} from 'vue'
import type { Tag } from '~/components/Tags.vue'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '~~/server/trpc/routers'
import Tags from '~/components/Tags.vue'
import UserRequestsList from '~/components/requests/UserRequestsList.vue'
import QuantityInput from '~/components/requests/QuantityInput.vue'
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
const selectedRequests = ref<Request[]>([])
const sortField = ref<string>('totalPriority')
const sortOrder = ref<number>(-1) // -1 for desc, 1 for asc

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'update'>('create')
const currentRequestId = ref<number | null>(null)
const currentRequest = ref<Request | null>(null)
const userRequestsDialogVisible = ref(false)
const currentRequestUserRequests = ref<RequestUserRequest[]>([])
const currentRequestTitle = ref('')
const hasUserRequest = ref(false)

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

const isJoined = computed(() => !!formData.value.userRequest.isJoined)

function toggleJoin() {
	formData.value.userRequest.isJoined = !formData.value.userRequest.isJoined
	if (formData.value.userRequest.isJoined) {
		formData.value.userRequest.quantity = 0
	}
}

const formData = ref({
	title: '',
	description: '',
	isActive: true,
	isJoinable: false,
	// totalPriority: 0,
	selectedTags: [] as Tag[],
	measurementType: 'None' as MeasurementType,
	userRequest: {
		quantity: undefined as number | undefined,
		recurrencePeriod: 0,
		priority: 0,
		estimatedDeliveryAt: undefined as Date | undefined,
		dueAt: undefined as Date | undefined,
		isBasicNeed: false,
		isJoined: false,
	},
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
		// totalPriority: 0,
		selectedTags: [],
		measurementType: 'None' as MeasurementType,
		userRequest: {
			quantity: 1,
			recurrencePeriod: 0,
			priority: 0,
			estimatedDeliveryAt: undefined,
			dueAt: undefined,
			isBasicNeed: false,
			isJoined: false,
		},
	}
	hasUserRequest.value = false
	dialogMode.value = 'create'
	dialogVisible.value = true
}

const editRequest = async (request: Request) => {
	const userRequestData = await $trpcClient.requests.getUserRequest.query({
		requestId: request.id,
	})
	const userRequest = userRequestData
	hasUserRequest.value = !!userRequestData
	formData.value = {
		title: request.title,
		description: request.description || '',
		isActive: request.isActive,
		isJoinable: request.isJoinable ?? false,
		// totalPriority: userRequest?.priority || 0,
		selectedTags: request.tags || [],
		measurementType: request.measurementType as MeasurementType,
		userRequest: {
			quantity: userRequest?.quantity ?? undefined,
			recurrencePeriod: userRequest?.recurrencePeriod || 0,
			priority: userRequest?.priority ?? 0,
			estimatedDeliveryAt: userRequest?.estimatedDeliveryAt
				? new Date(userRequest?.estimatedDeliveryAt)
				: undefined,
			dueAt: userRequest?.dueAt ? new Date(userRequest.dueAt) : undefined,
			isBasicNeed: userRequest?.isBasicNeed || false,
			isJoined: userRequest?.isJoined || false,
		},
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
			// Note: userRequest is already nested in formData.value.userRequest
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
			toast.add('Success', 'Request created successfully')
		} else if (dialogMode.value === 'update' && currentRequestId.value) {
			await $trpcClient.requests.update.mutate({
				...payload,
				id: currentRequestId.value,
			})
			toast.add('Success', 'Request updated successfully')
		}
		dialogVisible.value = false
		fetchRequests()
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

const showUserRequests = async () => {
	if (!currentRequest.value) return
	currentRequestTitle.value = currentRequest.value.title
	const userRequests = await $trpcClient.requests.getUserRequests.query({
		requestId: currentRequest.value.id,
	})
	const allUserRequests = (userRequests || []).map(userRequest => ({
		...userRequest,
		measurementType: currentRequest.value!.measurementType,
	}))
	currentRequestUserRequests.value = allUserRequests
	userRequestsDialogVisible.value = true
}

const closeUserRequestsDialog = () => {
	userRequestsDialogVisible.value = false
	currentRequestUserRequests.value = []
	currentRequestTitle.value = ''
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
	<!-- <pre>{{ selectedRequests }}</pre> -->
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
		<!-- v-model:selection="selectedRequests"
			selectionMode="multiple" -->
		<!-- <Column selectionMode="multiple" headerStyle="width: 3rem"></Column> -->
		<!-- <Column header="Essential">
				<template #body="{ data }">
					<Checkbox v-if="data.userRequests?.[0]" :modelValue="data.userRequests[0].isBasicNeed" :binary="true" disabled />
					<span v-else>-</span>
				</template>
			</Column>			 -->
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
				<span class="">{{ data.totalPriority }}</span>
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
		:header="
			dialogMode === 'create'
				? 'New Request'
				: isOwner
					? 'Edit Request'
					: 'Join Request'
		"
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
					:disabled="!isOwner"
					v-bind:autofocus="dialogMode === 'create'" />
			</div>
			<div class="form-field">
				<label for="description">Description</label>
				<Textarea
					id="description"
					placeholder="A brief description of the matter"
					v-model="formData.description"
					:disabled="!isOwner"
					rows="3" />
			</div>
	<div
		v-if="!formData.title.endsWith('?')"
	class="flex items-end gap-4">
		<div v-if="isOwner" class="form-field">
			<label for="measurementType">Measurement</label>
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
				:disabled="!isOwner"
				placeholder="Select measurement"
				class="w-48" />
		</div>
		<div class="flex items-center gap-2 pb-2">
			<Checkbox
				inputId="isJoinable"
				v-model="formData.isJoinable"
				:binary="true"
				:disabled="!isOwner" />
			<label for="isJoinable" class="cursor-pointer"
				>Shared</label
			>
		</div>
	</div>
			<Panel header="My Request">
			<div
				v-if="dialogMode !== 'create'"
				class="flex items-center gap-3 mb-3 text-sm">
				<button
					type="button"
					class="text-zinc-500 hover:underline"
					@click="showUserRequests">
					{{ currentRequest?.userRequestCount ?? 0 }}
					{{
						(currentRequest?.userRequestCount ?? 0) === 1
							? 'request'
							: 'requests'
					}}
				</button>
				<span class="text-zinc-400">·</span>
				<span class="text-zinc-500"
					>{{ currentRequest?.totalPriority ?? 0 }} total priority</span
				>
			</div>
			<div v-if="formData.title.endsWith('?')">
				<div class="flex gap-4">
					<div
						v-if="dialogMode !== 'create'"
						key="join-button"
						class="form-field flex-1">
						<label for="quantity">&nbsp;</label>
						<Button
							:label="formData.userRequest.quantity ? 'Update' : 'Join'"
							class="w-full"
							@click="
								formData.userRequest.quantity = formData.userRequest.quantity
									? 0
									: 1
							" />
					</div>
					<div class="form-field flex-1">
						<label for="priority">Priority</label>
						<InputNumber
							id="priority"
							v-model="formData.userRequest.priority" />
					</div>
				</div>
			</div>
			<div v-if="!formData.title.endsWith('?')" class="flex gap-4">
				<div
					v-if="formData.isJoinable"
					key="join-button"
					class="form-field flex-1">
					<label for="quantity">&nbsp;</label>
					<Button
						:label="isJoined ? 'Joined' : 'Join'"
						:severity="isJoined ? 'success' : undefined"
						class="w-full"
						@click="toggleJoin" />
				</div>
				<Transition name="slide-fade" mode="out-in">
					<div
						v-if="
							!formData.isJoinable &&
							formData.measurementType !== MeasurementType.None
						"
						key="quantity-input"
						class="form-field flex-1">
						<label for="quantity">Quantity</label>
						<QuantityInput
							v-model="formData.userRequest.quantity"
							:measurementType="formData.measurementType" />
					</div>
			</Transition>
			<div class="form-field flex-1">
				<label for="priority">Priority</label>
					<InputNumber id="priority" v-model="formData.userRequest.priority" />
				</div>
				<div class="form-field flex-1">
					<label for="isBasicNeed" class="cursor-pointer">Essential</label>
					<Checkbox
						inputId="isBasicNeed"
						v-model="formData.userRequest.isBasicNeed"
						:binary="true" />
				</div>
			</div>
			<div v-if="!formData.title.endsWith('?')" class="flex gap-4">
				<div class="form-field flex-1">
					<label for="recurrence">Recurrence</label>
					<Dropdown
						id="recurrence"
						v-model="formData.userRequest.recurrencePeriod"
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
						placeholder="Select recurrence" />
				</div>
				<div class="form-field flex-1">
					<label for="dueAt">Due Date</label>
					<DatePicker
						id="dueAt"
						v-model="formData.userRequest.dueAt"
						dateFormat="mm/dd/yy" />
				</div>
				<div class="form-field flex-1">
					<label for="estimatedDeliveryAt">Est. Delivery Date</label>
					<DatePicker
						id="estimatedDeliveryAt"
						v-model="formData.userRequest.estimatedDeliveryAt"
					dateFormat="mm/dd/yy"
					disabled />
			</div>
		</div>
		</Panel>
		<div class="form-field">
			<label for="tags">Tags</label>
				<Tags
					v-model="formData.selectedTags"
					:tags="allTags"
					:disabled="!isOwner"
					placeholder="Search or create tags" />
			</div>
			<!-- <div v-if="dialogMode === 'update'" class="form-field">
					<label for="isActive">Status</label>
					<SelectButton id="isActive" v-model="formData.isActive" :options="[
						{ label: 'Active', value: true },
						{ label: 'Inactive', value: false },
					]" optionLabel="label" optionValue="value" :disabled="!isOwner" />
				</div> -->
		</div>
		<template #footer>
			<div class="flex justify-end gap-2 w-full">
				<Button label="Cancel" text @click="dialogVisible = false" />
					<Button
						:label="
							isOwner
								? dialogMode === 'create'
									? 'Create'
									: 'Update'
								: hasUserRequest
									? 'Update'
									: 'Join'
						"
					@click="saveRequest"
					:loading="saving" />
			</div>
		</template>
	</Dialog>

	<Dialog
		v-model:visible="userRequestsDialogVisible"
		:header="`User Requests - ${currentRequestTitle}`"
		:modal="true"
		dismissableMask
		:style="{ width: '700px' }"
		:breakpoints="{ '960px': '90vw', '640px': '95vw' }"
		show-effect="fadeIn"
		hide-effect="fadeOut"
		@update:visible="closeUserRequestsDialog">
		<UserRequestsList
			:userRequests="currentRequestUserRequests"
			:measurementType="
				currentRequest?.measurementType || MeasurementType.None
			" />
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
