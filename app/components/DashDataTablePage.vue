<script lang="ts" setup>
/**
 * Full-height layout for dashboard pages whose main content is a scrollable
 * data table (PrimeVue DataTable / TreeTable) that should fill the viewport
 * height without triggering a page-level scrollbar.
 *
 * - The `toolbar` slot is rendered at a fixed natural height (flex-none).
 * - The default slot holds the table; it is given `flex: 1` + `min-height: 0`
 *   so a table with `:scrollable="true" scrollHeight="flex"` scrolls
 *   internally and the paginator/footer stay pinned.
 *
 * The layout relies on the dashboard layout providing a full-height slot
 * (its content wrapper is `h-full`), so this component is `h-full` itself.
 */
</script>

<template>
	<div class="dash-table-page">
		<div v-if="$slots.toolbar" class="dash-table-toolbar">
			<slot name="toolbar" />
		</div>
		<div class="dash-table-host">
			<slot />
		</div>
	</div>
</template>

<style scoped>
.dash-table-page {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	overflow: hidden;
}

.dash-table-toolbar {
	flex: 0 0 auto;
}

.dash-table-host {
	flex: 1 1 auto;
	min-height: 0;
	display: flex;
}

/* Give the slotted table (or its wrapping element) the full host height so
   PrimeVue's `scrollHeight="flex"` has a sized flex parent to resolve
   against. Using :slotted keeps this working for DataTable, TreeTable, etc. */
.dash-table-host :slotted(*) {
	flex: 1 1 auto;
	width: 100%;
	min-height: 0;
}
</style>
