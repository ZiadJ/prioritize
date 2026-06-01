<script setup lang="ts">
import {
  inject,
  onMounted,
  onUnmounted,
  ref,
  watchEffect,
  watch,
  watchPostEffect
} from 'vue'
import type { RatingChangeEvent } from 'primevue/rating'
import { computed } from '@vue/reactivity'
import { useDialog } from 'primevue/usedialog';

const dialog = useDialog()

// dialog.open(Popover, {
//   props: { 
//     style: 'width: 30vw',
//   }, 
//   onClose: () => { }
// })

// const {
//   userVote = 4,
//   stars = 4,
//   title = ''
// } = defineProps<{
//   userVote: number
//   glovalVote: number
//   stars?: number
//   title: string
// }>()

const props = withDefaults(defineProps<{
  userVote: number,
  globalVote: number,
  stars?: number,
  title: string
}>(), {
  userVote: 1
})

const emit = defineEmits<{
  (e: 'change', value: number, title: string): void
}>()

const op = useTemplateRef('op')

let userProgress = computed(() => {
  return Math.abs((props.userVote * 100) / ((props.stars || 0) - 1))
})

function toggle(event: Event) {
  if (op.value) op.value.toggle(event)
}

function changeUserVote(event: any) {
  event = event as RatingChangeEvent
  const className = event.originalEvent.target.parentNode.className
  emit('change', event.value, props.title)
  op.value?.hide()
}
// add two vertical divs as display grid
</script>

<template>
  <!-- <DynamicDialog /> -->
  <div class="vote w-full relative" @click="toggle">
    <progress-bar
      class="user-vote"
      :class="{ active: userProgress !== 0, negative: userProgress < 2 }"
      :value="userProgress"
      :show-value="false"
      :max="5"
    />
    <ProgressBar :value="props.globalVote" class="global-vote" :showValue="true" />
    <Popover ref="op" aria:haspopup="true">
      <Rating
        v-model.number="props.userVote"
        :max="100"
        @change="changeUserVote"
        class="rating flipped"
      />
      <Rating
        v-model="props.userVote"
        :max="100"
        @change="changeUserVote"
        class="rating"
      />
    </Popover>
    <Knob
      readonly
      class="knob absolute"
      v-model.number="props.userVote"
      :step="1"
      :size="35"
      :min="-(props.stars || 0)"
      :max="stars"
    />aa
    <Knob
      readonly
      class="knob absolute"
      v-model="props.globalVote"
      :step="1"
      :size="25"
      :min="-(props.stars || 0)"
      :max="stars"
    />
  </div>
</template>

<style scoped>
/*.p-popover {
  margin-left: -50px;
}
.p-popover::before,
.p-popover::after  {
  margin-left: 30%;
}*/
.rating {
  display: inline-block;
  margin-right: -18px;
}
</style>
<style>
/* .knob {
  position: absolute;
} */
.user-vote,
.global-vote {
  position: absolute !important;
  height: 50% !important;
}

.pi.pi-star {
  opacity: 0.9;
}

.user-vote.p-progressbar .p-progressbar-value {
  background: green;
  border-radius: 0;
  top: 0;
}
.global-vote.p-progressbar .p-progressbar-value {
  background: gray;
  bottom: 0;
}

.user-vote.p-progressbar.negative .p-progressbar-value {
  background: red;
}
.global-vote.p-progressbar.negative .p-progressbar-value {
  background: gray;
}
.flipped {
  transform: scale(-1);
}
.vertical-center {
  margin: 0;
  position: absolute;
  top: 50%;
  -ms-transform: translateY(-50%);
  transform: translateY(-50%);
}
</style>
