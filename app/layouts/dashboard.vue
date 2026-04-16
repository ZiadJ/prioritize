<template>
    <div class="w-screen min-h-screen">
        <ConfirmPopup></ConfirmPopup>
        <Toast />
        <div class="flex flex-col w-full h-screen">
            <HeaderTopBarDash class="h-20" />
            <div class="flex min-h-[calc(100vh-5rem)] h-full">
                <div class="w-64">
                    <HeaderSideBarDash />
                </div>
                <div class="w-[calc(100vw-18rem)]">
                    <div class="body-content-dash">
                        <slot />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts"></script>

<script lang="ts" setup>

</script>

<style>
/**
 */
 .body-content-dash{
    @apply bg-white dark:bg-zinc-900 h-full rounded-lg shadow-md p-1 px-3;
 }
</style>