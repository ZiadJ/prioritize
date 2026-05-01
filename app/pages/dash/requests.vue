<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import type { Tag } from '~/components/Tags.vue'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '~~/server/trpc/routers'
import Tags from '~/components/Tags.vue'
import OrdersList from '~/components/requests/OrdersList.vue'
import { UnitOfMeasure } from '~~/prisma/generated/client/enums'
import { useConfirm } from 'primevue/useconfirm'
import type { DataTableSortEvent } from 'primevue/datatable'

type RequestRouterInput = inferRouterInputs<AppRouter>['requests']
type RequestRouterOutput = inferRouterOutputs<AppRouter>['requests']
type Request = RequestRouterOutput['list'][number]
type RequestOrder = RequestRouterOutput['getOrders'][number]

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
const selectedScope = ref<'local' | 'regional' | 'regional extended' | 'global'>('global')
const selectedRequests = ref<Request[]>([])
const sortField = ref<string>('totalPriority')
const sortOrder = ref<number>(-1) // -1 for desc, 1 for asc

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'update'>('create')
const currentRequestId = ref<number | null>(null)
const currentRequest = ref<Request | null>(null)
const ordersDialogVisible = ref(false)
const currentRequestOrders = ref<RequestOrder[]>([])
const currentRequestTitle = ref('')

const allTags = ref<Tag[]>([])

// Scope options for dropdown
const scopeOptions = [
  { label: 'Global', value: 'global' },
  { label: 'Regional Extended', value: 'regional extended' },
  { label: 'Regional', value: 'regional' },
  { label: 'My Community', value: 'local' },
]

const totalRequestedQuantity = computed(() => {
	return currentRequest.value?.totalQuantity || 0
})

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
	body: '',
	isActive: true,
	// totalPriority: 0,
	selectedTags: [] as Tag[],
	unitOfMeasure: 'None' as UnitOfMeasure,
	order: {
		quantity: undefined as number | undefined,
		recurrencePeriod: 0,
		priority: 0,
		estimatedDeliveryAt: undefined as Date | undefined,
		dueAt: undefined as Date | undefined,
		isBasicNeed: false,
	},
})

const fetchRequests = async () => {
	loading.value = true
	try {
		// Map column field names to API sort fields
		const fieldMap: Record<string, string> = {
			totalPriority: 'totalPriority',
		}
		const apiSortBy = fieldMap[sortField.value] || sortField.value

		const result = await $trpcClient.requests.list.query({
			search: searchQuery.value || undefined,
			scope: selectedScope.value,
			sortBy: apiSortBy as
				| 'title'
				| 'totalPriority'
				| 'createdAt'
				| 'communityNode',
			sortOrder: sortOrder.value === -1 ? 'desc' : 'asc',
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
		isActive: true,
		// totalPriority: 0,
		selectedTags: [],
		unitOfMeasure: 'None' as UnitOfMeasure,
		order: {
			quantity: 1,
			recurrencePeriod: 0,
			priority: 0,
			estimatedDeliveryAt: undefined,
			dueAt: undefined,
			isBasicNeed: false,
		},
	}
	dialogMode.value = 'create'
	dialogVisible.value = true
}

const editRequest = async (request: Request) => {
	const userOrder = await $trpcClient.requests.getUserOrder.query({
		requestId: request.id,
	})
	const order = userOrder
	formData.value = {
		title: request.title,
		body: request.body || '',
		isActive: request.isActive,
		// totalPriority: order?.priority || 0,
		selectedTags: request.tags || [],
		unitOfMeasure: request.unitOfMeasure as UnitOfMeasure,
		order: {
			quantity: order?.quantity ?? undefined,
			recurrencePeriod: order?.recurrencePeriod || 0,
			priority: order?.priority ?? 0,
			estimatedDeliveryAt: order?.estimatedDeliveryAt
				? new Date(order?.estimatedDeliveryAt)
				: undefined,
			dueAt: order?.dueAt ? new Date(order.dueAt) : undefined,
			isBasicNeed: order?.isBasicNeed || false,
		},
	}
	currentRequestId.value = request.id
	currentRequest.value = request
	dialogMode.value = 'update'
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

		const payload = {
			...formData.value,
			tagIds: realTagIds,
			// Note: order is already nested in formData.value.order
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
				toast.add('success', 'Success', 'Request deleted successfully', 3000)
				fetchRequests()
			} catch (error: any) {
				console.error('Failed to delete request:', error)
				toast.add(
					'error',
					'Error',
					error.message || 'Failed to delete request',
					5000,
				)
			}
		},
	})
}

const showOrders = async () => {
	if (!currentRequest.value) return
	currentRequestTitle.value = currentRequest.value.title
	const orders = await $trpcClient.requests.getOrders.query({
		requestId: currentRequest.value.id,
	})
	const allOrders = (orders || []).map(order => ({
		...order,
		unitOfMeasure: currentRequest.value!.unitOfMeasure,
	}))
	currentRequestOrders.value = allOrders
	ordersDialogVisible.value = true
}

const closeOrdersDialog = () => {
	ordersDialogVisible.value = false
	currentRequestOrders.value = []
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
		toast.add('error', 'Error', error.message || 'Failed to load tags', 5000)
		console.error('Failed to fetch tags:', error.message || error)
	}
})

const onRowClick = (event: any) => {
	// 	const request = event.data
	// 	const index = selectedRequests.value.findIndex((r: Request) => r.id === request.id)
	// 	if (index > -1) {
	// 		selectedRequests.value = selectedRequests.value.filter((r: Request) => r.id !== request.id)
	// 	} else {
	// 		selectedRequests.value = [...selectedRequests.value, request]
	// 	}
}
</script>

<template>
	<!-- <pre>{{ selectedRequests }}</pre> -->
	<div class="requests-page">
		<div
			class="header-actions flex justify-content-between align-items-center m-6">
			<!-- <h2 class="text-xl font-semibold m-0">Requests</h2> -->
			<div class="flex gap-2">
				<Dropdown
					v-model="selectedScope"
					:options="scopeOptions"
					optionLabel="label"
					optionValue="value"
					@change="fetchRequests"
					class="w-48" />
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
			:rows="25"
			dataKey="id"
			:rowHover="true"
			stripedRows
			tableStyle="min-width: 50rem"
			class="p-datatable-sm"
			:sortField="sortField"
			:sortOrder="sortOrder"
			@sort="onSort">
			<!-- v-model:selection="selectedRequests"
			selectionMode="multiple" -->
			<!-- <Column selectionMode="multiple" headerStyle="width: 3rem"></Column> -->
			<!-- <Column header="Essential">
				<template #body="{ data }">
					<Checkbox v-if="data.orders?.[0]" :modelValue="data.orders[0].isBasicNeed" :binary="true" disabled />
					<span v-else>-</span>
				</template>
			</Column>			 -->
			<Column field="title" header="Title" sortable>
				<template #body="{ data }">
					<span class="font-semibold">{{ data.title }}</span>
				</template>
			</Column>
			<Column field="totalPriority" header="Priority" sortable>
				<template #body="{ data }">
					<span class="">{{ data.totalPriority }}</span>
				</template>
			</Column>
			<Column field="communityNode.title" header="Community" sortable>
				<template #body="{ data }">
					<span>{{ data.communityNode?.title || '-' }}</span>
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
							v-for="tag in data.tags"
							:key="tag.id"
							:value="tag.name"
							severity="info" />
					</div>
				</template>
			</Column>
			<Column field="body" header="Description">
				<template #body="{ data }">
					<span>{{ data.body || '-' }}</span>
				</template>
			</Column>
			<Column header="Actions" :exportable="false" style="min-width: 0rem">
				<template #body="{ data }">
					<div class="flex gap-1">
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
					<label for="body">Description</label>
					<Textarea
						id="body"
						placeholder="A brief description of the matter"
						v-model="formData.body"
						:disabled="!isOwner"
						rows="3" />
				</div>
				<div v-if="formData.title.endsWith('?')">
					<div class="flex gap-4">
						<div
							v-if="dialogMode !== 'create'"
							key="join-button"
							class="form-field flex-1">
							<label for="quantity">&nbsp;</label>
							<Button
								:label="formData.order.quantity ? 'Joined' : 'Join'"
								class="w-full"
								@click="
									formData.order.quantity = formData.order.quantity ? 0 : 1
								" />
						</div>
						<div class="form-field flex-1">
							<label for="priority">Priority Points</label>
							<InputNumber id="priority" v-model="formData.order.priority" />
						</div>
					</div>
				</div>
				<div v-if="!formData.title.endsWith('?')" class="flex gap-4">
					<Transition name="slide-fade" mode="out-in">
						<div
							v-if="formData.unitOfMeasure !== UnitOfMeasure.None"
							key="quantity-input"
							class="form-field flex-1">
							<label for="quantity">Quantity</label>
							<InputNumber
								id="quantity"
								v-model="formData.order.quantity"
								@input="e => (formData.order.quantity = e.value as number)" />
						</div>
						<div
							v-else-if="dialogMode !== 'create'"
							key="join-button"
							class="form-field flex-1">
							<label for="quantity">&nbsp;</label>
							<Button
								:label="formData.order.quantity ? 'Joined' : 'Join'"
								class="w-full"
								@click="
									formData.order.quantity = formData.order.quantity ? 0 : 1
								" />
						</div>
					</Transition>
					<div class="form-field flex-1">
						<label for="unitOfMeasure">Unit</label>
						<Dropdown
							id="unitOfMeasure"
							v-model="formData.unitOfMeasure"
							:options="
								Object.keys(UnitOfMeasure).map(key => ({
									label: key,
									value: key as UnitOfMeasure,
								}))
							"
							optionLabel="label"
							optionValue="value"
							:disabled="!isOwner"
							placeholder="Select unit" />
					</div>
					<div class="form-field flex-1">
						<label for="priority">Priority</label>
						<InputNumber id="priority" v-model="formData.order.priority" />
					</div>
					<div class="form-field flex-1">
						<label for="isBasicNeed" class="cursor-pointer">Essential</label>
						<Checkbox
							inputId="isBasicNeed"
							v-model="formData.order.isBasicNeed"
							:binary="true" />
					</div>
				</div>
				<div v-if="!formData.title.endsWith('?')" class="flex gap-4">
					<div class="form-field flex-1">
						<label for="recurrence">Recurrence</label>
						<Dropdown
							id="recurrence"
							v-model="formData.order.recurrencePeriod"
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
							v-model="formData.order.dueAt"
							dateFormat="mm/dd/yy" />
					</div>
					<div class="form-field flex-1">
						<label for="estimatedDeliveryAt">Est. Delivery Date</label>
						<DatePicker
							id="estimatedDeliveryAt"
							v-model="formData.order.estimatedDeliveryAt"
							dateFormat="mm/dd/yy"
							disabled />
					</div>
				</div>
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
				<div class="flex justify-content-between gap-2 w-full">
					<div class="flex-1">
						<Button
							v-if="dialogMode !== 'create'"
							:label="`${currentRequest?.orderCount ?? 0} requests${
								totalRequestedQuantity > 0
									? ` (${totalRequestedQuantity} items total)`
									: ''
							}`"
							text
							@click="showOrders" />
					</div>
					<div class="flex gap-2">
						<Button label="Cancel" text @click="dialogVisible = false" />
						<Button
							:label="
								isOwner
									? dialogMode === 'create'
										? 'Create'
										: 'Update'
									: 'Join'
							"
							@click="saveRequest"
							:loading="saving" />
					</div>
				</div>
			</template>
		</Dialog>

		<Dialog
			v-model:visible="ordersDialogVisible"
			:header="`Orders - ${currentRequestTitle}`"
			:modal="true"
			dismissableMask
			:style="{ width: '700px' }"
			:breakpoints="{ '960px': '90vw', '640px': '95vw' }"
			show-effect="fadeIn"
			hide-effect="fadeOut"
			@update:visible="closeOrdersDialog">
			<OrdersList
				:orders="currentRequestOrders"
				:unitOfMeasure="currentRequest?.unitOfMeasure || UnitOfMeasure.None" />
		</Dialog>
	</div>
</template>

<style scoped></style>
