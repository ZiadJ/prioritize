<script setup lang="ts">
import { provide, computed, ref } from 'vue'
import CommentItem from '@/components/proposal/CommentItem.vue'
import { useProposalComments } from '~/composables/request/useProposalComments'

const props = defineProps<{ proposalId: number }>()

const { data: session } = useAuth()
const proposalIdRef = computed(() => props.proposalId)
const {
	commentTree,
	loading,
	saving,
	addComment,
	updateComment,
	removeComment,
} = useProposalComments(proposalIdRef)

const currentUserId = computed(() => session.value?.user?.id ?? null)

// Share the mutation API + identity with the (possibly recursive)
// CommentItem instances below via provide/inject instead of prop-drilling.
provide('proposalComments', {
	saving,
	currentUserId,
	addComment,
	updateComment,
	removeComment,
})

const newComment = ref('')

async function submitTopLevel() {
	if (!newComment.value.trim()) return
	await addComment(newComment.value)
	newComment.value = ''
}
</script>

<template>
	<ConfirmDialog group="commentDelete" />
	<div class="flex flex-col gap-3">
		<div v-if="currentUserId" class="form-field !mb-0">
			<Textarea
				v-model="newComment"
				rows="2"
				autoResize
				placeholder="Add a comment..."
				class="w-full !text-sm" />
			<div class="flex justify-end mt-1">
				<Button
					label="Comment"
					icon="pi pi-send"
					size="small"
					:loading="saving"
					:disabled="!newComment.trim()"
					@click="submitTopLevel" />
			</div>
		</div>

		<div
			v-if="loading"
			class="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
			<i class="pi pi-spin pi-spinner" /> Loading...
		</div>

		<div
			v-else-if="!commentTree.length"
			class="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
			No comments yet.
		</div>

		<div v-else class="flex flex-col gap-2">
			<CommentItem
				v-for="node in commentTree"
				:key="node.id"
				:comment="node" />
		</div>
	</div>
</template>
