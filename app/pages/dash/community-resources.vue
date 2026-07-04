<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import Quantity from '~/components/requests/Quantity.vue'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '~~/server/trpc/routers'
import { MeasurementType } from '~~/prisma/generated/client/enums'
import { useConfirm } from 'primevue/useconfirm'

type CommunityResourceRouterOutput =
	inferRouterOutputs<AppRouter>['communityResources']
type CommunityResource = CommunityResourceRouterOutput['list'][number]
type ResourceOption = CommunityResourceRouterOutput['resources'][number]
type CommunityOption = CommunityResourceRouterOutput['communities'][number]

definePageMeta({
	layout: 'dashboard',
})

const { $trpcClient } = useNuxtApp()
const toast = usePausableToast()
const confirm = useConfirm()
const { setRef, checkOverflow, isOverflow } = useTextOverflow()

const communityResources = ref<CommunityResource[]>([])
const allResources = ref<ResourceOption[]>([])
const allCommunities = ref<CommunityOption[]>([])
const loading = ref(true)
const saving = ref(false)
const searchQuery = ref('')
const selectedCommunityId = ref<number | undefined>(undefined)

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'update'>('create')
const currentId = ref<number | null>(null)

const formData = ref({
	isActive: true,
	resourceId: undefined as number | undefined,
	communityId: undefined as number | undefined,
	quantity: 0,
	monthlyCapacity: 0,
	minQuantity: 0,
	reservedQuantity: 0,
	monetaryValuePerUnit: 0,
})

const resetForm = () => {
	formData.value = {
		isActive: true,
		resourceId: undefined,
		communityId: undefined,
		quantity: 0,
		monthlyCapacity: 0,
		minQuantity: 0,
		reservedQuantity: 0,
		monetaryValuePerUnit: 0,
	}
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const fetchCommunityResources = async () => {
	loading.value = true
	try {
		const result = await $trpcClient.communityResources.list.query({
			search: searchQuery.value || undefined,
			communityId: selectedCommunityId.value ?? undefined,
		})
		communityResources.value = result || []
	} catch (error: any) {
		console.error('Failed to fetch community resources:', error)
		toast.add('Error', error.message || 'Failed to fetch community resources')
	} finally {
		loading.value = false
	}
}

const debouncedSearch = () => {
	if (searchTimeout) clearTimeout(searchTimeout)
	searchTimeout = setTimeout(() => {
		fetchCommunityResources()
	}, 300)
}

const openNewDialog = () => {
	resetForm()
	dialogMode.value = 'create'
	dialogVisible.value = true
}

const editCommunityResource = (item: CommunityResource) => {
	formData.value = {
		isActive: item.isActive,
		resourceId: item.resourceId,
		communityId: item.communityId,
		quantity: item.quantity,
		monthlyCapacity: item.monthlyCapacity,
		minQuantity: item.minQuantity,
		reservedQuantity: item.reservedQuantity,
		monetaryValuePerUnit: item.monetaryValuePerUnit,
	}
	currentId.value = item.id
	dialogMode.value = 'update'
	dialogVisible.value = true
}

const saveCommunityResource = async () => {
	const resourceId = formData.value.resourceId
	const communityId = formData.value.communityId
	if (!resourceId) {
		toast.add('Warning', 'A resource is required')
		return
	}
	if (!communityId) {
		toast.add('Warning', 'A community is required')
		return
	}

	saving.value = true
	try {
		const payload = {
			isActive: formData.value.isActive,
			resourceId,
			communityId,
			monthlyCapacity: formData.value.monthlyCapacity,
			minQuantity: formData.value.minQuantity,
			monetaryValuePerUnit: formData.value.monetaryValuePerUnit,
		}
		if (dialogMode.value === 'create') {
			await $trpcClient.communityResources.create.mutate(payload)
			toast.add('Success', 'Community resource created successfully')
		} else if (dialogMode.value === 'update' && currentId.value) {
			await $trpcClient.communityResources.update.mutate({
				...payload,
				id: currentId.value,
			})
			toast.add('Success', 'Community resource updated successfully')
		}
		dialogVisible.value = false
		fetchCommunityResources()
	} catch (error: any) {
		console.error('Failed to save community resource:', error)
		toast.add('Error', error.message || 'Failed to save community resource')
	} finally {
		saving.value = false
	}
}

const confirmDelete = (event: MouseEvent, item: CommunityResource) => {
	confirm.require({
		target: event.currentTarget as HTMLElement,
		message: `Do you want to remove "${item.resource?.title}" from ${item.community?.title}?`,
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
				await $trpcClient.communityResources.delete.mutate({
					id: item.id,
				})
				toast.add('Success', 'Community resource deleted successfully')
				fetchCommunityResources()
			} catch (error: any) {
				console.error('Failed to delete community resource:', error)
				toast.add('Error', error.message || 'Failed to delete')
			}
		},
	})
}

const measurementLabel = (resourceId: number) =>
	allResources.value.find(r => r.id === resourceId)?.measurementType ?? ''

onMounted(async () => {
	fetchCommunityResources()
	try {
		allResources.value =
			(await $trpcClient.communityResources.resources.query()) || []
	} catch (error: any) {
		console.error('Failed to fetch resources:', error)
	}
	try {
		allCommunities.value =
			(await $trpcClient.communityResources.communities.query()) || []
	} catch (error: any) {
		console.error('Failed to fetch communities:', error)
	}
})
</script>

<template>
	<div class="community-resources-page">
		<div class="flex justify-content-between align-items-center m-6">
			<InputGroup class="w-auto">
				<InputGroupAddon>
					<i class="pi pi-search" />
				</InputGroupAddon>
				<InputText
					v-model="searchQuery"
					placeholder="Search by resource..."
					@input="debouncedSearch" />
				<Dropdown
					v-model="selectedCommunityId"
					:options="allCommunities"
					optionLabel="title"
					optionValue="id"
					placeholder="All communities"
					@change="fetchCommunityResources"
					showClear
					filter
					class="w-48" />
			</InputGroup>
			<Button
				label="New Stock Entry"
				class="ml-2"
				icon="pi pi-plus"
				@click="openNewDialog" />
		</div>
	</div>

	<DataTable
		class="cr-table"
		:value="communityResources"
		:loading="loading"
		:paginator="true"
		:rows="25"
		dataKey="id"
		:rowHover="true"
		resizableColumns
		columnResizeMode="fit"
		stripedRows>
		<Column field="resource.title" header="Resource" sortable>
			<template #body="{ data }">
				<span class="font-medium">{{ data.resource?.title || '-' }}</span>
			</template>
		</Column>
		<!-- <Column field="resource.measurementType" header="Measurement">
			<template #body="{ data }">
				<span>{{ measurementLabel(data.resourceId) }}</span>
			</template>
		</Column> -->
		<Column field="community.title" header="Community" sortable>
			<template #body="{ data }">
				<span>{{ data.community?.title || '-' }}</span>
			</template>
		</Column>
		<Column field="quantity" header="Available" sortable>
			<template #body="{ data }">
				<Quantity
					:modelValue="data.quantity"
					:measurementType="
						data.resource?.measurementType ?? MeasurementType.None
					"
					readonly />
			</template>
		</Column>
		<Column field="monthlyCapacity" header="Monthly Capacity" sortable>
			<template #body="{ data }">
				<Quantity
					:modelValue="data.monthlyCapacity"
					:measurementType="
						data.resource?.measurementType ?? MeasurementType.None
					"
					readonly />
			</template>
		</Column>
		<Column field="monetaryValuePerUnit" header="Value/Unit" sortable>
			<template #body="{ data }">
				<span>{{ formatCurrency(data.monetaryValuePerUnit) }}</span>
			</template>
		</Column>
		<Column field="resource.description" header="Description">
			<template #body="{ data }">
				<span
					:ref="el => setRef(data.id, el as HTMLElement)"
					v-tooltip.top="{
						value: data.resource?.description,
						disabled: !isOverflow(data.id),
						showDelay: 100,
						pt: { root: { style: { maxWidth: '450px' } } },
					}"
					class="auto-ellipsis"
					@mouseenter="checkOverflow(data.id)"
					>{{ data.resource?.description }}</span
				>
			</template>
		</Column>
		<Column
			header="Actions"
			:exportable="false"
			class="actions-column"
			style="width: 6rem">
			<template #body="{ data }">
				<div class="action-buttons">
					<Button
						icon="pi pi-pencil"
						text
						rounded
						severity="success"
						@click="editCommunityResource(data)"
						v-tooltip.top="'Edit'" />
					<Button
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
				<span class="text-zinc-500">No community resources found.</span>
			</div>
		</template>
	</DataTable>

	<Dialog
		v-model:visible="dialogVisible"
		:header="dialogMode === 'create' ? 'New Stock Entry' : 'Edit Stock Entry'"
		:modal="true"
		dismissableMask
		:style="{ width: '600px' }"
		:breakpoints="{ '960px': '90vw', '640px': '95vw' }"
		show-effect="fadeIn"
		hide-effect="fadeOut">
		<div class="form-content gap-3">
			<div class="flex gap-4">
				<div class="form-field flex-1">
					<label for="resourceId">Resource *</label>
					<Dropdown
						id="resourceId"
						v-model="formData.resourceId"
						:options="allResources"
						optionLabel="title"
						optionValue="id"
						placeholder="Select a resource"
						class="w-full"
						filter />
				</div>
				<div class="form-field flex-1">
					<label for="communityId">Community *</label>
					<Dropdown
						id="communityId"
						v-model="formData.communityId"
						:options="allCommunities"
						optionLabel="title"
						optionValue="id"
						placeholder="Select a community"
						class="w-full"
						filter />
				</div>
			</div>
			<div class="flex gap-4">
				<div class="form-field flex-1">
					<label for="quantity">Quantity</label>
					<InputNumber
						id="quantity"
						v-model="formData.quantity"
						:minFractionDigits="0"
						:maxFractionDigits="2"
						disabled
						v-tooltip.top="
							'Stock levels are managed via the Stock Movements page'
						" />
					<small class="text-zinc-500">
						Managed via
						<NuxtLink to="/dash/stock-movements" class="underline"
							>Stock Movements</NuxtLink
						>
					</small>
				</div>
				<div class="form-field flex-1">
					<label for="monthlyCapacity">Monthly Capacity</label>
					<InputNumber
						id="monthlyCapacity"
						v-model="formData.monthlyCapacity"
						:minFractionDigits="0"
						:maxFractionDigits="2" />
				</div>
			</div>
			<div class="flex gap-4">
				<div class="form-field flex-1">
					<label for="minQuantity">Min Quantity</label>
					<InputNumber
						id="minQuantity"
						v-model="formData.minQuantity"
						:minFractionDigits="0"
						:maxFractionDigits="2" />
				</div>
				<div class="form-field flex-1">
					<label for="monetaryValuePerUnit">Value / Unit</label>
					<InputNumber
						id="monetaryValuePerUnit"
						v-model="formData.monetaryValuePerUnit"
						:minFractionDigits="0"
						:maxFractionDigits="2"
						mode="currency"
						currency="USD" />
				</div>
			</div>
			<div class="form-field">
				<label for="crIsActive" class="cursor-pointer">Active</label>
				<Checkbox
					inputId="crIsActive"
					v-model="formData.isActive"
					:binary="true" />
			</div>
		</div>
		<template #footer>
			<Button label="Cancel" text @click="dialogVisible = false" />
			<Button
				:label="dialogMode === 'create' ? 'Create' : 'Update'"
				@click="saveCommunityResource"
				:loading="saving" />
		</template>
	</Dialog>
</template>

<style scoped>
.cr-table :deep(.p-datatable-table) {
	table-layout: fixed;
}

.cr-table :deep(.p-datatable-thead th),
.cr-table :deep(.p-datatable-tbody td) {
	white-space: normal;
}

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
