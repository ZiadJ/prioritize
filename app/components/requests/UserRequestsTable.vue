<script lang="ts" setup>
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '~~/server/trpc/routers'

type RequestRouterOutput = inferRouterOutputs<AppRouter>['requests']
type UserRequestEntry = RequestRouterOutput['listByUser'][number]

defineProps<{
	entries: UserRequestEntry[]
	loading?: boolean
}>()
</script>

<template>
	<div>
		<DataTable
			:value="entries"
			:loading="loading"
			:paginator="entries.length > 10"
			:rows="10"
			dataKey="request.id"
			:rowHover="true"
			stripedRows
			tableStyle="min-width: 30rem">
			<Column field="request.title" header="Title" sortable>
				<template #body="{ data }">
					<NuxtLink :to="`/dash/requests/${data.request.id}`" class="underline">
						{{ data.request.title }}
					</NuxtLink>
				</template>
			</Column>
			<!-- <Column field="role" header="Role" sortable style="width: 8rem">
				<template #body="{ data }">
					<Tag
						:value="data.role"
						:severity="
							data.role === 'Owner'
								? 'success'
								: data.role === 'Editor'
									? 'info'
									: 'warn'
						" />
				</template>
			</Column> -->
			<Column field="priority" header="My Priority" sortable style="width: 8rem">
				<template #body="{ data }">
					<span>{{ data.priority > 0 ? data.priority : '—' }}</span>
				</template>
			</Column>
			<Column
				field="request.totalPriority"
				header="Total Priority"
				sortable
				style="width: 8rem">
				<template #body="{ data }">
					<span>{{ data.request.totalPriority }}</span>
				</template>
			</Column>
			<!-- <Column
				field="request.community.title"
				header="Community"
				sortable
				style="width: 10rem">
				<template #body="{ data }">
					<span class="auto-ellipsis">{{
						data.request.community?.title || '—'
					}}</span>
				</template>
			</Column> -->
			<Column field="request.createdAt" header="Created" sortable style="width: 9rem">
				<template #body="{ data }">
					<span>{{
						new Date(data.request.createdAt).toLocaleDateString()
					}}</span>
				</template>
			</Column>
			<template #empty>
				<div class="flex justify-content-center align-items-center p-4">
					<span class="text-zinc-500">No requests found.</span>
				</div>
			</template>
		</DataTable>
	</div>
</template>
