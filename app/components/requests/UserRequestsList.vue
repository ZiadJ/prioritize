<script lang="ts" setup>
import { MeasurementType } from '~~/prisma/generated/client/enums'

interface UserRequestWithUser {
	id: number
	quantity: number
	measurementType?: MeasurementType
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
	userRequests: UserRequestWithUser[]
	measurementType: MeasurementType
}>()
</script>

<template>
	<div class="user-requests-list">
		<DataTable
			:value="props.userRequests"
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
				v-if="props.measurementType !== MeasurementType.None"
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
					<span class="text-zinc-500">No user requests found.</span>
				</div>
			</template>
		</DataTable>
	</div>
</template>

<style scoped>
.user-requests-list {
	padding: 1rem 0;
}
</style>
