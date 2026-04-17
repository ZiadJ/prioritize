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

            <Form :resolver="resolver" @submit="submit" class="flex flex-col gap-4 w-full">
                <FormField #="$field" name="username">
                    <IftaLabel>
                        <InputText id="username" type="text" class="w-full" autocomplete="name" v-bind="$field" />
                        <label for="username">User Name</label>
                    </IftaLabel>
                    <Message v-if="$field.invalid" severity="error" size="small" variant="simple">
                        {{ $field.error?.message }}
                    </Message>
                </FormField>

                <FormField #="$field" name="email">
                    <IftaLabel>
                        <InputText id="email" type="email" class="w-full" autocomplete="email" v-bind="$field" />
                        <label for="email">Email</label>
                    </IftaLabel>
                    <Message v-if="$field.invalid" severity="error" size="small" variant="simple">
                        {{ $field.error?.message }}
                    </Message>
                </FormField>

                <FormField #="$field" name="password">
                    <IftaLabel>
                        <InputText id="password" type="password" class="w-full" v-bind="$field" />
                        <label for="password">Password</label>
                    </IftaLabel>
                    <Message v-if="$field.invalid" severity="error" size="small" variant="simple">
                        {{ $field.error?.message }}
                    </Message>
                </FormField>

                <FormField #="$field" name="confirm_password">
                    <IftaLabel>
                        <InputText id="confirm_password" type="password" class="w-full" v-bind="$field" />
                        <label for="confirm_password">Confirm password</label>
                    </IftaLabel>
                    <Message v-if="$field.invalid" severity="error" size="small" variant="simple">
                        {{ $field.error?.message }}
                    </Message>
                </FormField>

                <Message v-if="serverError" severity="error">{{ serverError }}</Message>

                <Button class="w-full" type="submit" :loading="processing" :disabled="processing" label="Sign up" />
            </Form>

            <div class="flex w-full justify-between mt-4">
                <NuxtLink
                    to="/login"
                    class="underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800">
                    Already have an account?
                </NuxtLink>
            </div>
        </template>
    </Card>
</template>

<script setup lang="ts">
const { status, signUp } = useAuth();

definePageMeta({
    auth: {
        unauthenticatedOnly: true,
        navigateAuthenticatedTo: '/dash'
    }
});

const serverError = ref<string | null>(null);
const processing = ref(false);

const resolver = ({ values }: { values: Record<string, any> }) => {
    const errors: Record<string, { message: string }[]> = {};

    if (!values.username) {
        errors.username = [{ message: 'Username is required.' }];
    }

    if (!values.email) {
        errors.email = [{ message: 'Email is required.' }];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        errors.email = [{ message: 'Please enter a valid email address.' }];
    }

    if (!values.password) {
        errors.password = [{ message: 'Password is required.' }];
    }

    if (!values.confirm_password) {
        errors.confirm_password = [{ message: 'Confirm password is required.' }];
    } else if (values.password !== values.confirm_password) {
        errors.confirm_password = [{ message: 'Passwords do not match.' }];
    }

    return { values, errors };
};

const submit = async (e: { valid: boolean; values: Record<string, any> }) => {
    if (!e.valid) return;

    serverError.value = null;
    processing.value = true;

    try {
        await signUp(e.values, { callbackUrl: '/dash', redirect: true });
    } catch (thrown: any) {
        serverError.value = thrown.response?._data?.message || thrown.message || 'Registration failed';
    } finally {
        processing.value = false;
    }
};
</script>