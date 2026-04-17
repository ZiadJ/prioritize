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
            <div class="flex items-center justify-center">
                <p class="text-sm text-gray-600 dark:text-gray-400"> Forgot your password? No problem. Just let us
                    know your email address and we will email you a password reset link that will allow you to
                    choose a new one.
                    Email</p>
            </div>

            <IftaLabel>
                <InputText v-model="form.email.value" id="email" type="email" required autofocus class="w-full"
                    autocomplete="username" />
                <label for="username">Email</label>
            </IftaLabel>
            <div class="flex flex-col space-y-2 justify-start mt-2" v-if="form.errors.email">
                <Message v-if="form.errors.email" severity="error">{{
                    form.errors.email
                }}</Message>
            </div>

            <Message v-if="error" severity="error">{{ error }}</Message>
            <div class="flex items-center justify-end mt-4">
                <Button class="max-w-xs w-full" :loading="form.processing" @click="submit" type="button"
                    :disabled="form.processing" label="Sign up" />
            </div>
        </template>
    </Card>
</template>

<script setup lang="ts">
definePageMeta({
    auth: {
        unauthenticated: true,
    }
})
const form = ref({
    email: {
        value: "",
        error: null,
    },
    errors: {
        email: null,
    },
    processing: false,
});
const validatePassword = () => { };
const validateEmail = () => { };
const error = ref();
const submit = async () => {
    alert("Not implemented yet");
    // error.value = null
    // const dataLogin = await $login({
    //     email: form.value.email.value,
    //     password: form.value.password.value,
    //     device_name: 'web'
    // })
    // if (dataLogin.status) {
    //     navigateTo('/dash')
    // } else {
    //     error.value = dataLogin.msg
    // }
};

// onMounted(async () => {
//     const isAuth = await $isAuth();
//     if (isAuth) {
//         return navigateTo("/dash");
//     }
// })
</script>
