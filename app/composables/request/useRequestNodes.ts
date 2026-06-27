import { ref, computed, type Ref } from 'vue'
import type { TreeNode } from 'primevue/treenode'
import type {
	TreeTableSelectionKeys,
	TreeTableExpandedKeys,
} from 'primevue/treetable'
import { utils } from '@/methods/utils'

export interface TreeNodeEx extends TreeNode {
	id?: number
	index?: number
	children?: TreeNodeEx[]
	isDirty?: boolean
}

export function useRequestNodes(
	rootNodes: Ref<TreeNodeEx[]>,
	selectedKeys: Ref<TreeTableSelectionKeys>,
	expandedKeys: Ref<TreeTableExpandedKeys>,
	requestId: number,
	userId: Ref<string | undefined>,
) {
	const { $trpcClient } = useNuxtApp()
	const toast = usePausableToast()
	const confirm = useConfirm()

	const menuRef = ref()
	const menuTargetNode = ref<TreeNodeEx>()

	const formDialogVisible = ref(false)
	const formSaving = ref(false)
	const formEditMode = ref(false)
	const formData = ref<{
		title: string
		description: string
		expertiseNodeId: number | null
	}>({ title: '', description: '', expertiseNodeId: null })
	const editingNode = ref<TreeNodeEx>()

	const isOwner = computed(
		() =>
			menuTargetNode.value?.data?.ownerId != null &&
			menuTargetNode.value.data.ownerId === userId.value,
	)

	const menuItems = computed(() => [
		{
			label: 'Edit',
			icon: 'pi pi-pencil',
			disabled: !isOwner.value,
			command: () => openEditForm(menuTargetNode.value),
		},
		{ separator: true },
		{
			label: 'Add Child Node',
			icon: 'pi pi-arrow-right',
			command: () => openCreateForm(menuTargetNode.value),
		},
		{
			label: 'Add Sibling Node',
			icon: 'pi pi-plus',
			command: () => openCreateSiblingForm(menuTargetNode.value),
		},
		{ separator: true },
		{
			label: 'Delete',
			icon: 'pi pi-trash',
			disabled: !isOwner.value,
			command: () => deleteNode(menuTargetNode.value!),
		},
	])

	const pendingParent = ref<TreeNodeEx | undefined>()
	const pendingInsertAfter = ref<TreeNodeEx | undefined>()

	function toggleMenu(event: MouseEvent, node: TreeNodeEx) {
		menuTargetNode.value = node
		menuRef.value.toggle(event)
	}

	function getParentArray(root: TreeNodeEx[], node: TreeNodeEx): TreeNodeEx[] {
		const parent = utils.tree.traverseTreeUntil<TreeNodeEx>(
			root,
			(child: TreeNodeEx) => child === node,
		)?.parent
		return (parent?.children as TreeNodeEx[]) || root
	}

	function toggleNode(
		node: TreeNodeEx,
		expand: boolean | undefined = undefined,
		expandChildren: boolean | undefined = undefined,
	) {
		if (node.key == undefined) return

		if (expand == undefined) expand = !expandedKeys.value[node.key]

		if (!expand) {
			delete expandedKeys.value[node.key]
			if (expandChildren)
				for (const child of node.children as TreeNodeEx[])
					toggleNode(child, false, expandChildren)
		} else {
			if (node.children?.length) {
				expandedKeys.value[node.key] = true
				if (expandChildren)
					for (const child of node.children as TreeNodeEx[])
						toggleNode(child, expand, expandChildren)
			}
		}
	}

	function openCreateForm(parentNode?: TreeNodeEx) {
		pendingParent.value = parentNode
		pendingInsertAfter.value = undefined
		editingNode.value = undefined
		formEditMode.value = false
		formData.value = { title: '', description: '', expertiseNodeId: null }
		formDialogVisible.value = true
	}

	function openCreateSiblingForm(node?: TreeNodeEx) {
		if (!node) return
		const parentResult = utils.tree.traverseTreeUntil<TreeNodeEx>(
			rootNodes.value,
			(child: TreeNodeEx) => child === node,
		)
		pendingParent.value = parentResult?.parent
		pendingInsertAfter.value = node
		editingNode.value = undefined
		formEditMode.value = false
		formData.value = { title: '', description: '', expertiseNodeId: null }
		formDialogVisible.value = true
	}

	function openEditForm(node?: TreeNodeEx) {
		if (!node) return
		editingNode.value = node
		formEditMode.value = true
		formData.value = {
			title: node.data?.title || '',
			description: node.data?.description || '',
			expertiseNodeId:
				node.data?.expertiseNodeId ?? node.data?.expertise?.id ?? null,
		}
		formDialogVisible.value = true
	}

	function saveForm() {
		if (formEditMode.value) {
			applyEdit()
		} else {
			applyCreate()
		}
	}

	async function applyCreate() {
		const { title, description, expertiseNodeId } = formData.value
		if (!title.trim()) return

		const parentNode = pendingParent.value
		const siblingNode = pendingInsertAfter.value

		formSaving.value = true

		try {
			const result = (await $trpcClient.requestNodes.create.mutate({
				title: title.trim(),
				description: description.trim(),
				requestId,
				parentId: siblingNode
					? (siblingNode.data?.parentId ?? null)
					: (parentNode?.data?.id ?? null),
				isVariantsGroup: false,
				isNonNegotiable: false,
				position: 0,
				expertiseNodeId: expertiseNodeId ?? undefined,
			})) as any

			const newNode: TreeNodeEx = {
				key: String(result.id),
				id: result.id,
				data: result,
				children: [],
			}

			if (siblingNode) {
				const parentArray = getParentArray(rootNodes.value, siblingNode)
				const siblingIndex = parentArray.findIndex(
					(n: TreeNodeEx) => n.key === siblingNode.key,
				)
				parentArray.splice(siblingIndex + 1, 0, newNode)
			} else if (!parentNode) {
				rootNodes.value.push(newNode)
			} else {
				if (!parentNode.children) parentNode.children = []
				parentNode.children.push(newNode)
				toggleNode(parentNode, true)
			}

			selectedKeys.value[String(result.id)] = true
			formDialogVisible.value = false

			toast.add('Node created', title.trim())
		} catch (e: any) {
			toast.add('Failed to create node', e.message, 'error')
		} finally {
			formSaving.value = false
		}
	}

	async function applyEdit() {
		const node = editingNode.value
		if (!node) return

		const { title, description, expertiseNodeId } = formData.value
		if (!title.trim()) return

		const previousData = { ...node.data }

		node.data = {
			...node.data,
			title: title.trim(),
			description: description.trim(),
		}

		formDialogVisible.value = false
		formSaving.value = true

		try {
			const nodeId = node.id ?? node.data?.id
			if (nodeId) {
				await $trpcClient.requestNodes.update.mutate({
					id: nodeId,
					title: title.trim(),
					description: description.trim(),
					requestId: node.data?.requestId ?? requestId,
					parentId: node.data?.parentId ?? null,
					isActive: node.data?.isActive ?? true,
					isVariantsGroup: node.data?.isVariantsGroup ?? false,
					isNonNegotiable: node.data?.isNonNegotiable ?? false,
					position: node.data?.position ?? 0,
					expertiseNodeId: expertiseNodeId ?? null,
				})
			}
			toast.add('Node updated', title.trim())
		} catch (e: any) {
			node.data = previousData
			toast.add('Failed to update node', e.message, 'error')
		} finally {
			formSaving.value = false
		}
	}

	function deleteNode(node: TreeNodeEx, event?: MouseEvent) {
		const parentArray = getParentArray(rootNodes.value, node)
		const index = parentArray.findIndex((n: TreeNodeEx) => n.key === node.key)

		confirm.require({
			group: 'nodeDelete',
			header: 'Delete Confirmation',
			message: `Do you want to delete "${node.data?.title}"?`,
			icon: 'pi pi-info-circle',
			acceptClass: 'p-button-danger',
			accept: async () => {
				parentArray.splice(index, 1)

				const nodeId = node.id ?? node.data?.id
				if (nodeId) {
					try {
						await $trpcClient.requestNodes.delete.mutate({ id: nodeId })
						toast.add('Entry deleted')
					} catch (e: any) {
						parentArray.splice(index, 0, node)
						toast.add('Failed to delete node', e.message, 'error')
					}
				} else {
					toast.add('Entry deleted')
				}
			},
		})
	}

	return {
		menuRef,
		menuItems,
		toggleMenu,

		formDialogVisible,
		formSaving,
		formEditMode,
		formData,
		editingNode,

		openCreateForm,
		openEditForm,
		saveForm,
		deleteNode,
		toggleNode,
		getParentArray,
	}
}
