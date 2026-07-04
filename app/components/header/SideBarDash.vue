<script lang="ts" setup>
import type { MenuItem } from 'primevue/menuitem'

const route = useRoute()
const expandedKeys = ref<Record<string, boolean>>({})

const items = ref<MenuItem[]>([
  {
    label: 'Requests',
    icon: 'pi pi-wave-pulse',
    to: '/dash/requests',
    activeFor: ['/dash/request'],
  },
  { separator: true },
  { label: 'Users', icon: 'pi pi-users', to: '/dash/users' },
  { label: 'Expertise', icon: 'pi pi-graduation-cap', to: '/dash/expertise' },
  { separator: true },
  {
    label: 'Resources',
    icon: 'pi pi-box',
    to: '/dash/resources',
  },
  {
    label: 'Community Stock',
    icon: 'pi pi-warehouse',
    to: '/dash/community-resources',
    activeFor: ['/dash/community-resources'],
  },
  { separator: true },
  {
    label: 'Stock Movements',
    icon: 'pi pi-arrow-right-arrow-left',
    to: '/dash/stock-movements',
    activeFor: ['/dash/stock-movements'],
  },
  {
    label: 'Step Costs',
    icon: 'pi pi-calculator',
    to: '/dash/step-costs',
    activeFor: ['/dash/step-costs'],
  },
])

function isActive(item: MenuItem): boolean {
  if (!item.to) return false
  const patterns = [item.to, ...(item.activeFor ?? [])]
  return patterns.some(
    (pattern) => route.path === pattern || route.path.startsWith(`${pattern}/`),
  )
}

function linkClasses(item: MenuItem) {
  return isActive(item)
    ? 'bg-primary/10 text-primary'
    : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
}

function iconClasses(item: MenuItem) {
  return isActive(item) ? 'text-primary' : 'text-primary group-hover:text-inherit'
}
</script>

<template>
  <div class="h-full group/sidebar">
    <PanelMenu
      v-model:expanded-keys="expandedKeys"
      :model="items"
      class="w-full justify-center mx-auto panelmenu-with-separator">
      <template #item="{ item }">
        <div
          v-if="item.separator"
          class="panelmenu-separator-line mx-2 my-0 h-px bg-transparent dark:bg-transparent" />

        <NuxtLink
          v-else
          :to="item.to"
          v-ripple
          class="flex items-center px-4 py-2 cursor-pointer group rounded-md transition-colors"
          :class="linkClasses(item)">
          <span :class="[item.icon, iconClasses(item)]" />
          <span
            :class="[
              'ml-2',
              { 'font-semibold': item.items },
              'opacity-0 w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover/sidebar:opacity-100 group-hover/sidebar:w-auto',
            ]">
            {{ item.label }}
          </span>
          <Badge v-if="item.badge" class="ml-auto" :value="item.badge" />
        </NuxtLink>
      </template>
    </PanelMenu>
  </div>
</template>

<style scoped>
.panelmenu-with-separator :deep(.p-panelmenu-panel:has(.panelmenu-separator-line)) {
  padding: 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.panelmenu-with-separator :deep(.p-panelmenu-header:has(.panelmenu-separator-line)) {
  cursor: default;
  pointer-events: none;
}
</style>