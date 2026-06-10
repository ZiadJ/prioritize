<template>
	<div class="p-4">
		<div class="flex items-center gap-4 mb-4">
			<h1 class="text-xl font-bold">Users</h1>
			<div class="flex items-center gap-2">
				<label class="text-sm font-semibold">Filter by Expertise:</label>
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
			</div>
		</div>

		<DataTable
			size="small"
			:value="filteredUsers"
			:loading="loading"
			tableStyle="min-width: 50rem"
			:globalFilterFields="['username', 'email', 'firstname', 'lastname']"
		>
			<template #empty>
				<div class="text-center py-4 text-gray-500">No users found.</div>
			</template>
			<Column field="username" header="Username" sortable />
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
	</div>
</template>

<script lang="ts" setup>
const loading = ref(true);
const users = ref<any[]>([]);
const expertiseOptions = ref<{ id: number; title: string }[]>([]);
const selectedExpertiseFilter = ref<number | null>(null);

const filteredUsers = computed(() => {
	if (!selectedExpertiseFilter.value) return users.value;
	return users.value.filter((user) =>
		user.expertise?.some((exp: any) => exp.id === selectedExpertiseFilter.value),
	);
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
