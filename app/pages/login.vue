<template>
  <Card :pt="{
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

      <IftaLabel>
        <InputText v-model="form.email.value" id="email" type="email" required autofocus class="w-full"
          autocomplete="username" />
        <label for="username">Email</label>
      </IftaLabel>
      <IftaLabel>
        <InputText v-model="form.password.value" id="password" type="password" required autofocus class="w-full"
          autocomplete="username" />
        <label for="password">Password</label>
      </IftaLabel>

      <div class="block mt-4">
        <label class="flex items-center">
          <Checkbox name="remember" v-model="form.remember" :binary="true" />
          <span class="ms-2 text-sm text-gray-600 dark:text-gray-400">Remember me</span>
        </label>
      </div>
      <div class="flex flex-col space-y-2 justify-start mt-2" v-if="form.errors.email || form.errors.password">
        <Message v-if="form.errors.email" severity="error">{{
          form.errors.email
        }}</Message>
        <Message v-if="form.errors.password" severity="error">{{
          form.errors.password
        }}</Message>
      </div>

      <Message v-if="error" severity="error">{{ error }}</Message>
      <div class="flex items-center justify-end mt-4">
        <Button class="w-full" :loading="form.processing" @click="submit" type="button"
          :disabled="form.processing" label="Sign in" />
      </div>
      <div class="flex items-center justify-end mt-4">
        <div class="flex w-full justify-between">
          <NuxtLink :to="'/forgot-password'"
            class="underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800">
            Forgot your password?
          </NuxtLink>
          <NuxtLink to="/register"
            class="underline text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800">
            Create an account
          </NuxtLink>
        </div>
      </div>
      <!-- <!-- </form> -->
    </template>
  </Card>
</template>

<script setup lang="ts">

const toast = useToast()
definePageMeta({
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: '/dash'
  }
})
const { status, signIn, data, refresh, refreshToken } = useAuth();
const error = ref();
const form = ref({
  email: {
    value: "",
    error: null,
  },
  password: {
    value: "",
    error: null,
  },
  errors: {
    email: null,
    password: null,
  },
  remember: false,
  processing: false,
});
const validatePassword = () => { };
const validateEmail = () => { };
const submit = async () => {
  if (form.value.email.value === '' || form.value.password.value === '') {
    return;
  }
  // toast.removeAllGroups();
  error.value = null;
  form.value.processing = true;
  try {
    // try to sign in
    const response = await signIn(
      {
        email: form.value.email.value,
        password: form.value.password.value,
        remember: form.value.remember,
      },
      { callbackUrl: '/dash' }
    );
    form.value.processing = false;

  } catch (thrown: any) {
    error.value = thrown.response._data.message;
  }
  form.value.processing = false;

};


onBeforeMount(() => {
  if (status.value === "authenticated") {
    navigateTo("/dash");
  }
});
</script>
