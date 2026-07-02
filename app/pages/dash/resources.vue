<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '~~/server/trpc/routers'
import { MeasurementType } from '~~/prisma/generated/client/enums'
import { useConfirm } from 'primevue/useconfirm'

type ResourceRouterOutput = inferRouterOutputs<AppRouter>['resourceNodes']
type Resource = ResourceRouterOutput['list'][number]

definePageMeta({
	layout: 'dashboard',
})

const { $trpcClient } = useNuxtApp()
const toast = usePausableToast()
const confirm = useConfirm()
const { data: session } = useAuth()

const resources = ref<Resource[]>([])
const loading = ref(true)
const saving = ref(false)
const searchQuery = ref('')

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'update'>('create')
const currentResourceId = ref<number | null>(null)

const measurementOptions = Object.keys(MeasurementType).map(key => ({
	label: key,
	value: key as MeasurementType,
}))

const formData = ref({
	title: '',
	description: '',
	isActive: true,
	measurementType: 'Units' as MeasurementType,
	quantityAvailable: 0,
	monthlyCapacity: 0,
	shelfLife: null as number | null,
	minQuantity: 0,
	reservedQuantity: 0,
	monetaryValuePerUnit: 0,
})

const resetForm = () => {
	formData.value = {
		title: '',
		description: '',
		isActive: true,
		measurementType: 'Units' as MeasurementType,
		quantityAvailable: 0,
		monthlyCapacity: 0,
		shelfLife: null as number | null,
		minQuantity: 0,
		reservedQuantity: 0,
		monetaryValuePerUnit: 0,
	}
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const fetchResources = async () => {
	loading.value = true
	try {
		const result = await $trpcClient.resourceNodes.list.query({
			search: searchQuery.value || undefined,
		})
		resources.value = result || []
	} catch (error: any) {
		console.error('Failed to fetch resources:', error)
		toast.add('Error', error.message || 'Failed to fetch resources')
	} finally {
		loading.value = false
	}
}

const debouncedSearch = () => {
	if (searchTimeout) clearTimeout(searchTimeout)
	searchTimeout = setTimeout(() => {
		fetchResources()
	}, 300)
}

const openNewDialog = () => {
	resetForm()
	dialogMode.value = 'create'
	dialogVisible.value = true
}

const editResource = (resource: Resource) => {
	formData.value = {
		title: resource.title,
		description: resource.description || '',
		isActive: resource.isActive,
		measurementType: resource.measurementType as MeasurementType,
		quantityAvailable: resource.quantityAvailable,
		monthlyCapacity: resource.monthlyCapacity,
		shelfLife: resource.shelfLife,
		minQuantity: resource.minQuantity,
		reservedQuantity: resource.reservedQuantity,
		monetaryValuePerUnit: resource.monetaryValuePerUnit,
	}
	currentResourceId.value = resource.id
	dialogMode.value = 'update'
	dialogVisible.value = true
}

const saveResource = async () => {
	if (!formData.value.title) {
		toast.add('Warning', 'Title is required')
		return
	}

	saving.value = true
	try {
		const payload = {
			...formData.value,
			ownerId: session.value?.user?.id ?? '',
		}

		if (dialogMode.value === 'create') {
			await $trpcClient.resourceNodes.create.mutate(payload)
			toast.add('Success', 'Resource created successfully')
		} else if (dialogMode.value === 'update' && currentResourceId.value) {
			await $trpcClient.resourceNodes.update.mutate({
				...payload,
				id: currentResourceId.value,
			})
			toast.add('Success', 'Resource updated successfully')
		}
		dialogVisible.value = false
		fetchResources()
	} catch (error: any) {
		console.error('Failed to save resource:', error)
		toast.add('Error', error.message || 'Failed to save resource')
	} finally {
		saving.value = false
	}
}

const confirmDelete = (event: MouseEvent, resource: Resource) => {
	confirm.require({
		target: event.currentTarget as HTMLElement,
		message: `Do you want to delete "${resource.title}"?`,
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
				await $trpcClient.resourceNodes.delete.mutate({
					id: resource.id,
				})
				toast.add('Success', 'Resource deleted successfully')
				fetchResources()
			} catch (error: any) {
				console.error('Failed to delete resource:', error)
				toast.add('Error', error.message || 'Failed to delete resource')
			}
		},
	})
}

const isOwnerOrEditor = (data: Resource) =>
	session.value?.user?.id === data.ownerId ||
	data.editors?.some(e => e.id === session.value?.user?.id) ||
	session.value?.user?.role === 'admin'

onMounted(() => {
	fetchResources()
})
</script>

<template>
	<div class="resources-page">
		<div class="flex justify-content-between align-items-center m-6">
			<InputGroup class="w-auto">
				<InputGroupAddon>
					<i class="pi pi-search" />
				</InputGroupAddon>
				<InputText
					v-model="searchQuery"
					placeholder="Search resources..."
					@input="debouncedSearch" />
			</InputGroup>
			<Button
				label="New Resource"
				class="ml-2"
				icon="pi pi-plus"
				@click="openNewDialog" />
		</div>
	</div>

	<DataTable
		:value="resources"
		:loading="loading"
		:paginator="true"
		:rows="25"
		dataKey="id"
		:rowHover="true"
		resizableColumns
		stripedRows>
		<Column field="title" header="Title" sortable>
			<template #body="{ data }">
				<span class="font-medium">{{ data.title }}</span>
			</template>
		</Column>
		<Column field="measurementType" header="Measurement" sortable>
			<template #body="{ data }">
				<span>{{ data.measurementType }}</span>
			</template>
		</Column>
		<Column field="quantityAvailable" header="Available" sortable>
			<template #body="{ data }">
				<span>{{ formatNumber(data.quantityAvailable) }}</span>
			</template>
		</Column>
		<Column field="monthlyCapacity" header="Monthly Capacity" sortable>
			<template #body="{ data }">
				<span>{{ formatNumber(data.monthlyCapacity) }}</span>
			</template>
		</Column>
		<Column field="shelfLife" header="Shelf Life" sortable>
			<template #body="{ data }">
				<span>{{ formatNumber(data.shelfLife, 0) }}</span>
			</template>
		</Column>
		<Column field="monetaryValuePerUnit" header="Value / Unit" sortable>
			<template #body="{ data }">
				<span>{{ formatNumber(data.monetaryValuePerUnit) }}</span>
			</template>
		</Column>
		<Column field="description" header="Description" style="max-width: 300px">
			<template #body="{ data }">
				<span class="auto-ellipsis">{{ data.description }}</span>
			</template>
		</Column>
		<Column header="Actions" :exportable="false" class="actions-column">
			<template #body="{ data }">
				<div class="action-buttons">
					<Button
						v-if="isOwnerOrEditor(data)"
						icon="pi pi-pencil"
						text
						rounded
						severity="success"
						@click="editResource(data)"
						v-tooltip.top="'Edit'" />
					<Button
						v-if="isOwnerOrEditor(data)"
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
				<span class="text-zinc-500">No resources found.</span>
			</div>
		</template>
	</DataTable>

	<Dialog
		v-model:visible="dialogVisible"
		:header="dialogMode === 'create' ? 'New Resource' : 'Edit Resource'"
		:modal="true"
		dismissableMask
		:style="{ width: '600px' }"
		:breakpoints="{ '960px': '90vw', '640px': '95vw' }"
		show-effect="fadeIn"
		hide-effect="fadeOut">
		<div class="form-content gap-3">
			<div class="form-field">
				<label for="title">Title *</label>
				<InputText
					id="title"
					placeholder="e.g. Portland Cement"
					v-model="formData.title"
					v-bind:autofocus="dialogMode === 'create'" />
			</div>
			<div class="form-field">
				<label for="description">Description</label>
				<Textarea
					id="description"
					placeholder="A brief description of this resource"
					v-model="formData.description"
					rows="3" />
			</div>
			<div class="flex gap-4">
				<div class="form-field flex-1">
					<label for="measurementType">Measurement Type *</label>
					<Dropdown
						id="measurementType"
						v-model="formData.measurementType"
						:options="measurementOptions"
						optionLabel="label"
						optionValue="value"
						placeholder="Select measurement"
						class="w-full" />
				</div>
			</div>
			<div class="flex gap-4">
				<div class="form-field flex-1">
					<label for="quantityAvailable">Quantity Available</label>
					<InputNumber
						id="quantityAvailable"
						v-model="formData.quantityAvailable"
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
					<label for="shelfLife">Shelf Life</label>
					<InputNumber
						id="shelfLife"
						v-model="formData.shelfLife"
						:minFractionDigits="0"
						:maxFractionDigits="0" />
				</div>
				<div class="form-field flex-1">
					<label for="minQuantity">Min Quantity</label>
					<InputNumber
						id="minQuantity"
						v-model="formData.minQuantity"
						:minFractionDigits="0"
						:maxFractionDigits="2" />
				</div>
			</div>
			<div class="flex gap-4">
				<div class="form-field flex-1">
					<label for="reservedQuantity">Reserved Quantity</label>
					<InputNumber
						id="reservedQuantity"
						v-model="formData.reservedQuantity"
						:minFractionDigits="0"
						:maxFractionDigits="2"
						disabled
						v-tooltip.top="
							'Stock levels are managed via the Stock Movements page'
						" />
				</div>
				<div class="form-field flex-1">
					<label for="monetaryValuePerUnit">Monetary Value / Unit</label>
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
				<label for="isActive" class="cursor-pointer">Active</label>
				<Checkbox
					inputId="isActive"
					v-model="formData.isActive"
					:binary="true" />
			</div>
		</div>
		<template #footer>
			<Button label="Cancel" text @click="dialogVisible = false" />
			<Button
				:label="dialogMode === 'create' ? 'Create' : 'Update'"
				@click="saveResource"
				:loading="saving" />
		</template>
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
