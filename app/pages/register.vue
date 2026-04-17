<template>
    <Card :pt="{
        root: 'm-auto max-w-sm w-full',
        header: 'flex items-center justify-center pt-6',
        content: 'space-y-4',
    }">
        <template #header>
            <div class="flex items-center justify-center">
                <Logo />
            </div>
        </template>
        <template #content>
            <div class="my-2">
                <p class="text-xl font-bold">Sign up</p>
            </div>

            <div class="flex flex-col gap-4 w-full">
                <IftaLabel>
                    <InputText v-model="form.username.value" id="username" type="text" required class="w-full"
                        autocomplete="name" />
                    <label for="username">User Name</label>
                </IftaLabel>
                <IftaLabel>
                    <InputText v-model="form.email.value" id="email" type="email" required class="w-full"
                        autocomplete="email" />
                    <label for="email">Email</label>
                </IftaLabel>
                <IftaLabel>
                    <InputText v-model="form.password.value" id="password" type="password" required class="w-full" />
                    <label for="password">Password</label>
                </IftaLabel>
                <IftaLabel>
                    <InputText v-model="form.confirm_password.value" id="confirm_password" type="password" required
                        class="w-full" />
                    <label for="confirm_password">Confirm password</label>
                </IftaLabel>

                <Message v-if="error" severity="error">{{ error }}</Message>
                <div class="flex items-center justify-end mt-4">
                    <Button class="w-full" :loading="form.processing" @click="submit" type="button"
                        :disabled="form.processing" label="Sign up" />
                </div>
            </div>
            <div class="flex items-center justify-end mt-4">
                <div class="flex w-full justify-between">
                    <NuxtLink to="/login"
                        class="underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800">
                        Already have an account?
                    </NuxtLink>
                </div>
            </div>
        </template>
    </Card>
</template>

<script setup lang="ts">
const {
    status,
    data,
    token,
    getSession,
    signUp,
    signIn,
    signOut,
} = useAuth()

definePageMeta({
    auth: {
        unauthenticatedOnly: true,
        navigateAuthenticatedTo: '/dash'
    }
})

const error = ref<string | null>(null)
const form = ref({
    username: {
        value: "",
        error: null,
    },
    email: {
        value: "",
        error: null,
    },
    password: {
        value: "",
        error: null,
    },
    confirm_password: {
        value: "",
        error: null,
    },
    processing: false,
})

const submit = async () => {
    if (form.value.password.value !== form.value.confirm_password.value) {
        error.value = "Password and confirm password do not match"
        return
    }
    if (!form.value.email.value) {
        error.value = "Email is required"
        return
    }
    if (!form.value.username.value) {
        error.value = "Username is required"
        return
    }
    form.value.processing = true
    error.value = null

    try {
        await signUp({
            username: form.value.username.value,
            email: form.value.email.value,
            password: form.value.password.value,
            confirm_password: form.value.confirm_password.value,
        }, { callbackUrl: '/dash', redirect: true })
    } catch (e: any) {
        error.value = e?.response?._data?.message || e.message || 'Registration failed'
    } finally {
        form.value.processing = false
    }
}
</script>