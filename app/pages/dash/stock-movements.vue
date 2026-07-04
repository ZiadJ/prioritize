<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import Quantity from '~/components/requests/Quantity.vue'
import { MeasurementType } from '~~/prisma/generated/client/enums'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '~~/server/trpc/routers'

type StockMovementRouterOutput = inferRouterOutputs<AppRouter>['stockMovements']
type StockMovement = StockMovementRouterOutput['list'][number]
type CommunityResourceOption =
	StockMovementRouterOutput['communityResources'][number]
type StepCostOption = StockMovementRouterOutput['stepCosts'][number]
type CommunityOption = StockMovementRouterOutput['communities'][number]

definePageMeta({
	layout: 'dashboard',
})

const { $trpcClient } = useNuxtApp()
const toast = usePausableToast()
const { setRef, checkOverflow, isOverflow } = useTextOverflow()

const movements = ref<StockMovement[]>([])
const allResources = ref<CommunityResourceOption[]>([])
const allStepCosts = ref<StepCostOption[]>([])
const allCommunities = ref<CommunityOption[]>([])
const loading = ref(true)
const saving = ref(false)
const searchQuery = ref('')
const selectedCommunityId = ref<number | undefined>(undefined)

const dialogVisible = ref(false)
const direction = ref<'add' | 'remove' | 'transfer'>('add')
const selectedResource = ref<CommunityResourceOption | null>(null)
const amount = ref(0)
const reason = ref('')
const selectedStepCostId = ref<number | null>(null)
const destinationCommunityId = ref<number | undefined>(undefined)
const stockCommunityId = ref<number | undefined>(undefined)

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const fetchMovements = async () => {
	loading.value = true
	try {
		const result = await $trpcClient.stockMovements.list.query({
			search: searchQuery.value || undefined,
			communityId: selectedCommunityId.value ?? undefined,
		})
		movements.value = result || []
	} catch (error: any) {
		console.error('Failed to fetch stock movements:', error)
		toast.add('Error', error.message || 'Failed to fetch stock movements')
	} finally {
		loading.value = false
	}
}

const debouncedSearch = () => {
	if (searchTimeout) clearTimeout(searchTimeout)
	searchTimeout = setTimeout(() => {
		fetchMovements()
	}, 300)
}

const fetchResources = async () => {
	try {
		allResources.value =
			(await $trpcClient.stockMovements.communityResources.query()) || []
	} catch (error: any) {
		console.error('Failed to fetch community resources:', error)
	}
}

const currentQuantity = computed(() => selectedResource.value?.quantity ?? 0)
const measurementType = computed<MeasurementType>(
	() =>
		selectedResource.value?.resource?.measurementType ?? MeasurementType.None,
)
const signedQuantity = computed(() =>
	direction.value === 'remove'
		? -Math.abs(amount.value)
		: Math.abs(amount.value),
)
const previewAfter = computed(
	() => currentQuantity.value + signedQuantity.value,
)

// Transfer-specific preview helpers
const destinationCommunityOptions = computed(() =>
	allCommunities.value.filter(
		c => c.id !== selectedResource.value?.community?.id,
	),
)
const destinationCommunityTitle = computed(
	() =>
		allCommunities.value.find(c => c.id === destinationCommunityId.value)
			?.title ?? '—',
)
// Same resource already present in the destination community, if any
const destinationResource = computed(() => {
	if (
		direction.value !== 'transfer' ||
		!selectedResource.value ||
		!destinationCommunityId.value
	)
		return null
	return (
		allResources.value.find(
			r =>
				r.resource?.id === selectedResource.value!.resource?.id &&
				r.community?.id === destinationCommunityId.value,
		) ?? null
	)
})
const destinationBefore = computed(
	() => destinationResource.value?.quantity ?? 0,
)
const destinationAfter = computed(
	() => destinationBefore.value + Math.abs(amount.value),
)
const sourceAfter = computed(
	() => currentQuantity.value - Math.abs(amount.value),
)

// Step costs tied to the selected community resource (approved proposals only)
const stepCostOptions = computed(() =>
	allStepCosts.value.filter(
		sc => sc.communityResourceId === selectedResource.value?.id,
	),
)

// Stock entries scoped to the (optional) community filter, to avoid duplicates
// when the same resource exists across multiple communities
const stockEntryOptions = computed(() =>
	stockCommunityId.value
		? allResources.value.filter(r => r.community?.id === stockCommunityId.value)
		: allResources.value,
)

const stepCostLabel = (sc: StepCostOption) =>
	`${sc.title} — ${sc.step?.proposal?.title ?? 'Proposal'}`

const openNewDialog = () => {
	direction.value = 'add'
	selectedResource.value = null
	amount.value = 0
	reason.value = ''
	selectedStepCostId.value = null
	destinationCommunityId.value = undefined
	stockCommunityId.value = undefined
	dialogVisible.value = true
}

const saveMovement = async () => {
	if (!selectedResource.value) {
		toast.add('Warning', 'A stock entry is required')
		return
	}
	if (!amount.value || amount.value <= 0) {
		toast.add('Warning', 'Amount must be greater than zero')
		return
	}

	if (direction.value === 'transfer') {
		if (!destinationCommunityId.value) {
			toast.add('Warning', 'A destination community is required')
			return
		}
		if (destinationCommunityId.value === selectedResource.value.community?.id) {
			toast.add('Warning', 'Destination community must differ from the source')
			return
		}

		saving.value = true
		try {
			const result = await $trpcClient.stockMovements.transfer.mutate({
				sourceCommunityResourceId: selectedResource.value.id,
				destinationCommunityId: destinationCommunityId.value,
				quantity: Math.abs(amount.value),
				reason: reason.value || undefined,
				stepCostId: selectedStepCostId.value,
			})
			toast.add(
				'Success',
				`Moved ${Math.abs(amount.value)} to ${destinationCommunityTitle.value}`,
			)
			dialogVisible.value = false
			fetchMovements()
			fetchResources()
			if (selectedResource.value) {
				selectedResource.value.quantity = result.sourceMovement.quantityAfter
			}
		} catch (error: any) {
			console.error('Failed to transfer stock:', error)
			toast.add('Error', error.message || 'Failed to transfer stock')
		} finally {
			saving.value = false
		}
		return
	}

	saving.value = true
	try {
		const created = await $trpcClient.stockMovements.move.mutate({
			communityResourceId: selectedResource.value.id,
			quantity: signedQuantity.value,
			reason: reason.value || undefined,
			stepCostId: selectedStepCostId.value,
		})
		toast.add(
			'Success',
			`Stock ${direction.value === 'add' ? 'added' : 'removed'} (${created.quantityAfter} remaining)`,
		)
		dialogVisible.value = false
		fetchMovements()
		// Keep the dropdown in sync with the new quantity
		if (selectedResource.value) {
			selectedResource.value.quantity = created.quantityAfter
		}
	} catch (error: any) {
		console.error('Failed to save stock movement:', error)
		toast.add('Error', error.message || 'Failed to save stock movement')
	} finally {
		saving.value = false
	}
}

onMounted(async () => {
	fetchMovements()
	fetchResources()
	try {
		allStepCosts.value =
			(await $trpcClient.stockMovements.stepCosts.query()) || []
	} catch (error: any) {
		console.error('Failed to fetch step costs:', error)
	}
	try {
		allCommunities.value =
			(await $trpcClient.stockMovements.communities.query()) || []
	} catch (error: any) {
		console.error('Failed to fetch communities:', error)
	}
})
</script>

<template>
	<DashDataTablePage>
		<template #toolbar>
			<div class="flex justify-content-between align-items-center px-6 pt-6 pb-3">
				<InputGroup class="w-auto">
					<InputGroupAddon>
						<i class="pi pi-search" />
					</InputGroupAddon>
					<InputText
						v-model="searchQuery"
						placeholder="Search by reason or resource..."
						class="!w-[17rem]"
						@input="debouncedSearch" />
					<Dropdown
						v-model="selectedCommunityId"
						:options="allCommunities"
						optionLabel="title"
						optionValue="id"
						placeholder="All communities"
						@change="fetchMovements"
						showClear
						filter
						class="!w-48" />
				</InputGroup>
				<Button
					label="New Movement"
					class="ml-2"
					icon="pi pi-arrow-up-down"
					@click="openNewDialog" />
			</div>
		</template>

	<DataTable
		class="sm-table"
		:value="movements"
		:loading="loading"
		:paginator="true"
		:rows="25"
		dataKey="id"
		:rowHover="true"
		resizableColumns
		:scrollable="true"
		scrollHeight="flex"
		stripedRows>
		<Column field="createdAt" header="Date" sortable style="width: 7rem">
			<template #body="{ data }">
				<span>{{ new Date(data.createdAt).toLocaleDateString() }}</span>
			</template>
		</Column>
		<Column
			field="resource.resource.title"
			header="Resource"
			sortable
			style="width: 20rem">
			<template #body="{ data }">
				<span
					v-tooltip.top="{
						value: data.resource?.resource?.description || '',
						disabled: !data.resource?.resource?.description,
					}"
					class="font-medium">{{
						data.resource?.resource?.title || '-'
					}}</span>
			</template>
		</Column>
		<Column
			field="resource.community.title"
			header="Community"
			sortable
			style="width: 8rem">
			<template #body="{ data }">
				<span>{{ data.resource?.community?.title || '-' }}</span>
			</template>
		</Column>
		<Column field="user.username" header="By" sortable style="width: 7rem">
			<template #body="{ data }">
				<NuxtLink :to="`/dash/users/${data.user.username}`" class="underline">
					{{ data.user.username }}
				</NuxtLink>
			</template>
		</Column>
		<Column
			field="quantity"
			header="Change"
			sortable
			bodyClass="!text-right !p-0"
			style="width: 6.1rem">
			<template #body="{ data }">
				<Tag :severity="data.quantity >= 0 ? 'success' : 'danger'"
					>{{ data.quantity > 0 ? '+' : ''
					}}<Quantity
						:modelValue="Math.abs(data.quantity)"
						:measurementType="
							data.resource?.resource?.measurementType ?? MeasurementType.None
						"
						readonly />
				</Tag>
			</template>
		</Column>
		<Column
			field="quantityBefore"
			header="Before"
			sortable
			bodyClass="!text-right"
			style="width: 5.5rem">
			<template #body="{ data }">
				<Quantity
					:modelValue="data.quantityBefore"
					:measurementType="
						data.resource?.resource?.measurementType ?? MeasurementType.None
					"
					readonly />
			</template>
		</Column>
		<Column
			field="quantityAfter"
			header="After"
			sortable
			bodyClass="!text-right"
			style="width: 5rem">
			<template #body="{ data }">
				<Quantity
					:modelValue="data.quantityAfter"
					:measurementType="
						data.resource?.resource?.measurementType ?? MeasurementType.None
					"
					readonly />
			</template>
		</Column>
		<Column
			field="stepCost.title"
			header="Step Cost"
			sortable
			style="width: 15rem">
			<template #body="{ data }">
				<span>{{ data.stepCost?.title || '-' }}</span>
			</template>
		</Column>
		<Column field="reason" header="Reason">
			<template #body="{ data }">
				<span
					:ref="el => setRef(data.id, el as HTMLElement)"
					v-tooltip.top="{
						value: data.reason,
						disabled: !isOverflow(data.id),
						showDelay: 100,
						pt: { root: { style: { maxWidth: '450px' } } },
					}"
					class="auto-ellipsis"
					@mouseenter="checkOverflow(data.id)">
					{{ data.reason || '-' }}
				</span>
			</template>
		</Column>
		<template #empty>
			<div class="flex justify-content-center align-items-center p-4">
				<span class="text-zinc-500">No stock movements found.</span>
			</div>
		</template>
	</DataTable>
	</DashDataTablePage>

	<Dialog
		v-model:visible="dialogVisible"
		header="New Stock Movement"
		:modal="true"
		dismissableMask
		:style="{ width: '600px' }"
		:breakpoints="{ '960px': '90vw', '640px': '95vw' }"
		show-effect="fadeIn"
		hide-effect="fadeOut">
		<div class="form-content gap-3">
			<div class="form-field">
				<label for="stockCommunity">Community</label>
				<Dropdown
					id="stockCommunity"
					v-model="stockCommunityId"
					:options="allCommunities"
					optionLabel="title"
					optionValue="id"
					placeholder="All communities"
					class="w-full"
					showClear
					filter
					@change="selectedResource = null" />
			</div>

			<div class="form-field">
				<label for="resource">Stock Entry *</label>
				<Dropdown
					id="resource"
					v-model="selectedResource"
					:options="stockEntryOptions"
					placeholder="Select a stock entry"
					class="w-full"
					filter>
					<template #value="{ value }">
						<span v-if="value">
							{{ value.resource?.title }}
							(stock: {{ value.quantity }})
						</span>
					</template>
					<template #option="{ option }">
						<span>
							{{ option.resource?.title }}
							(stock: {{ option.quantity }})
						</span>
					</template>
				</Dropdown>
			</div>

			<div class="flex gap-4">
				<div class="form-field flex-1">
					<label for="direction">Direction *</label>
					<SelectButton
						id="direction"
						v-model="direction"
						:options="[
							{ label: 'Add', value: 'add' },
							{ label: 'Remove', value: 'remove' },
							{ label: 'Move', value: 'transfer' },
						]"
						optionLabel="label"
						optionValue="value" />
				</div>
				<div class="form-field flex-1">
					<label for="amount">Amount *</label>
					<InputNumber
						id="amount"
						v-model="amount"
						:min="0"
						:minFractionDigits="0"
						:maxFractionDigits="2"
						showButtons />
				</div>
			</div>

			<div v-if="direction === 'transfer'" class="form-field">
				<label for="destinationCommunity">Destination Community *</label>
				<Dropdown
					id="destinationCommunity"
					v-model="destinationCommunityId"
					:options="destinationCommunityOptions"
					optionLabel="title"
					optionValue="id"
					placeholder="Select a destination community"
					class="w-full"
					showClear
					filter />
				<small class="text-zinc-500">
					Stock of the same resource will be added to (or created in) this
					community.
				</small>
			</div>

			<div
				v-if="selectedResource && direction !== 'transfer'"
				class="form-field bg-surface-100 dark:bg-surface-800 rounded-md p-3">
				<label>Resulting stock</label>
				<div class="flex align-items-center gap-2">
					<span>{{ currentQuantity }}</span>
					<i
						class="pi pi-arrow-right text-zinc-400 text-sm translate-y-[1px]" />
					<span
						:class="[
							'font-medium',
							previewAfter < 0 ? 'text-red-500' : 'text-green-600',
						]">
						{{ previewAfter }}
					</span>
				</div>
			</div>

			<div
				v-if="selectedResource && direction === 'transfer'"
				class="form-field bg-surface-100 dark:bg-surface-800 rounded-md p-3">
				<label>Resulting stock</label>
				<div class="flex flex-col gap-2">
					<div class="flex align-items-center gap-2">
						<Tag value="From" severity="warn" class="!text-xs" />
						<span class="text-zinc-500">{{
							selectedResource.community?.title
						}}</span>
						<span>{{ currentQuantity }}</span>
						<i
							class="pi pi-arrow-right text-zinc-400 text-sm translate-y-[1px]" />
						<span
							:class="[
								'font-medium',
								sourceAfter < 0 ? 'text-red-500' : 'text-green-600',
							]">
							{{ sourceAfter }}
						</span>
					</div>
					<div class="flex align-items-center gap-2">
						<Tag value="To" severity="info" class="!text-xs" />
						<span class="text-zinc-500">{{ destinationCommunityTitle }}</span>
						<span>{{ destinationBefore }}</span>
						<i
							class="pi pi-arrow-right text-zinc-400 text-sm translate-y-[1px]" />
						<span class="font-medium text-green-600">
							{{ destinationAfter }}
						</span>
					</div>
				</div>
			</div>

			<div class="form-field">
				<label for="reason">Reason</label>
				<Textarea
					id="reason"
					v-model="reason"
					placeholder="Why is this stock being moved or adjusted?"
					rows="2" />
			</div>

			<div class="form-field">
				<label for="stepCost">Linked Step Cost (optional)</label>
				<Dropdown
					id="stepCost"
					v-model="selectedStepCostId"
					:options="stepCostOptions"
					optionLabel="title"
					optionValue="id"
					:placeholder="
						selectedResource
							? stepCostOptions.length
								? 'Select an approved step cost'
								: 'No approved proposal step costs for this entry'
							: 'Select a stock entry first'
					"
					class="w-full"
					:disabled="!selectedResource || stepCostOptions.length === 0"
					showClear>
					<template #option="{ option }">
						<span>{{ stepCostLabel(option) }}</span>
					</template>
				</Dropdown>
				<small class="text-zinc-500">
					Only step costs from approved proposals can be linked.
				</small>
			</div>
		</div>
		<template #footer>
			<Button label="Cancel" text @click="dialogVisible = false" />
			<Button label="Apply Movement" @click="saveMovement" :loading="saving" />
		</template>
	</Dialog>
</template>

<style scoped>
.sm-table :deep(.p-datatable-table) {
	table-layout: fixed;
}
.auto-ellipsis {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
