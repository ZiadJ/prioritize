<script lang="ts" setup>
import { UnitOfMeasure } from '~~/prisma/generated/client/enums'

interface OrderUser {
	id: string
	username: string
	firstname: string
	lastname: string
}

interface OrderWithUser {
	id: number
	quantity: number
	unitOfMeasure: UnitOfMeasure
	recurrencePeriod: number
	user: OrderUser
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
			:rows="5"
			stripedRows
			tableStyle="min-width: 50rem">
			<Column field="user.username" header="Username">
				<template #body="{ data }">
					{{ data.user?.username || '-' }}
				</template>
			</Column>
			<Column v-if="props.unitOfMeasure !== UnitOfMeasure.None" field="quantity" header="Quantity">
				<template #body="{ data }">
					{{ data.quantity ?? '-' }}
				</template>
			</Column>
			<Column field="recurrencePeriod" header="Recurrence (days)">
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
