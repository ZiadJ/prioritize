<script setup lang="ts">
import { computed, ref } from 'vue'
import Popup from '../Popup.vue'

const toast = usePausableToast()
const { data: session } = useAuth()

interface Feedback {
	userId: string
	proposalId: number | null
	requestNodeId: number | null
	rating: number
	comment?: string
}

const {
	max = 3,
	userId,
	proposalId,
	requestNodeId,
	requestId,
	parentSelector,
	expertiseNodeId,
} = defineProps<{
	max: number
	proposalId: number | null
	requestNodeId: number | null
	requestId: number
	userId: string
	parentSelector?: string
	expertiseNodeId?: number
}>()

const modelValue = defineModel<Feedback[]>({ default: [] })

const emit = defineEmits<{
	(e: 'change', value: number): void
}>()

const op = useTemplateRef('op')
const commentTextareaRef = ref<any>(null)
const { $trpcClient } = useNuxtApp()

function onCommentOpen() {
	nextTick(() => {
		commentTextareaRef.value?.$el?.focus()
	})
}

const hasExpertise = computed(
	() =>
		!expertiseNodeId ||
		session.value?.user?.expertiseIds?.includes(expertiseNodeId),
)

const range = computed(() => {
	const steps = []
	for (let i = -max; i <= max; i++) steps.push(i)
	return steps
})

const userRating = computed(
	() =>
		modelValue.value?.find(
			f =>
				f.proposalId === proposalId &&
				f.requestNodeId === requestNodeId &&
				f.userId === userId,
		)?.rating,
)

const averageRating = computed(() => {
	const proposalFeedbacks = modelValue.value.filter(
		f => f.proposalId === proposalId,
	)
	return (
		proposalFeedbacks.reduce((sum, curr) => sum + curr.rating, 0) /
		proposalFeedbacks.length
	)
})

const nodeFeedback = computed(() =>
	modelValue.value.filter(
		f => f.proposalId === proposalId && f.requestNodeId === requestNodeId,
	),
)

const voteCount = computed(() => nodeFeedback.value.length)

const upvoteCount = computed(
	() => nodeFeedback.value.filter(f => f.rating > 0).length,
)

const downvoteCount = computed(
	() => nodeFeedback.value.filter(f => f.rating < 0).length,
)

const expanded = ref(false)
const namesLoading = ref(false)
const nameMap = ref<Record<string, { firstname: string; lastname: string }>>(
	{},
)
const commentMap = ref<Record<string, string>>({})
const commentInput = ref('')

const existingComment = computed(
	() =>
		modelValue.value.find(
			f =>
				f.proposalId === proposalId &&
				f.requestNodeId === requestNodeId &&
				f.userId === userId,
		)?.comment ?? '',
)

const hasComment = computed(() => !!existingComment.value.trim())

const userComment = computed({
	get: () => existingComment.value || commentInput.value,
	set: val => {
		commentInput.value = val
	},
})

const downvoteFeedback = computed(() =>
	nodeFeedback.value
		.filter(f => f.rating < 0)
		.slice()
		.sort((a, b) => b.rating - a.rating),
)
const upvoteFeedback = computed(() =>
	nodeFeedback.value
		.filter(f => f.rating > 0)
		.slice()
		.sort((a, b) => b.rating - a.rating),
)

async function toggleFeedback() {
	expanded.value = !expanded.value
	if (expanded.value) {
		const userIds = [
			...new Set(nodeFeedback.value.map(f => f.userId)),
		].filter(id => !nameMap.value[id])

		namesLoading.value = true
		try {
			const [namesResult, commentsResult] = await Promise.all([
				userIds.length
					? $trpcClient.feedback.names.query({ userIds })
					: Promise.resolve({}),
				$trpcClient.feedback.comments.query({
					requestNodeId,
					proposalId,
				}),
			])
			if (userIds.length)
				nameMap.value = { ...nameMap.value, ...namesResult }
			commentMap.value = { ...commentMap.value, ...commentsResult }
		} catch (e: any) {
			toast.add('Failed to load details', e.message, 'error')
		} finally {
			namesLoading.value = false
		}
	}
}

function formatName(userId: string) {
	const name = nameMap.value[userId]
	if (!name) return userId
	return `${name.firstname} ${name.lastname}`.trim() || userId
}

function formatComment(userId: string) {
	return commentMap.value[userId] || ''
}

function toggle(event: MouseEvent) {
	op.value?.toggle(event, '', parentSelector)
}

function isInRange(num: number) {
	const val = userRating.value ?? 0
	if (num > 0) return num <= val
	if (num < 0) return num >= val
	return false
}

async function setValue(value: number) {
	const index = modelValue.value.findIndex(
		f =>
			f.proposalId === proposalId &&
			f.requestNodeId === requestNodeId &&
			f.userId === userId,
	)

	const previous = [...modelValue.value]

	// Optimistic update
	if (value === 0) {
		modelValue.value.splice(index, 1)
	} else {
	const updated: Feedback = {
			userId,
			proposalId,
			requestNodeId,
			rating: value,
			comment: commentInput.value,
		}

		modelValue.value =
			index !== -1
				? modelValue.value.with(index, updated)
				: [...modelValue.value, updated]
	}

	setTimeout(() => {
		op.value?.hide()
	}, 350)

	try {
		await $trpcClient.feedback.set.mutate({
			requestNodeId,
			proposalId,
			requestId,
			rating: value,
			comment: commentInput.value,
		})

		emit('change', value)
		if (value !== 0) {
			toast.add(`Rating ${value} successfully saved`)
		} else {
			toast.add(`Rating ${previous[index]?.rating} removed`)
		}
	} catch (e: any) {
		modelValue.value = previous

		// emit('change', previous[index]?.rating ?? 0)

		toast.add(`Failed to save rating ${value}`, e.message, 'error')
	}
}
</script>

<template>
	<Popup ref="op" position="top" alignment="center">
		<div class="flex flex-col gap-1 min-w-[230px]">
		<Textarea
				v-if="hasExpertise && hasComment"
				v-model="userComment"
				autoResize
				rows="1"
				placeholder="Comment..."
				class="w-full !text-xs !px-2 !py-1 mb-2"
				:pt="{
					root: {
						style: 'min-height: 1.5rem',
					},
				}" />

		<Inplace
				v-if="hasExpertise && !hasComment"
				:pt="{
					display: {
						class: 'w-full !p-[1px] flex justify-center text-gray-400 hover:text-gray-600 cursor-pointer',
					},
				}"
				@open="onCommentOpen">
				<template #display>
					<i class="pi pi-ellipsis-h text-xs"></i>
				</template>
				<template #content>
					<Textarea
						ref="commentTextareaRef"
						v-model="userComment"
						autoResize
						rows="1"
						placeholder="Comment..."
						class="w-full !text-xs !px-2 !py-1 mb-2"
						:pt="{
							root: {
								style: 'min-height: 1.5rem',
							},
						}" />
				</template>
			</Inplace>

		<div
			v-if="!hasExpertise"
			class="text-[11px] text-gray-400 text-center py-1">
			You don't have the expertise to rate this relationship
		</div>

		<div v-if="hasExpertise" class="flex gap-[2px]">
				<div
					v-for="num in range"
					@mousedown="setValue(num)"
					class="pi rating p-[15px] rounded-full bg-[#8882] cursor-pointer hover:bg-[#8883]"
					:class="{
						'pi-ban': num == 0,
						'bg-[#8885]': num == 0 && userRating == 0,
						'pi-star': num != 0 && !isInRange(num),
						'pi-star-fill bg-[#8885]': num != 0 && isInRange(num),
					}"
					:style="{
						color:
							num == 0
								? 'gray'
								: num < 0
									? `var(--feedbackNeg)`
									: `var(--ratepos)`,
					}" />
			</div>

		<div class="relative flex items-center justify-between pt-1 min-h-[16px]">
				<i
					v-if="voteCount"
					@click="toggleFeedback"
					class="pi absolute left-1/2 -translate-x-1/2 cursor-pointer text-gray-500 hover:text-gray-700 text-sm"
					:class="expanded ? 'pi-chevron-up' : 'pi-chevron-down'"></i>

				<span
					v-if="!expanded"
					class="flex items-center gap-[2px] text-xs font-semibold"
					style="color: var(--feedbackNeg)">
					<i class="pi pi-thumbs-down text-[10px] mr-1"></i>
					{{ downvoteCount }}
				</span>
				<span
					v-if="!expanded"
					class="flex items-center gap-[2px] text-xs font-semibold"
					style="color: var(--ratepos)">
					<i class="pi pi-thumbs-up text-[10px] mr-1"></i>
					{{ upvoteCount }}
				</span>
			</div>

			<div v-if="expanded" class="-mt-1 min-w-[160px]">
				<div
					v-if="namesLoading"
					class="text-xs text-gray-500 text-center py-2">
					<i class="pi pi-spin pi-spinner"></i> Loading...
				</div>

			<Tabs v-else value="downvotes">
					<TabList pt:tablist:style="justify-content: center">
						<Tab
							value="downvotes"
							pt:root:style="padding: 0.25rem 0.5rem">
							<i
								class="pi pi-thumbs-down text-xs mr-2"
								style="color: var(--feedbackNeg)"></i>
							<span
								class="text-xs"
								style="color: var(--feedbackNeg)">{{
								downvoteFeedback.length
							}}</span>
						</Tab>
						<Tab
							value="upvotes"
							pt:root:style="padding: 0.25rem 0.5rem">
							<i
								class="pi pi-thumbs-up text-xs mr-2"
								style="color: var(--ratepos)"></i>
							<span class="text-xs" style="color: var(--ratepos)">{{
								upvoteFeedback.length
							}}</span>
						</Tab>
					</TabList>
					<TabPanels>
						<TabPanel value="downvotes">
							<div
								v-if="!downvoteFeedback.length"
								class="text-xs text-gray-500 text-center py-2">
								No downvotes
							</div>
				<div
							v-for="f in downvoteFeedback"
							:key="f.userId"
							class="text-xs flex flex-col gap-[2px] py-[2px]"
							style="color: var(--feedbackNeg)">
							<div class="flex items-center gap-1">
								{{ formatName(f.userId) }}
								<span>({{ f.rating }})</span>
							</div>
							<span
								v-if="formatComment(f.userId)"
								class="pl-[2px] text-gray-500"
								>{{ formatComment(f.userId) }}</span>
						</div>
						</TabPanel>
						<TabPanel value="upvotes">
							<div
								v-if="!upvoteFeedback.length"
								class="text-xs text-gray-500 text-center py-2">
								No upvotes
							</div>
				<div
							v-for="f in upvoteFeedback"
							:key="f.userId"
							class="text-xs flex flex-col gap-[2px] py-[2px]"
							style="color: var(--ratepos)">
							<div class="flex items-center gap-1">
								{{ formatName(f.userId) }}
								<span>({{ f.rating }})</span>
							</div>
							<span
								v-if="formatComment(f.userId)"
								class="pl-[2px] text-gray-500"
								>{{ formatComment(f.userId) }}</span>
						</div>
						</TabPanel>
					</TabPanels>
				</Tabs>
			</div>
		</div>
	</Popup>

	<div
		v-bind="$attrs"
		@click="toggle($event)"
		class="relative h-[80px] cursor-pointer">
		<Knob
			rangeColor="#8882"
			:valueColor="
				(averageRating ?? 0) < 0 ? 'var(--feedbackNeg)' : 'var(--ratepos)'
			"
			class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
			v-model="averageRating"
			:step="1"
			:size="56"
			:min="-max"
			:max="max"
			pt:text:class="hidden"
			readonly />
		<Knob
			v-if="hasExpertise"
			rangeColor="#8882"
			class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
			v-model="userRating"
			:valueColor="
				(userRating ?? 0) < 0 ? 'var(--feedbackNeg)' : 'var(--ratepos)'
			"
			:step="1"
			:size="37.3"
			:strokeWidth="23"
			:min="-max"
			:max="max"
			:pt:text:class="{ hidden: !userRating }"
			readonly />
	</div>
</template>

<style scoped>
* {
	--feedbackNeg: #d00a;
	--ratepos: #080b;
}
</style>