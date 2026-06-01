<template>
	<Popover
		ref="op"
		class="rate-overlay"
		@mousedown="overlayClick"
		:appendTo="aaa">
		<div
			v-for="num in Number(max) + 1"
			@mouseup="setValue(num - 1)"
			@mousedown="setValue(num - 1)"
			class="pi rating"
			:class="{
				'pi-ban': num == 1,
				selected: num == 1 && modelValue,
				'pi-star': num > 1 && !isInRange(num),
				'pi-star-fill selected': num > 1 && isInRange(num),
			}"
			style="margin-bottom: 15px"
			:style="{
				color: num == 0 ? 'gray' : isNeg ? `var(--rateneg)` : `var(--ratepos)`,
			}"></div>
		&nbsp;
		<br />
		<Textarea :autoResize="true" :rows="1" />
		<br />
		<div
			class="pi pi-info"
			style="
				font-size: 1em;
				font-weight: bold;
				background: #8882;
				border-radius: 50%;
				padding: 10px;
				cursor: pointer;
			"
			@click="showInfo = !showInfo"></div>
		<pre v-if="showInfo" v-for="rating of ratings">{{ rating }}</pre>
	</Popover>

	<div v-bind="$attrs">
		<Knob
			valueTemplate=""
			rangeColor="#8882"
			:valueColor="rating < 0 ? 'var(--rateneg)' : 'var(--ratepos)'"
			class="center"
			v-model="absPublicRating"
			:step="1"
			:size="40"
			:min="0"
			:max="max"
			readonly />
		<Knob
			valueTemplate=""
			class="center"
			v-model="absModelValue"
			rangeColor="transparent"
			:valueColor="(modelValue || 0) < 0 ? 'var(--rateneg)' : 'var(--ratepos)'"
			:step="1"
			:size="26"
			:strokeWidth="23"
			:min="0"
			:max="max"
			readonly />
		<div
			class="rating-buttons full"
			style="border-radius: 5px; user-select: none">
			<div
				tabindex="0"
				class="full rate"
				style="
					left: 0;
					right: unset;
					border-radius: 5px 0 0 5px;
					background: var(--rateneg);
				"
				@mousedown="show($event, false)"
				@blur="hide()">
				<i class="pi pi-minus center" style="font-size: 20px; color: white"></i>
			</div>
			<div
				tabindex="0"
				class="full rate"
				style="
					left: unset;
					right: 0;
					border-radius: 0 5px 5px 0;
					background: var(--ratepos);
				"
				@mousedown="show($event, true)"
				@blur="hide()">
				<i class="pi pi-plus center" style="font-size: 20px; color: white"></i>
				<div class="test bg-red-500" ref="aaa" style="">a</div>
				<!-- add parent to the div so it's invisible at first -->
				<div style="position: fixed; bottom: 100%; right: 100%">
					<Teleport to="body">
						<pre class="test bg-blue-500 rounded" ref="bbb">
								 lorem ipsum 
								 lorem ipsum 
								 lorem ipsum 
								 lorem ipsum 
								 lorem ipsum 
								 lorem ipsum 
								 lorem ipsum 
								 lorem ipsum 
								 lorem ipsum 
								 lorem ipsum 
								 lorem ipsum 
								 lorem ipsum 
								 lorem ipsum 
								 lorem ipsum 
								 lorem ipsum 
								 lorem ipsum 
								 lorem ipsum 
								 lorem ipsum 
{{ modelValue }}

							 </pre
						>
					</Teleport>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
//#region
import { watch, computed, ref, onMounted } from 'vue'
import type { RatingChangeEvent } from 'primevue/rating'
import type Popover from 'primevue/Popover'
// import { createPopper, type Instance, type Options } from '@popperjs/core'

const op = useTemplateRef('op')
const aaa = ref()
const bbb = ref()

onMounted(() => {
	//    let popperInstance: Instance | null = null
	//    let open = false
	//    aaa.value.addEventListener('click', () => {
	//       // destroy popper
	//       if (popperInstance) {
	//          popperInstance.destroy()
	//          popperInstance = null
	//       } else
	//          popperInstance = createPopper(aaa.value, bbb.value, {
	//             placement: 'right',
	//             modifiers: [
	//                {
	//                   name: 'offset',
	//                   options: {
	//                      offset: [0, 8],
	//                   },
	//                },
	//                {
	//                   name: 'eventListeners',
	//                   enabled: false,
	//                   phase: 'write',
	//                   fn: () => {},
	//                   capture: false,
	//                   el: bbb.value,
	//                },
	//                {
	//                   name: 'flip',
	//                   options: { enabled: true, rootBoundary: 'document', padding: 8 },
	//                },
	//                { name: 'preventOverflow', options: { enabled: true } },
	//                { name: 'arrow', options: { element: '#arrow' } },
	//                { name: 'hide', enabled: true },
	//             ],
	//          })
	//       // create options that cause popper to audo destroy when clicked outside so it does not show again hover
	//    })
})

const {
	max = 4,
	rating = 0,
	ratings = [],
} = defineProps<{
	rating: number
	ratings: object[]
	max: number
}>()

const modelValue = defineModel<number | undefined>()
// const ratings1 = defineModel<object[]>('ratings1')

const emit = defineEmits<{
	(e: 'change', value: number | undefined): void
}>()

const absModelValue = computed({
	get() {
		return Math.abs(modelValue.value || 0)
	},
	set(value) {
		modelValue.value = isNeg.value ? -Math.abs(value) : Math.abs(value)
	},
})

function getAverage(ratings: any[], decimals: number = 0) {
	const avg =
		ratings.reduce((sum, curr) => sum + curr.rating, 0) / ratings.length
	return avg.toFixed(decimals)
}

const absPublicRating = computed(() => Math.abs(rating))
//#endregion
const isNeg = ref(false)
const showInfo = ref(false)

let isOverlayClick = false
function overlayClick(event: Event) {
	let activeEl = document.activeElement as HTMLElement

	setTimeout(() => {
		// activeEl?.focus()
	}, 0)

	isOverlayClick = true
}

function hide() {
	//if (!isOverlayClick) op.value!.hide()
	isOverlayClick = false
}

function show(event: Event, pos: boolean) {
	isNeg.value = !pos

	//op.value!.hide()
	setTimeout(() => {
		//op.value!.show(event, event.target)
	}, 120)
}

function isInRange(rating: number) {
	return isNeg.value
		? -rating + 1 >= (modelValue.value || 0)
		: rating - 1 <= (modelValue.value || 0)
	// return (isNeg.value ? -rating : rating) < (modelValue.value || 0)
}

function setValue(value: number) {
	console.log(value)
	absModelValue.value = value
	emit('change', modelValue.value)
	setTimeout(() => {
		op.value!.hide()
		;(document.activeElement as HTMLElement).blur()
	}, 700)
}
</script>

<style scoped>
* {
	--rateneg: #d00a;
	--ratepos: #080b;
}

.center {
	position: absolute;
	top: 50%;
	left: 50%;
	translate: -50% -50%;
}

.full {
	position: absolute;
	top: 0;
	left: 0;
	height: 100%;
	width: 100%;
}

.rating {
	padding: 15px;
	float: left;
	border-radius: 50%;
	background: #aaf2;
	cursor: pointer;
}
.rating:hover {
	background: #aaf9;
}
.selected {
	background: #aaf9;
}

.rate {
	width: 50%;
	cursor: pointer;
	opacity: 0;
	transition: 250ms;
}
.rate:hover,
.rate:focus-within {
	opacity: 1;
}

.rating-buttons:hover,
.rating-buttons:focus-within {
	outline: 1px solid #8882;
}

:deep(svg) {
	margin-top: 3px;
}
</style>
