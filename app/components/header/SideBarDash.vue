<template>
    <div class="sidebar-wrapper">
        <PanelMenu v-model:expanded-keys="expandedKeys" @update:expanded-keys="expandedKeys = $event" :model="itemsWithIds"
            class="w-full justify-center mx-auto">
            <template #item="{ item }">
                <NuxtLink :to="item?.to ? item.to : null" v-ripple class="flex items-center px-4 py-2 cursor-pointer group">
                    <span :class="[item.icon, 'text-primary group-hover:text-inherit']" />
                    <span :class="['sidebar-label', 'ml-2', { 'font-semibold': item.items }]">{{ item.label }}</span>
                    <Badge v-if="item.badge" class="ml-auto" :value="item.badge" />
                </NuxtLink>
            </template>
        </PanelMenu>
    </div>
</template>

<script lang="ts" setup>
const expandedKeys = ref<Record<string, boolean>>({})

// Helper function to slugify labels
const slugify = (label: string) => {
    return label.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
};

// Recursively add IDs to each item
const addIdsToItems = (items: any[], prefix = ''): any[] => {
    return items.map((item, index) => {
        const currentId = `${prefix}_${index}`;
        return {
            ...item,
            key: slugify(item.label) + currentId,
            items: item.items ? addIdsToItems(item.items, currentId) : undefined,
        };
    });
};

const itemsWithIds = ref(addIdsToItems([
    {
        label: 'Home',
        icon: 'pi pi-home',
        to: '/dash',
    },
    {
        label: 'Requests',
        icon: 'pi pi-list',
        to: '/dash/requests',
    },
    {
        label: 'Reports',
        icon: 'pi pi-chart-bar',
        to: '/dash/reports',
    },
    {
        label: 'Profile',
        icon: 'pi pi-user',
        to: '/dash/profile',
    }
]));
</script>

<style scoped>
.sidebar-wrapper {
    width: 100%;
    height: 100%;
    overflow: hidden;
}
.sidebar-label {
    opacity: 0;
    transition: opacity 0.2s ease;
    white-space: nowrap;
    position: absolute;
    left: 2.5rem;
}
</style>
