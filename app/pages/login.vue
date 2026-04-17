<template>
	<Card
		:pt="{
			root: 'm-auto max-w-sm w-full',
			header: 'flex items-center justify-center pt-6',
			content: 'space-y-4',
		}">
		<template #header>
			<div class="flex items-center justify-center">
				<Logo :heightLogo="62" :withLogo="62" />
			</div>
		</template>
		<template #content>
			<div class="my-2">
				<p class="text-xl font-bold">Sign in</p>
			</div>

			<Form :resolver="resolver" @submit="submit" class="flex flex-col gap-4 w-full">
				<FormField v-slot="$field" name="email">
					<IftaLabel>
						<InputText id="email" type="email" autofocus autocomplete="username" class="w-full" v-bind="$field" />
						<label for="email">Email</label>
					</IftaLabel>
					<Message v-if="$field.invalid" severity="error" size="small" variant="simple">
						{{ $field.error?.message }}
					</Message>
				</FormField>

				<FormField v-slot="$field" name="password">
					<IftaLabel>
						<InputText id="password" type="password" autocomplete="current-password" class="w-full" v-bind="$field" />
						<label for="password">Password</label>
					</IftaLabel>
					<Message v-if="$field.invalid" severity="error" size="small" variant="simple">
						{{ $field.error?.message }}
					</Message>
				</FormField>

				<FormField v-slot="$field" name="remember">
					<label class="flex items-center gap-2 cursor-pointer">
						<Checkbox v-bind="$field" :binary="true" />
						<span class="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
					</label>
				</FormField>

				<Message v-if="serverError" severity="error">{{ serverError }}</Message>

				<Button class="w-full mt-2" type="submit" :loading="processing" :disabled="processing" label="Sign in" />
			</Form>

			<div class="flex w-full justify-between mt-4">
				<NuxtLink
					to="/forgot-password"
					class="underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800">
					Forgot your password?
				</NuxtLink>
				<NuxtLink
					to="/register"
					class="underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800">
					Create an account
				</NuxtLink>
			</div>
		</template>
	</Card>
</template>

<script setup lang="ts">
definePageMeta({
	auth: {
		unauthenticatedOnly: true,
		navigateAuthenticatedTo: '/dash',
	},
});

const { status, signIn } = useAuth();

const serverError = ref<string | null>(null);
const processing = ref(false);

const resolver = ({ values }: { values: Record<string, any> }) => {
	const errors: Record<string, { message: string }[]> = {};

	if (!values.email) {
		errors.email = [{ message: 'Email is required.' }];
	} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
		errors.email = [{ message: 'Please enter a valid email address.' }];
	}

	if (!values.password) {
		errors.password = [{ message: 'Password is required.' }];
	}

	return { values, errors };
};

	const submit = async (e: { valid: boolean; values: Record<string, any> }) => {
		if (!e.valid) return;

		serverError.value = null;
		processing.value = true;

		e.values.remember = e.values.remember ?? false;

		try {
			await signIn(e.values, { callbackUrl: '/dash' });
		} catch (thrown: any) {
			serverError.value = thrown.response?._data?.message || thrown.message || 'Sign in failed';
		} finally {
			processing.value = false;
		}
	};

onBeforeMount(() => {
	if (status.value === 'authenticated') navigateTo('/dash');
});
</script>
