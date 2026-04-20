<template>
    <div class="w-screen min-h-screen">
        <ConfirmPopup></ConfirmPopup>
        <Toast />
        <div class="flex flex-col w-full h-screen">
            <HeaderTopBarDash class="h-20" />
            <div class="flex min-h-[calc(100vh-5rem)] h-full">
                <div class="sidebar-inner transition-all duration-300">
                    <HeaderSideBarDash />
                </div>
                <div class="content-inner transition-all duration-300">
                    <div class="body-content-dash" :class="{ 'fade-enter-active': isNavigating }">
                        <slot />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
const route = useRoute()
const isNavigating = ref(false)

watch(() => route.path, () => {
  isNavigating.value = true
  setTimeout(() => {
    isNavigating.value = false
  }, 300)
})
</script>

<style>
/* Default collapsed */
.sidebar-inner {
    width: 3.5rem;
    transition: width 0.3s ease;
}
.content-inner {
    width: calc(100vw - 4rem);
    transition: width 0.3s ease;
}

/* Hover to expand with delay */
.sidebar-inner:hover {
    width: 16rem;
    transition-delay: 0.3s;
}
.sidebar-inner:hover + .content-inner {
    width: calc(100vw - 18rem);
    transition-delay: 0.3s;
}

/* Show labels on hover with delay */
.sidebar-inner:hover .sidebar-label {
    opacity: 1;
    transition-delay: 0.3s;
}

/* Center menu items when collapsed, left-align when expanded/hover */
.sidebar-inner .p-menuitem-link {
    justify-content: center;
    padding: 0.5rem;
    position: relative;
}
.sidebar-inner:hover .p-menuitem-link {
    justify-content: flex-start;
}

/* Body content styling */
.body-content-dash {
    @apply bg-white dark:bg-zinc-900 h-full rounded-lg shadow-md p-1 px-3;
}

.fade-enter-active {
    animation: pageIn 0.3s ease-out;
}

@keyframes pageIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
</style>
