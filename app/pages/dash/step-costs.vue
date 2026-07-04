<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
import Quantity from '~/components/requests/Quantity.vue'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '~~/server/trpc/routers'
import { MeasurementType } from '~~/prisma/generated/client/enums'

type StepCostRouterOutput = inferRouterOutputs<AppRouter>['stepCosts']
type StepCost = StepCostRouterOutput['list'][number]

definePageMeta({
	layout: 'dashboard',
})

const { $trpcClient } = useNuxtApp()
const toast = usePausableToast()
const route = useRoute()
const router = useRouter()
const { setRef, checkOverflow, isOverflow } = useTextOverflow()

const stepCosts = ref<StepCost[]>([])
const allCommunities = ref<{ id: number; title: string }[]>([])
const loading = ref(true)
const searchQuery = ref('')
const approvedOnly = ref(false)
const selectedCommunityId = ref<number | undefined>(undefined)

// When the page is opened via a NuxtLink such as
// `/dash/step-costs?id=42` (e.g. from Stock Movements), we filter the
// table down to that single step cost. The filter is reflected in the URL
// query so it is shareable and survives reloads.
const focusId = computed(() => {
	const raw = route.query.id
	const parsed = raw == null ? NaN : Number(raw)
	return Number.isFinite(parsed) ? parsed : undefined
})
const isFocused = computed(() => focusId.value !== undefined)

const clearFocus = () => {
	router.replace({ query: { ...route.query, id: undefined } })
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const fetchStepCosts = async () => {
	loading.value = true
	try {
		const result = await $trpcClient.stepCosts.list.query({
			search: searchQuery.value || undefined,
			id: focusId.value,
			approvedOnly: approvedOnly.value || undefined,
			communityId: selectedCommunityId.value ?? undefined,
		})
		stepCosts.value = result || []
	} catch (error: any) {
		console.error('Failed to fetch step costs:', error)
		toast.add('Error', error.message || 'Failed to fetch step costs')
	} finally {
		loading.value = false
	}
}

const debouncedSearch = () => {
	if (searchTimeout) clearTimeout(searchTimeout)
	searchTimeout = setTimeout(() => {
		fetchStepCosts()
	}, 300)
}

// Re-fetch whenever the focused id in the URL changes
watch(focusId, () => {
	if (!loading.value) fetchStepCosts()
})

onMounted(async () => {
	fetchStepCosts()
	try {
		allCommunities.value =
			(await $trpcClient.stepCosts.communities.query()) || []
	} catch (error: any) {
		console.error('Failed to fetch communities:', error)
	}
})
</script>

<template>
	<FillHeightLayout>
		<template #toolbar>
			<div
				class="flex justify-content-between align-items-center px-6 pt-6 pb-3">
				<InputGroup class="w-auto">
					<InputGroupAddon>
						<i class="pi pi-search" />
					</InputGroupAddon>
					<InputText
						v-model="searchQuery"
						:disabled="isFocused"
						placeholder="Search by title, description or resource..."
						class="!w-[20rem]"
						@input="debouncedSearch" />
					<InputGroupAddon
						v-if="isFocused"
						v-tooltip.top="
							'Showing a single step cost linked from another page'
						"
						class="cursor-help">
						<i class="pi pi-filter" />
					</InputGroupAddon>
					<Dropdown
						v-model="selectedCommunityId"
						:options="allCommunities"
						optionLabel="title"
						optionValue="id"
						placeholder="All communities"
						showClear
						filter
						class="!w-48"
						@change="fetchStepCosts" />
					<InputGroupAddon class="px-3 gap-2 cursor-default">
						<Checkbox
							inputId="approvedOnly"
							v-model="approvedOnly"
							:binary="true"
							@change="fetchStepCosts" />
						<label
							for="approvedOnly"
							class="cursor-pointer whitespace-nowrap select-none"
							>Approved</label
						>
					</InputGroupAddon>
				</InputGroup>
				<Button
					v-if="isFocused"
					label="Show all"
					class="ml-2"
					icon="pi pi-times"
					text
					@click="clearFocus" />
			</div>
		</template>

		<DataTable
			class="sc-table"
			:value="stepCosts"
			:loading="loading"
			:paginator="true"
			:rows="25"
			dataKey="id"
			:rowHover="true"
			resizableColumns
			:scrollable="true"
			scrollHeight="flex"
			stripedRows>
			<Column field="title" header="Title" sortable style="width: 18rem">
				<template #body="{ data }">
					<span class="font-medium">{{ data.title }}</span>
				</template>
			</Column>
			<Column
				field="step.proposal.title"
				header="Proposal"
				sortable
				style="width: 14rem">
				<template #body="{ data }">
					<NuxtLink
						v-if="data.step?.proposal?.requestId"
						:to="`/dash/requests/${data.step.proposal.requestId}`"
						class="underline">
						{{ data.step.proposal.title }}
					</NuxtLink>
					<span v-else>{{ data.step?.proposal?.title || '-' }}</span>
				</template>
			</Column>
			<Column field="step.title" header="Step" sortable style="width: 12rem">
				<template #body="{ data }">
					<span>{{ data.step?.title || '-' }}</span>
				</template>
			</Column>
			<Column
				field="communityResource.resource.title"
				header="Resource"
				sortable
				style="width: 14rem">
				<template #body="{ data }">
					<span class="font-medium">{{
						data.communityResource?.resource?.title || '-'
					}}</span>
				</template>
			</Column>
			<Column
				field="communityResource.community.title"
				header="Community"
				sortable
				style="width: 8rem">
				<template #body="{ data }">
					<span>{{ data.communityResource?.community?.title || '-' }}</span>
				</template>
			</Column>
			<Column
				field="quantity"
				header="Quantity"
				sortable
				bodyClass="!text-right"
				style="width: 7rem">
				<template #body="{ data }">
					<Quantity
						:modelValue="data.quantity"
						:measurementType="
							data.communityResource?.resource?.measurementType ??
							MeasurementType.None
						"
						readonly />
				</template>
			</Column>
			<Column
				field="monetaryValue"
				header="Value"
				sortable
				bodyClass="!text-right"
				style="width: 6rem">
				<template #body="{ data }">
					<span>{{ formatCurrency(data.monetaryValue) }}</span>
				</template>
			</Column>
			<Column field="consumedAt" header="Consumed" sortable style="width: 7rem">
				<template #body="{ data }">
					<span>{{ new Date(data.consumedAt).toLocaleDateString() }}</span>
				</template>
			</Column>
			<Column field="description" header="Description">
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
						@mouseenter="checkOverflow(data.id)">
						{{ data.description || '-' }}
					</span>
				</template>
			</Column>
			<template #empty>
				<div class="flex justify-content-center align-items-center p-4">
					<span class="text-zinc-500">No step costs found.</span>
				</div>
			</template>
		</DataTable>
	</FillHeightLayout>
</template>

<style scoped>
.sc-table :deep(.p-datatable-table) {
	table-layout: fixed;
}
.auto-ellipsis {
	display: block;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
