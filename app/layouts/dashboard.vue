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
                    <div class="body-content-dash">
                        <slot />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style>
/* Default collapsed */
.sidebar-inner {
    width: 4rem;
}
.content-inner {
    width: calc(100vw - 4rem);
}

/* Hover to expand */
.sidebar-inner:hover {
    width: 16rem;
}
.sidebar-inner:hover + .content-inner {
    width: calc(100vw - 18rem);
}

/* Show labels on hover */
.sidebar-inner:hover .sidebar-label {
    opacity: 1;
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
</style>
