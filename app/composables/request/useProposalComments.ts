import { ref, computed, watch, shallowRef, type Ref } from 'vue'

export interface CommentUser {
	id: string
	firstname: string
	lastname: string
	username: string
}

export interface CommentRow {
	id: number
	title: string
	description: string
	createdAt: string
	isActive: boolean
	userId: string
	parentId: number | null
	path: string
	depth: number
	numchild: number
	user: CommentUser
}

export interface CommentNode extends CommentRow {
	children: CommentNode[]
}

/**
 * Manages the threaded comments attached to a proposal.
 *
 * Comments are fetched as a flat, path-ordered list (parents before
 * children) and assembled into a tree on the client. Adding a reply,
 * editing or deleting mutates the shared flat store and the tree is
 * recomputed reactively, so the whole thread always reflects the latest
 * state. Only the comment's author can edit or delete it (enforced
 * server-side); the UI hides those actions for comments the current user
 * did not create.
 */
export function useProposalComments(
	proposalId: Ref<number | null | undefined>,
) {
	const { $trpcClient } = useNuxtApp()
	const toast = usePausableToast()
	const confirm = useConfirm()

	const comments = shallowRef<CommentRow[]>([])
	const loading = ref(false)
	const saving = ref(false)

	async function load() {
		const id = proposalId.value
		if (!id) {
			comments.value = []
			return
		}
		loading.value = true
		try {
			const data = await $trpcClient.comments.byProposalId.query({
				proposalId: id,
			})
			comments.value = data as CommentRow[]
		} catch (e: any) {
			toast.add('Failed to load comments', e.message, 'error')
		} finally {
			loading.value = false
		}
	}

	watch(proposalId, load, { immediate: true })

	// Assemble the flat list into a parent → children tree. The list is
	// already path-ordered, so children always appear after their parent
	// and the resulting tree preserves a stable display order.
	const commentTree = computed<CommentNode[]>(() => {
		const map = new Map<number, CommentNode>()
		const roots: CommentNode[] = []
		for (const c of comments.value) {
			map.set(c.id, { ...c, children: [] })
		}
		for (const c of comments.value) {
			const node = map.get(c.id)
			if (!node) continue
			if (c.parentId != null && map.has(c.parentId)) {
				map.get(c.parentId)!.children.push(node)
			} else {
				roots.push(node)
			}
		}
		return roots
	})

	async function addComment(description: string, parentId: number | null = null) {
		const id = proposalId.value
		if (!id || !description.trim()) return
		saving.value = true
		try {
			const created = await $trpcClient.comments.create.mutate({
				proposalId: id,
				parentId,
				description: description.trim(),
			})
			comments.value = [...comments.value, created as CommentRow]
			toast.add('Comment added')
		} catch (e: any) {
			toast.add('Failed to add comment', e.message, 'error')
		} finally {
			saving.value = false
		}
	}

	async function updateComment(id: number, description: string) {
		if (!description.trim()) return
		saving.value = true
		try {
			const updated = await $trpcClient.comments.update.mutate({
				id,
				description: description.trim(),
			})
			comments.value = comments.value.map(c =>
				c.id === id ? (updated as CommentRow) : c,
			)
			toast.add('Comment updated')
		} catch (e: any) {
			toast.add('Failed to update comment', e.message, 'error')
		} finally {
			saving.value = false
		}
	}

	function removeComment(id: number) {
		const target = comments.value.find(c => c.id === id)
		confirm.require({
			group: 'commentDelete',
			header: 'Delete Comment',
			message: target?.numchild
				? 'Delete this comment and all of its replies?'
				: 'Delete this comment?',
			icon: 'pi pi-info-circle',
			acceptClass: 'p-button-danger',
			accept: async () => {
				saving.value = true
				try {
					const res = await $trpcClient.comments.delete.mutate({ id })
					// Remove the comment and every descendant (paths that
					// start with `<deletedPath>/`). The server cascades the
					// delete; the client mirrors it to avoid a refetch.
					const prefix = `${res.path}/`
					comments.value = comments.value.filter(
						c => c.id !== id && !c.path.startsWith(prefix),
					)
					toast.add('Comment deleted')
				} catch (e: any) {
					toast.add('Failed to delete comment', e.message, 'error')
				} finally {
					saving.value = false
				}
			},
		})
	}

	return {
		comments,
		commentTree,
		loading,
		saving,
		load,
		addComment,
		updateComment,
		removeComment,
	}
}
