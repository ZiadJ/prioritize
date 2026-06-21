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
				class="flex items-center px-4 py-2 cursor-pointer group rounded-md transition-colors"
				:class="isActive(item) ? 'bg-primary/10 text-primary' : 'text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'">
				<span
					:class="[
						item.icon,
						isActive(item) ? 'text-primary' : 'text-primary group-hover:text-inherit',
					]" />
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

<script lang="ts" setup>
type MenuItem = {
	label: string
	icon: string
	to?: string | null
	activeFor?: string[]
}

const route = useRoute()
const expandedKeys = ref<Record<string, boolean>>({})
const items = ref<MenuItem[]>([
	// { label: 'Profile', icon: 'pi pi-user', to: '/dash/profile' },
	{ label: 'Users', icon: 'pi pi-users', to: '/dash/users' },
	{
		label: 'Requests',
		icon: 'pi pi-wave-pulse',
		to: '/dash/requests',
		activeFor: ['/dash/request'],
	},
	{ label: 'Expertise', icon: 'pi pi-graduation-cap', to: '/dash/expertise' },
])

function isActive(item: MenuItem): boolean {
	if (!item.to) return false
	if (route.path === item.to) return true
	return (item.activeFor ?? []).some(
		(pattern) => route.path === pattern || route.path.startsWith(`${pattern}/`),
	)
}
</script>
