<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '~~/server/trpc/routers'
import { useConfirm } from 'primevue/useconfirm'

type ExpertiseRouterOutput = inferRouterOutputs<AppRouter>['expertise']
type ExpertiseNode = ExpertiseRouterOutput['list'][number]

definePageMeta({
	layout: 'dashboard',
})

const { $trpcClient } = useNuxtApp()
const toast = usePausableToast()
const confirm = useConfirm()
const { data: session } = useAuth()

const expertiseNodes = ref<ExpertiseNode[]>([])
const loading = ref(true)
const saving = ref(false)
const searchQuery = ref('')

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'update'>('create')
const currentExpertiseId = ref<number | null>(null)

const formData = ref({
	title: '',
	description: '',
	isActive: true,
	parentId: null as number | null,
})

let searchTimeout: ReturnType<typeof setTimeout> | null = null

const fetchExpertise = async () => {
	loading.value = true
	try {
		const result = await $trpcClient.expertise.list.query({
			search: searchQuery.value || undefined,
		})
		expertiseNodes.value = result || []
	} catch (error: any) {
		console.error('Failed to fetch expertise:', error)
		toast.add('Error', error.message || 'Failed to fetch expertise')
	} finally {
		loading.value = false
	}
}

const debouncedSearch = () => {
	if (searchTimeout) clearTimeout(searchTimeout)
	searchTimeout = setTimeout(() => {
		fetchExpertise()
	}, 300)
}

const openNewDialog = () => {
	formData.value = {
		title: '',
		description: '',
		isActive: true,
		parentId: null,
	}
	dialogMode.value = 'create'
	dialogVisible.value = true
}

const editExpertise = (expertise: ExpertiseNode) => {
	formData.value = {
		title: expertise.title,
		description: expertise.description || '',
		isActive: expertise.isActive,
		parentId: expertise.parentId,
	}
	currentExpertiseId.value = expertise.id
	dialogMode.value = 'update'
	dialogVisible.value = true
}

const saveExpertise = async () => {
	if (!formData.value.title) {
		toast.add('Warning', 'Title is required')
		return
	}

	saving.value = true
	try {
		const payload = {
			title: formData.value.title,
			description: formData.value.description,
			isActive: formData.value.isActive,
			parentId: formData.value.parentId,
		}

		if (dialogMode.value === 'create') {
			await $trpcClient.expertise.create.mutate(payload)
			toast.add('Success', 'Expertise created successfully')
		} else if (dialogMode.value === 'update' && currentExpertiseId.value) {
			await $trpcClient.expertise.update.mutate({
				...payload,
				id: currentExpertiseId.value,
			})
			toast.add('Success', 'Expertise updated successfully')
		}
		dialogVisible.value = false
		fetchExpertise()
	} catch (error: any) {
		console.error('Failed to save expertise:', error)
		toast.add('Error', error.message || 'Failed to save expertise')
	} finally {
		saving.value = false
	}
}

const confirmDelete = (event: MouseEvent, expertise: ExpertiseNode) => {
	confirm.require({
		target: event.currentTarget as HTMLElement,
		message: `Do you want to delete "${expertise.title}"?`,
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
				await $trpcClient.expertise.delete.mutate({
					id: expertise.id,
				})
				toast.add('Success', 'Expertise deleted successfully')
				fetchExpertise()
			} catch (error: any) {
				console.error('Failed to delete expertise:', error)
				toast.add('Error', error.message || 'Failed to delete expertise')
			}
		},
	})
}

// Parent options for dropdown (only root-level nodes by default)
const parentOptions = ref<{ label: string; value: number }[]>([])

const fetchParentOptions = async () => {
	try {
		const result = await $trpcClient.expertise.list.query({})
		parentOptions.value = (result || []).map(e => ({
			label: e.title,
			value: e.id,
		}))
	} catch (error: any) {
		console.error('Failed to fetch parent options:', error)
	}
}

onMounted(() => {
	fetchExpertise()
	fetchParentOptions()
})
</script>

<template>
	<FillHeightLayout>
		<template #toolbar>
			<div class="flex justify-content-between align-items-center px-6 pt-6 pb-3">
				<InputGroup class="w-auto">
					<InputGroupAddon>
						<i class="pi pi-search" />
					</InputGroupAddon>
					<InputText
						v-model="searchQuery"
						placeholder="Search expertise..."
					@input="debouncedSearch" />
			</InputGroup>
			<Button
				label="New Expertise"
				class="ml-2"
				icon="pi pi-plus"
				@click="openNewDialog" />
		</div>
		</template>

	<DataTable
		:value="expertiseNodes"
		:loading="loading"
		:paginator="true"
		:rows="25"
		dataKey="id"
		:rowHover="true"
		resizableColumns
		:scrollable="true"
		scrollHeight="flex"
		stripedRows>
		<Column field="title" header="Title" sortable>
			<template #body="{ data }">
				<span class="font-medium">{{ data.title }}</span>
			</template>
		</Column>
		<Column field="parent" header="Category">
			<template #body="{ data }">
				<span>{{ data.parent?.title || '-' }}</span>
			</template>
		</Column>
		<!-- <Column header="Children">
			<template #body="{ data }">
				<span>{{ data._count?.children ?? 0 }}</span>
			</template>
		</Column> -->
		<Column header="Users">
			<template #body="{ data }">
				<span>{{ data._count?.users ?? 0 }}</span>
			</template>
		</Column>
		<!-- <Column
			field="description"
			header="Description"
			style="max-width: 300px"
			bodyStyle="overflow: hidden">
			<template #body="{ data }">
				<span
					v-tooltip.top="data.description"
					class="auto-ellipsis"
					>{{ data.description }}</span
				>
			</template>
		</Column> -->
		<Column header="Actions" :exportable="false" class="actions-column">
			<template #body="{ data }">
				<div class="action-buttons">
					<Button
						icon="pi pi-pencil"
						text
						rounded
						severity="success"
						@click="editExpertise(data)"
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
				<span class="text-zinc-500">No expertise found.</span>
			</div>
		</template>
	</DataTable>
	</FillHeightLayout>

	<Dialog
		v-model:visible="dialogVisible"
		:header="dialogMode === 'create' ? 'New Expertise' : 'Edit Expertise'"
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
					placeholder="e.g. Software Engineering"
					v-model="formData.title"
					v-bind:autofocus="dialogMode === 'create'" />
			</div>
			<div class="form-field">
				<label for="description">Description</label>
				<Textarea
					id="description"
					placeholder="A brief description of this expertise"
					v-model="formData.description"
					rows="3" />
			</div>
			<div class="form-field">
				<label for="parentId">Parent</label>
				<Dropdown
					id="parentId"
					v-model="formData.parentId"
					:options="parentOptions"
					optionLabel="label"
					optionValue="value"
					placeholder="None (root level)"
					showClear
					filter
					class="w-full" />
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
				@click="saveExpertise"
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
