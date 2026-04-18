<template>
  <div class="p-d-flex p-jc-center p-ai-center">
    <div class="">
      <DataTable size="small" :value="users" :loading="loading" tableStyle="min-width: 50rem">
        <Column field="username" header="Username"></Column>
        <Column field="email" header="Email"></Column>
        <Column field="firstname" header="First Name"></Column>
        <Column field="lastname" header="Last Name"></Column>
        <Column field="isVerified" header="Verified">
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
</template>

<script lang="ts" setup>
const loading = ref(true);
const users = ref<any[]>([]);

onMounted(async () => {
  try {
    const response = await $fetch("/api/users");
    users.value = response.users;
  } catch (error) {
    console.error("Failed to fetch users:", error);
  } finally {
    loading.value = false;
  }
});
</script>

<style></style>