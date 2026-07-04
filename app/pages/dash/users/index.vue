<script lang="ts" setup>
import { FilterMatchMode } from '@primevue/core/api'

definePageMeta({
	layout: 'dashboard',
})

const loading = ref(true);
const users = ref<any[]>([]);
const expertiseOptions = ref<{ id: number; title: string }[]>([]);
const selectedExpertiseFilter = ref<number | null>(null);
const searchQuery = ref('');

const filters = ref<{
	global: { value: string | null; matchMode: string };
}>({
	global: { value: null, matchMode: FilterMatchMode.CONTAINS },
});

// Keep the DataTable global filter in sync with the search box
watch(searchQuery, (value) => {
	filters.value.global.value = value || null;
});

const filteredUsers = computed(() => {
	let result = users.value;
	if (selectedExpertiseFilter.value) {
		result = result.filter((user) =>
			user.expertise?.some((exp: any) => exp.id === selectedExpertiseFilter.value),
		);
	}
	return result;
});

onMounted(async () => {
	try {
		const [usersRes, expertiseRes] = await Promise.all([
			$fetch('/api/users'),
			$fetch('/api/expertise'),
		]);
		users.value = (usersRes as any).users ?? [];
		expertiseOptions.value = (expertiseRes as any).expertise ?? [];
	} catch (error) {
		console.error('Failed to fetch data:', error);
	} finally {
		loading.value = false;
	}
});
</script>

<template>
	<FillHeightLayout>
		<template #toolbar>
			<div class="flex items-center gap-4 px-6 pt-6 pb-3">
				<InputGroup class="w-auto">
					<InputGroupAddon>
						<i class="pi pi-search" />
					</InputGroupAddon>
					<InputText
						v-model="searchQuery"
						placeholder="Search users..." />
					<Dropdown
						v-model="selectedExpertiseFilter"
						:options="expertiseOptions"
						optionLabel="title"
						optionValue="id"
						placeholder="All Expertise"
						showClear
						filter
						class="w-64"
					/>
				</InputGroup>
			</div>
		</template>

		<DataTable
			size="small"
		:value="filteredUsers"
		:loading="loading"
		:paginator="true"
		:rows="25"
		tableStyle="min-width: 50rem"
		:scrollable="true"
		scrollHeight="flex"
			v-model:filters="filters"
			:globalFilterFields="['username', 'email', 'firstname', 'lastname']"
		>
			<template #empty>
				<div class="text-center py-4 text-gray-500">No users found.</div>
			</template>
		<Column field="username" header="Username" sortable>
			<template #body="{ data }">
				<NuxtLink
					:to="`/dash/users/${data.username}`"
					class="underline">
					{{ data.username }}
				</NuxtLink>
			</template>
		</Column>
			<Column field="email" header="Email" sortable />
			<Column field="firstname" header="First Name" sortable />
			<Column field="lastname" header="Last Name" sortable />
			<Column field="expertise" header="Expertise">
				<template #body="{ data }">
					<div class="flex flex-wrap gap-1">
						<span
							v-for="exp in data.expertise"
							:key="exp.id"
							class="inline-block px-2 py-0.5 rounded-full text-xs leading-tight bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 whitespace-nowrap"
						>
							{{ exp.title }}
						</span>
						<span v-if="!data.expertise?.length" class="text-gray-400 text-xs">—</span>
					</div>
				</template>
			</Column>
			<Column field="isVerified" header="Verified" sortable>
				<template #body="{ data }">
					<Tag :value="data.isVerified ? 'Verified' : 'Pending'" :severity="data.isVerified ? 'success' : 'warn'" />
				</template>
			</Column>
			<Column field="isActive" header="Status" sortable>
				<template #body="{ data }">
					<Tag :value="data.isActive ? 'Active' : 'Inactive'" :severity="data.isActive ? 'success' : 'danger'" />
				</template>
			</Column>
		</DataTable>
	</FillHeightLayout>
</template>