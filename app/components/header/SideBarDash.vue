<template>
    <PanelMenu v-model:expanded-keys="expandedKeys" @update:expanded-keys="expandedKeys = $event" :model="itemsWithIds"
        class="w-full md:w-60 justify-center mx-auto">
        <template #item="{ item }">
            <NuxtLink :to="item?.to ? item.to : null" v-ripple class="flex items-center px-4 py-2 cursor-pointer group">
                <span :class="[item.icon, 'text-primary group-hover:text-inherit']" />
                <span :class="['ml-2', { 'font-semibold': item.items }]">{{ item.label }}</span>
                <Badge v-if="item.badge" class="ml-auto" :value="item.badge" />
                <span v-if="item.shortcut"
                    class="ml-auto border border-surface rounded bg-emphasis text-muted-color text-xs p-1">{{
                        item.shortcut }}</span>
            </NuxtLink>
        </template>
    </PanelMenu>
</template>

<script lang="ts" setup>
const expandedKeys = ref({
    // 'home_0': true
});

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
        badge: 5,
        // items: [
        //     {
        //         label: 'Compose',
        //         icon: 'pi pi-file-edit',
        //         // shortcut: '⌘+N'
        //     },
        //     {
        //         label: 'Inbox',
        //         icon: 'pi pi-inbox',
        //         badge: 5
        //     },
        //     {
        //         label: 'Sent',
        //         icon: 'pi pi-send',
        //         // shortcut: '⌘+S'
        //     },
        //     {
        //         label: 'Trash',
        //         icon: 'pi pi-trash',
        //         // shortcut: '⌘+T'
        //     }
        // ]
    },
    {
        label: 'Reports',
        icon: 'pi pi-chart-bar',
        to: '/dash/reports',
        // shortcut: '⌘+R',
        items: [
            {
                label: 'Sales',
                icon: 'pi pi-chart-line',
                badge: 3
            },
            {
                label: 'Products',
                icon: 'pi pi-list',
                badge: 6
            }
        ]
    },
    {
        label: 'Profile',
        icon: 'pi pi-user',
        to: '/dash/profile',
        // shortcut: '⌘+W',
        items: [
            {
                label: 'Settings',
                icon: 'pi pi-cog',
                // shortcut: '⌘+O'
            },
            {
                label: 'Privacy',
                icon: 'pi pi-shield',
                // shortcut: '⌘+P'
            }
        ]
    }
]));
</script>

<style></style>