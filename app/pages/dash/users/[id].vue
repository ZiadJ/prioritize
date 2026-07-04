<template>
	<div class="p-6 max-w-3xl mx-auto">
		<Toast />
		<Button
			icon="pi pi-arrow-left"
			label="Back"
			text
			class="mb-4 p-0"
			@click="$router.back()" />

		<div v-if="loading" class="flex justify-center py-12">
			<ProgressSpinner style="width: 40px; height: 40px" />
		</div>

		<div v-else-if="user" class="flex flex-col gap-6">
			<div class="flex items-center gap-4">				<div
					class="w-16 h-16 rounded-full bg-primary-500 text-white flex items-center justify-center text-2xl font-bold uppercase">
					{{ (user.firstname || user.username || '?').charAt(0) }}
				</div>
				<div>
					<h1 class="text-2xl font-bold">
						{{ user.firstname }} {{ user.lastname }}
					</h1>
					<p class="text-sm text-gray-500">@{{ user.username }}</p>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="field">
					<span class="block text-sm text-gray-500">Email</span>
					<span class="font-medium">{{ user.email }}</span>
				</div>
				<div class="field">
					<span class="block text-sm text-gray-500">Role</span>
					<span class="font-medium">{{ user.role || '—' }}</span>
				</div>
			</div>

			<div class="field">
				<span class="block text-sm text-gray-500">Bio</span>
				<p v-if="user.bio" class="font-medium whitespace-pre-wrap">{{ user.bio }}</p>
				<span v-else class="text-gray-400">—</span>
			</div>

			<div class="field">
				<span class="block text-sm text-gray-500 mb-1">Expertise</span>
				<div class="flex flex-wrap gap-1">
					<span
						v-for="exp in user.expertise"
						:key="exp.id"
						class="inline-block px-2 py-0.5 rounded-full text-xs leading-tight bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 whitespace-nowrap">
						{{ exp.title }}
					</span>
					<span
						v-if="!user.expertise?.length"
						class="text-gray-400 text-xs">—</span>
				</div>
			</div>

			<div class="grid grid-cols-3 gap-4">
				<div class="field">
					<span class="block text-sm text-gray-500">Country</span>
					<span class="font-medium">
						{{ user.country?.name || '—' }}
					</span>
				</div>
				<div class="field">
					<span class="block text-sm text-gray-500">Community</span>
					<span class="font-medium">
						{{ user.community?.title || '—' }}
					</span>
				</div>
			</div>

			<div class="grid grid-cols-3 gap-4">
				<div class="field">
					<span class="block text-sm text-gray-500">Verified</span>
					<Tag
						:value="user.isVerified ? 'Verified' : 'Pending'"
						:severity="user.isVerified ? 'success' : 'warn'" />
				</div>
				<div class="field">
					<span class="block text-sm text-gray-500">Status</span>
					<Tag
						:value="user.isActive ? 'Active' : 'Inactive'"
						:severity="user.isActive ? 'success' : 'danger'" />
				</div>
				<div class="field">
					<span class="block text-sm text-gray-500">Member since</span>
					<span class="font-medium text-sm">
						{{ formatDate(user.createdAt) }}
					</span>
				</div>
			</div>

			<div class="field">
				<h2 class="text-lg font-semibold mb-2">Requests</h2>
				<UserRequestsTable :entries="requests" :loading="loadingRequests" />
			</div>
		</div>

		<div v-else class="text-center py-12 text-gray-500">
			User not found.
		</div>
	</div>
</template>

<script lang="ts" setup>
import UserRequestsTable from '~/components/requests/UserRequestsTable.vue'

definePageMeta({
	layout: 'dashboard',
})

const route = useRoute()
const toast = usePausableToast()
const { $trpcClient } = useNuxtApp()

const loading = ref(true)
const user = ref<any>(null)
const requests = ref<any[]>([])
const loadingRequests = ref(false)

function formatDate(value: string | Date) {
	if (!value) return '—'
	return new Date(value).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})
}

onMounted(async () => {
	try {
		const res = await $fetch(`/api/users/${route.params.id}`)
		user.value = (res as any).user ?? null
		await fetchRequests()
	} catch (error: any) {
		toast.add('Error', error.statusMessage || 'Failed to load user.')
	} finally {
		loading.value = false
	}
})

const fetchRequests = async () => {
	if (!user.value?.id) return
	loadingRequests.value = true
	try {
		const result = await $trpcClient?.requests.listByUser?.query({
			userId: user.value.id,
		})
		requests.value = result ?? []
	} catch (error: any) {
		console.error('Failed to fetch user requests:', error)
	} finally {
		loadingRequests.value = false
	}
}
</script>