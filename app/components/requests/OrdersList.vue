<script lang="ts" setup>
import { UnitOfMeasure } from '~~/prisma/generated/client/enums'

interface OrderWithUser {
	id: number
	quantity: number
	unitOfMeasure?: UnitOfMeasure
	recurrencePeriod: number
	priority: number
	user: {
		id: string
		username: string
		firstname: string
		lastname: string
	}
}

const props = defineProps<{
	orders: OrderWithUser[]
	unitOfMeasure: UnitOfMeasure
}>()
</script>

<template>
	<div class="orders-list">
		<DataTable
			:value="props.orders"
			:paginator="true"
			:rows="10"
			stripedRows
			tableStyle="min-width: 1rem">
			<Column field="user.username" header="Username" style="">
				<template #body="{ data }">
					{{ data.user?.username || '-' }}
				</template>
			</Column>
			<Column
				v-if="props.unitOfMeasure !== UnitOfMeasure.None"
				field="quantity"
				header="Qty"
				style="">
				<template #body="{ data }">
					{{ data.quantity ?? '-' }}
				</template>
			</Column>
			<Column field="budget" header="Budget" style="">
				<template #body="{ data }">
					{{ data.budget ?? '-' }}
				</template>
			</Column>
			<Column field="recurrencePeriod" header="Rec. Days" style="">
				<template #body="{ data }">
					{{ data.recurrencePeriod > 0 ? data.recurrencePeriod : '-' }}
				</template>
			</Column>

			<template #empty>
				<div class="flex justify-content-center align-items-center p-4">
					<span class="text-zinc-500">No orders found.</span>
				</div>
			</template>
		</DataTable>
	</div>
</template>

<style scoped>
.orders-list {
	padding: 1rem 0;
}
</style>
