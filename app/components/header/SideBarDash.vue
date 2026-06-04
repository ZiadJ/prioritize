<template>
  <div class="h-full group/sidebar">
    <PanelMenu
      v-model:expanded-keys="expandedKeys"
      :model="items"
      class="w-full justify-center mx-auto">
      <template #item="{ item }">
        <NuxtLink
          :to="item?.to ?? null"
          v-ripple
          class="flex items-center px-4 py-2 cursor-pointer group">
          <span :class="[item.icon, 'text-primary group-hover:text-inherit']" />
          <span :class="['ml-2', { 'font-semibold': item.items }, 'opacity-0 w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover/sidebar:opacity-100 group-hover/sidebar:w-auto']">
            {{ item.label }}
          </span>
          <Badge v-if="item.badge" class="ml-auto" :value="item.badge" />
        </NuxtLink>
      </template>
    </PanelMenu>
  </div>
</template>

<script lang="ts" setup>
const expandedKeys = ref<Record<string, boolean>>({})
const items = ref([
  { label: 'Profile', icon: 'pi pi-home', to: '/dash/profile' },
  { label: 'Users',    icon: 'pi pi-user',  to: '/dash' },
  { label: 'Requests', icon: 'pi pi-list', to: '/dash/requests' },
])
</script>