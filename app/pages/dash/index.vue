<template>
  <div class="p-d-flex p-jc-center p-ai-center">
    <div class="">
      <DataTable size="small" :value="users" :loading="loading" tableStyle="min-width: 50rem">
        <Column field="username" header="Username"></Column>
        <Column field="email" header="Email"></Column>
        <Column field="firstname" header="First Name"></Column>
        <Column field="lastname" header="Last Name"></Column>
        <Column field="isVerified" header="Verified"/>
        <Column field="lastTime" header="Verified">
          <template #body="{ data }">
            <Tag :value="data.isVerified ? 'Verified' : 'Pending'" :severity="data.isVerified ? 'success' : 'warn'" />
          </template>
        </Column>
        <Column field="isActive" header="Status">
          <template #body="{ data }">
            <Tag :value="data.isActive ? 'Active' : 'Inactive'" :severity="data.isActive ? 'success' : 'danger'" />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
    test: <p>{{ greeting }}</p>
    <div class="p-mt-4">
      <NuxtLink to="/dash/request/1/test" class="p-button p-button-primary">Test Page (ID=1)</NuxtLink>
      <NuxtLink to="/dash/proposals/2" class="p-button p-button-secondary p-ml-2">Proposals (ID=2)</NuxtLink>
    </div>
</template>

<script lang="ts" setup>
const { $trpcClient } = useNuxtApp();
const greeting = ref("");
const loading = ref(true);
const users = ref<any[]>([]);

onMounted(async () => {
  greeting.value = (await $trpcClient.greet.query({ name: "smith", greeting: "hello1" })).greeting;

  try {
    users.value = (await $fetch("/api/users")).users;
  } catch (error) {
    console.error("Failed to fetch users:", error);
  } finally {
    loading.value = false;
  }
});
</script>

<style></style>