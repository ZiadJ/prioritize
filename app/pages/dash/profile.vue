<template>
	<div class="p-6 max-w-3xl mx-auto">
		<Toast />
		<h1 class="text-2xl font-bold mb-6">Profile</h1>

		<div v-if="pageLoading" class="flex justify-center py-12">
			<ProgressSpinner style="width: 40px; height: 40px" />
		</div>

		<form v-else class="form-content gap-4" @submit.prevent="save">
			<div class="grid grid-cols-2 gap-4">
				<div class="form-field">
					<label for="firstname">First Name</label>
					<InputText id="firstname" v-model="form.firstname" />
				</div>
				<div class="form-field">
					<label for="lastname">Last Name</label>
					<InputText id="lastname" v-model="form.lastname" />
				</div>
			</div>

			<div class="form-field">
				<label for="username">Username</label>
				<InputText id="username" v-model="form.username" />
			</div>

			<div class="form-field">
				<label for="email">Email</label>
				<InputText id="email" v-model="form.email" type="email" />
			</div>

			<div class="form-field">
				<label for="bio">Bio</label>
				<Textarea id="bio" v-model="form.bio" rows="3" autoResize />
			</div>

			<!-- <div class="form-field">
				<label for="picture">Picture URL</label>
				<InputText
					id="picture"
					v-model="form.picture"
					placeholder="https://..." />
			</div> -->

			<div class="grid grid-cols-2 gap-4">
				<div class="form-field">
					<label for="dateOfBirth">Date of Birth</label>
					<DatePicker
						id="dateOfBirth"
						v-model="form.dateOfBirth"
						showIcon
						dateFormat="yy-mm-dd" />
				</div>
				<div class="form-field">
					<label for="role">Role</label>
					<InputText id="role" v-model="form.role" />
				</div>
			</div>

			<div class="form-field">
				<label for="country">Country</label>
				<Dropdown
					id="country"
					v-model="form.countryId"
					:options="countries"
					optionLabel="name"
					optionValue="id"
					placeholder="Select country"
					showClear
					filter
					class="w-full" />
			</div>

			<div class="form-field">
				<label>Expertise</label>
				<MultiSelect
					v-model="form.expertiseIds"
					:options="expertiseOptions"
					optionLabel="title"
					optionValue="id"
					filter
					placeholder="Select expertise"
					:maxSelectedLabels="5"
					class="w-full" />
			</div>

		<div class="flex justify-end mt-4">
			<Button
				type="submit"
				label="Save Profile"
				:loading="saving"
				icon="pi pi-check" />
		</div>
		</form>

		<section v-if="!pageLoading" class="mt-8">
			<h2 class="text-lg font-semibold mb-2">My Requests</h2>
			<UserRequestsTable :entries="requests" :loading="loadingRequests" />
		</section>
	</div>
</template>

<script lang="ts" setup>
import UserRequestsTable from '~/components/requests/UserRequestsTable.vue'

definePageMeta({
	layout: 'dashboard',
})

const { data: session } = useAuth()
const toast = usePausableToast()
const { $trpcClient } = useNuxtApp()

const pageLoading = ref(true)
const saving = ref(false)
const requests = ref<any[]>([])
const loadingRequests = ref(false)
const expertiseOptions = ref<{ id: number; title: string }[]>([])
const countries = ref<{ id: number; name: string }[]>([])

const form = reactive({
	firstname: '',
	lastname: '',
	username: '',
	email: '',
	bio: '',
	picture: '' as string | null,
	dateOfBirth: null as Date | null,
	role: '',
	countryId: null as number | null,
	expertiseIds: [] as number[],
})

onMounted(async () => {
	try {
		const [profileRes, expertiseRes] = await Promise.all([
			$fetch('/api/profile'),
			$fetch('/api/expertise'),
		])

		const user = (profileRes as any).user
		form.firstname = user.firstname ?? ''
		form.lastname = user.lastname ?? ''
		form.username = user.username ?? ''
		form.email = user.email ?? ''
		form.bio = user.bio ?? ''
		form.picture = user.picture ?? null
		form.dateOfBirth = user.dateOfBirth ? new Date(user.dateOfBirth) : null
		form.role = user.role ?? ''
		form.countryId = user.countryId ?? null
		form.expertiseIds = (user.expertise ?? []).map((e: any) => e.id)

		expertiseOptions.value = (expertiseRes as any).expertise ?? []

		const countriesRes = await $fetch('/api/countries').catch(() => ({
			countries: [],
		}))
		countries.value = (countriesRes as any).countries ?? []

		await fetchRequests()
	} catch (error: any) {
		toast.add('Error', 'Failed to load profile.')
	} finally {
		pageLoading.value = false
	}
})

const fetchRequests = async () => {
	const userId = session.value?.user?.id
	if (!userId) return
	loadingRequests.value = true
	try {
		const result = await $trpcClient?.requests.listByUser?.query({ userId })
		requests.value = result ?? []
	} catch (error: any) {
		console.error('Failed to fetch requests:', error)
	} finally {
		loadingRequests.value = false
	}
}

const save = async () => {
	saving.value = true
	try {
		const payload: any = {
			firstname: form.firstname,
			lastname: form.lastname,
			username: form.username,
			email: form.email,
			bio: form.bio,
			picture: form.picture,
			dateOfBirth: form.dateOfBirth
				? form.dateOfBirth.toISOString().split('T')[0]
				: null,
			role: form.role,
			countryId: form.countryId,
			expertiseIds: form.expertiseIds,
		}

		await $fetch('/api/profile', {
			method: 'PUT',
			body: payload,
		})

		toast.add('Saved', 'Profile updated successfully.')
	} catch (error: any) {
		toast.add('Error', error.data?.message || 'Failed to save profile.')
	} finally {
		saving.value = false
	}
}
</script>
