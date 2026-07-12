<script setup lang="ts">
import { ref, inject, computed, type Ref, type ComputedRef } from 'vue'
import type { CommentNode } from '~/composables/request/useProposalComments'

interface CommentsApi {
	saving: Ref<boolean>
	currentUserId: ComputedRef<string | null>
	addComment: (description: string, parentId: number | null) => Promise<void>
	updateComment: (id: number, description: string) => Promise<void>
	removeComment: (id: number) => void
}

// A named component can reference itself recursively from its template.
defineOptions({ name: 'CommentItem' })

const props = defineProps<{ comment: CommentNode }>()

const api = inject<CommentsApi>('proposalComments')!

const canComment = computed(() => api.currentUserId.value != null)
const isAuthor = computed(
	() => api.currentUserId.value === props.comment.userId,
)

// Inline reply state — scoped to this comment, so several threads can be
// open at once without colliding.
const replying = ref(false)
const replyText = ref('')

// Inline edit state.
const editing = ref(false)
const editText = ref(props.comment.description)

function startReply() {
	replyText.value = ''
	replying.value = true
}

async function submitReply() {
	if (!replyText.value.trim()) return
	await api.addComment(replyText.value, props.comment.id)
	replying.value = false
}

function startEdit() {
	editText.value = props.comment.description
	editing.value = true
}

async function saveEdit() {
	if (!editText.value.trim()) return
	await api.updateComment(props.comment.id, editText.value)
	editing.value = false
}

function formatName() {
	const u = props.comment.user
	return `${u.firstname} ${u.lastname}`.trim() || u.username
}

function formatDate(value: string) {
	return new Date(value).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	})
}
</script>

<template>
	<div class="flex flex-col">
		<div
			class="rounded-md bg-gray-50 dark:bg-gray-800/40 px-3 py-2">
			<div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
				<NuxtLink
					:to="`/dash/users/${comment.user.username}`"
					class="font-medium text-gray-700 dark:text-gray-200 underline hover:opacity-70">
					{{ formatName() }}
				</NuxtLink>
				<span>{{ formatDate(comment.createdAt) }}</span>
			</div>

			<template v-if="editing">
				<Textarea
					v-model="editText"
					rows="2"
					autoResize
					class="w-full !text-sm mt-1"
					placeholder="Edit your comment..."
					autofocus />
				<div class="flex gap-2 mt-1">
					<Button
						label="Save"
						size="small"
						:loading="api.saving.value"
						:disabled="!editText.trim()"
						@click="saveEdit" />
					<Button
						label="Cancel"
						size="small"
						text
						@click="editing = false" />
				</div>
			</template>

			<p
				v-else
				class="text-sm mt-0.5 whitespace-pre-wrap break-words text-gray-700 dark:text-gray-200">
				{{ comment.description }}
			</p>
		</div>

		<div class="flex gap-1 mt-1 ml-1">
			<Button
				v-if="canComment && !replying"
				label="Reply"
				icon="pi pi-reply"
				size="small"
				text
				@click="startReply" />
			<Button
				v-if="isAuthor && !editing"
				icon="pi pi-pencil"
				size="small"
				text
				rounded
				aria-label="Edit comment"
				v-tooltip.top="'Edit'"
				@click="startEdit" />
			<Button
				v-if="isAuthor"
				icon="pi pi-trash"
				size="small"
				text
				rounded
				severity="danger"
				aria-label="Delete comment"
				v-tooltip.top="'Delete'"
				@click="api.removeComment(comment.id)" />
		</div>

		<div v-if="replying" class="mt-1 ml-2">
			<Textarea
				v-model="replyText"
				rows="2"
				autoResize
				class="w-full !text-sm"
				placeholder="Write a reply..."
				autofocus />
			<div class="flex gap-2 mt-1">
				<Button
					label="Reply"
					size="small"
					:loading="api.saving.value"
					:disabled="!replyText.trim()"
					@click="submitReply" />
				<Button
					label="Cancel"
					size="small"
					text
					@click="replying = false" />
			</div>
		</div>

		<div
			v-if="comment.children.length"
			class="mt-1.5 ml-2 border-l border-gray-200 dark:border-gray-700 pl-3 flex flex-col gap-2">
			<CommentItem
				v-for="child in comment.children"
				:key="child.id"
				:comment="child" />
		</div>
	</div>
</template>
