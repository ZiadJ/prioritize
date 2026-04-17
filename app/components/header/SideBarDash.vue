<template>
    <div class="sidebar-wrapper" :class="{ collapsed: sidebarCollapsed }" @mouseenter="sidebarCollapsed = false"
        @mouseleave="sidebarCollapsed = true">
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
const sidebarCollapsed = inject('sidebarCollapsed') as ReturnType<typeof ref<boolean>>

const expandedKeys = ref<Record<string, boolean>>({})

watch(() => sidebarCollapsed.value, (collapsed) => {
    if (collapsed) {
        expandedKeys.value = {}
    }
})

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
        icon: 'pi pi-chart-bar',
        to: '/dash/reports',
        // items: [
        //     {
        //         label: 'Sales',
        //         icon: 'pi pi-chart-line',
        //         badge: 3,
        //         shortcut: '⌘+R',
        //     },
        //     {
        //         label: 'Products',
        //         icon: 'pi pi-list',
        //         badge: 6
        //     }
        // ]
    },
    {
        label: 'Proposals',
        icon: 'pi pi-user',
        to: '/dash/profile',
        // items: [
        //     {
        //         label: 'Settings',
        //         icon: 'pi pi-cog',
        //         // shortcut: '⌘+O'
        //     },
        //     {
        //         label: 'Privacy',
        //         icon: 'pi pi-shield',
        //         // shortcut: '⌘+P'
        //     }
        // ]
    }
]));
</script>

<style scoped>
.sidebar-wrapper {
    width: 60px;
    transition: width 0.3s ease;
    overflow: hidden;
}
.sidebar-wrapper:not(.collapsed) {
    width: 240px;
}
.sidebar-wrapper :deep(.p-menuitem-link) {
    justify-content: center;
    padding: 0.5rem;
    position: relative;
}
.sidebar-wrapper:not(.collapsed) :deep(.p-menuitem-link) {
    justify-content: flex-start;
}
.sidebar-label {
    opacity: 0;
    transition: opacity 0.2s ease;
    white-space: nowrap;
    position: absolute;
    left: 2.5rem;
}
.sidebar-wrapper:not(.collapsed) .sidebar-label {
    opacity: 1;
}
</style>