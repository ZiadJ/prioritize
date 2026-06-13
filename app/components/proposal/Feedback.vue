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
}

const {
	max = 3,
	userId,
	proposalId,
	requestNodeId,
	parentSelector,
	expertiseNodeId,
} = defineProps<{
	max: number
	proposalId: number | null
	requestNodeId: number | null
	userId: string
	parentSelector?: string
	expertiseNodeId?: number
}>()

const modelValue = defineModel<Feedback[]>({ default: [] })

const emit = defineEmits<{
	(e: 'change', value: number): void
}>()

const op = useTemplateRef('op')
const { $trpcClient } = useNuxtApp()

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

const voteCount = computed(
	() =>
		modelValue.value.filter(
			f => f.proposalId === proposalId && f.requestNodeId === requestNodeId,
		).length,
)

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
			rating: value,
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
		<div class="relative flex gap-[2px] pb-[12px]">
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
			<span
				v-if="voteCount"
				class="absolute bottom-[-6px] right-[-3px] text-xs font-semibold text-gray-500">
				{{ voteCount + (voteCount > 1 ? ' votes' : ' vote') }}
			</span>
		</div>
	</Popup>

	<div
		v-bind="$attrs"
		@click="hasExpertise && toggle($event)"
		class="relative h-[80px]"
		:class="{ 'pointer-events-none opacity-60': !hasExpertise }">
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
