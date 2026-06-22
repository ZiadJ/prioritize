<template>
	<div class="w-screen min-h-screen">
		<ConfirmPopup />
		<ConfirmPopup
			group="right"
			pt:root:style="transform: translateX(15px); padding: 10px"
			pt:content:style="padding: 20px" />
		<Toast />
		<!-- <div class="flex flex-col w-full h-screen">
			<HeaderTopBarDash class="h-14" />
			<div class="flex min-h-[calc(100vh-3.5rem)] h-full">
				<div class="w-[3.85rem] pr-[0.35rem] transition-all duration-300 hover:w-64 hover:delay-300 group/sidebar">
					<HeaderSideBarDash />
				</div>
				<div class="flex-1 min-w-0 transition-all duration-300 group-hover/sidebar:delay-300">
					<div
class="bg-white dark:bg-zinc-900 h-full rounded-lg shadow-md pt-3 pb-4 px-0"
						:class="{ 'animate-[pageIn_0.3s_ease-out]': isNavigating }">
						<slot />
					</div>
				</div>
			</div>
		</div> -->
		<div class="flex flex-col w-full h-screen bg-surface-ground">
			<HeaderTopBarDash class="h-14" />
			<div class="flex min-h-[calc(100vh-3.5rem)] h-full">
			<!-- class="fixed top-14 left-0 w-[4.5rem] h-[calc(100vh-3.5rem)] z-50 bg-surface-ground transition-all duration-300 hover:w-48 hover:delay-300 group/sidebar px-2" -->
			<div
				class="sidebar-container fixed top-14 left-0 h-[calc(100vh-3.5rem)] z-50 bg-surface-ground transition-all duration-300 overflow-hidden px-2 group/sidebar"
				:class="sidebarExpanded ? 'w-48' : 'w-[4.5rem]'"
				@mousemove="handleSidebarHover"
				@mouseout="handleSidebarHover"
				@mouseleave="collapseSidebar"
				@click="collapseSidebar">
				<HeaderSideBarDash />
			</div>
				<div class="flex-1 min-w-0 ml-[4.5rem]">
					<div
						class="bg-surface-ground h-full rounded-lg shadow-md pt-0 px-0"
						:class="{ 'animate-[pageIn_0.3s_ease-out]': isNavigating }">
						<slot />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { utils } from '@/methods/utils'

const route = useRoute()
const isNavigating = ref(false)

const sidebarExpanded = ref(false)

const handleSidebarHover = utils.uiElements.delayedHover(
	() => {
		sidebarExpanded.value = true
	},
	'.sidebar-container',
	300,
)

function collapseSidebar() {
	sidebarExpanded.value = false
}

watch(
	() => route.path,
	() => {
		isNavigating.value = true
		setTimeout(() => {
			isNavigating.value = false
		}, 300)
	},
)
</script>

<style>
.bg-surface-ground {
	background-color: var(--p-panel-background);
}

@keyframes pageIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}
</style>
