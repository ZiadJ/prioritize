<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import type { Tag } from '~/components/Tags.vue'
import Tags from '~/components/Tags.vue'
import OrdersList from '~/components/requests/OrdersList.vue'
import { UnitOfMeasure } from '~~/prisma/generated/client/enums'
import { useConfirm } from "primevue/useconfirm"

definePageMeta({
	layout: 'dashboard',
})

const { $trpcClient } = useNuxtApp()
const toast = usePausableToast()
const confirm = useConfirm()
const { data: session } = useAuth()

const requests = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const searchQuery = ref('')
const selectedRequests = ref<any[]>([])

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'update' | 'view'>('create')
const currentRequestId = ref<number | null>(null)
const currentRequest = ref<any>(null)
const ordersDialogVisible = ref(false)
const currentRequestOrders = ref<any[]>([])
const currentRequestTitle = ref('')

const allTags = ref<Tag[]>([])

const totalRequestedQuantity = computed(() => {
	if (!currentRequest.value?.orders) return 0
	return currentRequest.value.orders.reduce((sum: number, order: any) => {
		const qty = order.quantity || 0
		return sum + qty
	}, 0)
})

const formData = ref({
	title: '',
	body: '',
	isActive: true,
	isBasicNeed: false,
	selectedTags: [] as Tag[],
	unitOfMeasure: 'None' as UnitOfMeasure,
	order: {
		quantity: undefined as number | undefined,
		recurrencePeriod: 0,
	} as { quantity?: number | null; recurrencePeriod: number }
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
		isActive: true,
		isBasicNeed: false,
		selectedTags: [],
		unitOfMeasure: 'None' as UnitOfMeasure,
		order: {
			quantity: 1,
			recurrencePeriod: 0,
		}
	}
	dialogMode.value = 'create'
	dialogVisible.value = true
}

const viewRequest = (request: any) => {
	const order = request.orders?.find((o: any) => o.userId === session.value?.user?.id)
	formData.value = {
		title: request.title,
		body: request.body,
		isActive: request.isActive,
		isBasicNeed: request.isBasicNeed || false,
		selectedTags: request.tags || [],
		unitOfMeasure: request.unitOfMeasure as UnitOfMeasure,
		order: {
			quantity: order?.quantity ?? undefined,
			recurrencePeriod: order?.recurrencePeriod || 0,
		}
	}
	viewCommunity.value = request.communityNode?.title || '-'
	viewCountry.value = request.country?.name || '-'
	currentRequest.value = request
	dialogMode.value = 'view'
	dialogVisible.value = true
}

const editRequest = (request: any) => {
	const order = request.orders?.find((o: any) => o.userId === session.value?.user?.id)
	formData.value = {
		title: request.title,
		body: request.body,
		isActive: request.isActive,
		isBasicNeed: request.isBasicNeed || false,
		selectedTags: request.tags || [],
		unitOfMeasure: request.unitOfMeasure as UnitOfMeasure,
		order: {
			quantity: order?.quantity ?? undefined,
			recurrencePeriod: order?.recurrencePeriod || 0,
		}
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

const confirmDelete = (event: MouseEvent, request: any) => {
	confirm.require({
		target: event.currentTarget as HTMLElement,
		message: `Do you want to delete "${request.title}"?`,
		group: "right",
		icon: 'pi pi-info-circle',
		rejectProps: {
			label: 'Cancel',
			severity: 'secondary',
			outlined: true
		},
		acceptProps: {
			label: 'Delete',
			severity: 'danger'
		},
		accept: async () => {
			deleting.value = true
			try {
				await $trpcClient.requests.delete.mutate({ id: request.id })
				toast.add('success', 'Success', 'Request deleted successfully', 3000)
				fetchRequests()
			} catch (error: any) {
				console.error('Failed to delete request:', error)
				toast.add('error', 'Error', error.message || 'Failed to delete request', 5000)
			} finally {
				deleting.value = false
			}
		}
	})
}

const showOrders = () => {
	if (!currentRequest.value) return
	currentRequestTitle.value = currentRequest.value.title
	const allOrders = currentRequest.value.orders || []
	// Exclude current user's own order
	currentRequestOrders.value = allOrders //.filter(
	//	(o: any) => o.userId !== session.value?.user?.id,
	//)
	ordersDialogVisible.value = true
}

const closeOrdersDialog = () => {
	ordersDialogVisible.value = false
	currentRequestOrders.value = []
	currentRequestTitle.value = ''
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
		<div class="header-actions flex justify-content-between align-items-center m-6">
			<!-- <h2 class="text-xl font-semibold m-0">Requests</h2> -->
			<div class="flex gap-2">
				<IconField>
					<InputIcon>
						<i class="pi pi-search" />
					</InputIcon>
					<InputText v-model="searchQuery" placeholder="Search requests..." @input="debouncedSearch" class="w-full" />
				</IconField>
				<Button label="New Request" class="ml-2" icon="pi pi-plus" @click="openNewDialog" />
			</div>
		</div>

		<DataTable :value="requests" :loading="loading" :paginator="true" :rows="10" v-model:selection="selectedRequests"
			dataKey="id" :rowHover="true" stripedRows tableStyle="min-width: 50rem" class="p-datatable-sm">
			<Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
			<Column field="title" header="Title" sortable>
				<template #body="{ data }">
					<span class="font-semibold">{{ data.title }}</span>
				</template>
			</Column>
			<Column field="isBasicNeed" header="Essential">
				<template #body="{ data }">
					<Tag :value="data.isBasicNeed ? 'Yes' : 'No'" :severity="data.isBasicNeed ? 'danger' : 'secondary'" />
				</template>
			</Column>
			<Column field="communityNode" header="Community">
				<template #body="{ data }">
					<span>{{ data.communityNode?.title || '-' }}</span>
				</template>
			</Column>

			<Column field="tags" header="Tags">
				<template #body="{ data }">
					<div class="flex flex-wrap gap-1">
						<Tag v-for="tag in data.tags" :key="tag.id" :value="tag.name" severity="info" />
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
						<Button icon="pi pi-eye" text rounded severity="info" @click="viewRequest(data)" v-tooltip.top="'View'" />
						<Button v-if="
							session?.user.id === data.ownerId ||
							data.editors?.some((e: any) => e.id === session?.user.id)
						" icon="pi pi-pencil" text rounded severity="success" @click="editRequest(data)" v-tooltip.top="'Edit'" />
						<Button v-if="
							session?.user.id === data.ownerId ||
							data.editors?.some((e: any) => e.id === session?.user.id)
						" icon="pi pi-trash" text rounded severity="danger" @click="confirmDelete($event, data)"
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

		<Dialog v-model:visible="dialogVisible" :header="dialogMode === 'create'
				? 'New Request'
				: dialogMode === 'update'
					? 'Edit Request'
					: 'View Request'
			" :modal="true" dismissableMask :style="{ width: '500px' }" :breakpoints="{ '960px': '90vw', '640px': '95vw' }"
			show-effect="fadeIn" hide-effect="fadeOut">
			<div class="form-content gap-3">
				<div class="form-field">
					<label for="title">Title *</label>
					<InputText id="title" placeholder="Enter a question, issue or request" v-model="formData.title"
						:disabled="dialogMode === 'view'" v-bind:autofocus="dialogMode === 'create'" />
				</div>
				<div class="form-field">
					<label for="body">Description</label>
					<Textarea id="body" placeholder="A brief description of the question, issue or request"
						v-model="formData.body" :disabled="dialogMode === 'view'" rows="3" />
				</div>
				<div class="form-field">
					<label for="recurrence">Recurrence</label>
					<Dropdown id="recurrence" v-model="formData.order.recurrencePeriod" :options="[
						{ label: 'None', value: 0 },
						{ label: 'Daily', value: 1 },
						{ label: 'Weekly', value: 7 },
						{ label: 'Monthly', value: 30 },
						{ label: 'Quarterly', value: 90 },
						{ label: 'Semi-annually', value: 180 },
						{ label: 'Annually', value: 365 },
					]" optionLabel="label" optionValue="value" :disabled="dialogMode === 'view'" placeholder="Select recurrence" />
				</div>
                <div class="flex gap-4">
                    <Transition name="slide-fade" mode="out-in">
                        <div v-if="formData.unitOfMeasure !== UnitOfMeasure.None" key="quantity-input" class="form-field flex-1">
                            <label for="quantity">Quantity</label>
                            <InputNumber id="quantity" v-model="formData.order.quantity"
                                :disabled="dialogMode === 'view'" @input="e => (formData.order.quantity = e.value as number | undefined)" />
                        </div>
                        <div v-else-if="dialogMode !== 'create'" key="join-button" class="form-field flex-1">
                            <label for="quantity">&nbsp;</label>
                            <Button :label="formData.order.quantity ? 'Joined' : 'Join'"
                                :disabled="dialogMode === 'view'" class="w-full" @click="formData.order.quantity = formData.order.quantity ? 0 : 1" />
                        </div>
                    </Transition>
                    <div class="form-field flex-1">
                            <label for="unitOfMeasure">Unit of Measure</label>
                            <Dropdown id="unitOfMeasure" v-model="formData.unitOfMeasure" :options="Object.keys(UnitOfMeasure).map(key => ({
                                label: key,
                                value: key as UnitOfMeasure,
                            }))"
                                    optionLabel="label" optionValue="value" :disabled="dialogMode === 'view'" placeholder="Select unit" />
                    </div>
                    <div class="form-field flex-1">
                        <label for="isBasicNeed" class="cursor-pointer">Essential</label>
                        <Checkbox inputId="isBasicNeed" v-model="formData.isBasicNeed" :binary="true"
                            :disabled="dialogMode === 'view'" />
                    </div>
                </div>

				<div class="form-field">
					<label for="tags">Tags</label>
					<Tags v-model="formData.selectedTags" :tags="allTags" :disabled="dialogMode === 'view'"
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
					<SelectButton id="isActive" v-model="formData.isActive" :options="[
						{ label: 'Active', value: true },
						{ label: 'Inactive', value: false },
					]" optionLabel="label" optionValue="value" />
				</div>
			</div>
				<template #footer>
			<div class="flex justify-content-between gap-2 w-full">
				<div class="flex-1">
					<Button v-if="dialogMode !== 'create'" 
						:label="`${currentRequest.orders?.length ?? 0} requests${totalRequestedQuantity > 0 ? ` (${totalRequestedQuantity} total)` : ''}`" text @click="showOrders" />
				</div>
				<div class="flex gap-2">
					<Button label="Cancel" text @click="dialogVisible = false" />
					<Button v-if="dialogMode !== 'view'" :label="dialogMode === 'create' ? 'Create' : 'Update'"
						@click="saveRequest" :loading="saving" />
				</div>
			</div>
			</template>
		</Dialog>

		<Dialog v-model:visible="ordersDialogVisible" :header="`Orders - ${currentRequestTitle}`" :modal="true"
			dismissableMask :style="{ width: '700px' }" :breakpoints="{ '960px': '90vw', '640px': '95vw' }"
			show-effect="fadeIn" hide-effect="fadeOut"
			@update:visible="closeOrdersDialog">
			<OrdersList :orders="currentRequestOrders" 
				:unitOfMeasure="currentRequest?.unitOfMeasure || UnitOfMeasure.None" />
		</Dialog>
	</div>
</template>

<style scoped>

</style>
