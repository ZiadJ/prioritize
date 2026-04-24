type TreeNode = {
	id: number
	path: string
	parentId: number | null
	depth: number
	numchild: number
}
type TreeNodeEx = TreeNode & { position: number }
type TreeNodeWithChildren<T extends TreeNode> = T & {
	children: TreeNodeWithChildren<T>[]
}

interface TreeModel {
	findUnique(args: {
		where: { id: number }
		select?: Record<string, boolean>
		include?: Record<string, unknown>
	}): Promise<TreeNode | null>
	findMany(args: {
		where: Record<string, unknown>
		select?: Record<string, boolean>
		orderBy?: Record<string, 'asc' | 'desc'>
	}): Promise<(TreeNode & { position?: number })[]>
	count(args: { where: { parentId: number } }): Promise<number>
	update(args: {
		where: { id: number }
		data: Record<string, unknown>
	}): Promise<TreeNode>
	create(args: { data: Record<string, unknown> }): Promise<TreeNode>
}

/**
 * Shifts siblings whose position satisfies the predicate by `delta`,
 * in safe order to avoid unique-constraint conflicts.
 *   delta  1 → make room  (position >= fromPosition), update highest first
 *   delta -1 → close gap  (position >  fromPosition), update lowest first
 */
async function shiftSiblingPositions(
	model: TreeModel,
	parentId: number | null,
	fromPosition: number,
	delta: 1 | -1,
	excludeId?: number,
): Promise<void> {
	const positionFilter =
		delta === 1 ? { gte: fromPosition } : { gt: fromPosition }
	const where: Record<string, unknown> = { parentId, position: positionFilter }
	if (excludeId !== undefined) where.id = { not: excludeId }

	const siblings = await model.findMany({ where })

	// Process in safe order to avoid transient unique-constraint violations
	const sorted = [...siblings].sort(
		(a, b) =>
			delta === 1
				? (b.position ?? 0) - (a.position ?? 0) // descending when shifting up
				: (a.position ?? 0) - (b.position ?? 0), // ascending when shifting down
	)

	for (const s of sorted) {
		await model.update({
			where: { id: s.id },
			data: { position: (s.position ?? 0) + delta },
		})
	}
}

export async function getFullPath(
	model: TreeModel,
	id: number,
	save = false,
): Promise<string> {
	const pathSegments: string[] = []
	let currentId: number | null = id
	while (currentId !== null) {
		const node = await model.findUnique({
			where: { id: currentId },
			select: { id: true, path: true, parentId: true },
		})
		if (!node) throw new Error(`Node with id ${currentId} not found`)
		pathSegments.unshift(node.path)
		currentId = node.parentId
	}
	const fullPath = pathSegments.join('/')
	if (save) {
		await model.update({ where: { id }, data: { path: fullPath } })
	}
	return fullPath
}

export async function createTreeNode(
	model: TreeModel,
	data: Record<string, unknown> & { parentId?: number | null },
	position?: number,
): Promise<TreeNode> {
	const parent = data.parentId
		? await model.findUnique({
				where: { id: data.parentId },
				select: { id: true, path: true, parentId: true, depth: true },
			})
		: null
	const depth = parent ? (parent.depth as number) + 1 : 0

	const positionData: Record<string, unknown> = {}
	if (position !== undefined) {
		await shiftSiblingPositions(model, data.parentId ?? null, position, 1)
		positionData.position = position
	}

	const node = await model.create({
		data: { ...data, ...positionData, path: '//', depth, numchild: 0 },
	})

	const parentPath = parent ? parent.path : null
	const path = parentPath ? `${parentPath}/${node.id}` : String(node.id)
	const updatedNode = await model.update({
		where: { id: node.id },
		data: { path },
	})

	if (parent) {
		const parentChildCount = await model.count({
			where: { parentId: parent.id },
		})
		await model.update({
			where: { id: parent.id },
			data: { numchild: parentChildCount },
		})
	}

	return updatedNode
}

export async function moveTreeNode(
	model: TreeModel,
	nodeId: number,
	newParentId: number | null,
	position?: number,
): Promise<TreeNode> {
	// 1. Fetch the node being moved
	const node = (await model.findUnique({ where: { id: nodeId } })) as
		| (TreeNode & { position?: number })
		| null
	if (!node) throw new Error(`Node ${nodeId} not found`)

	// 2. No-op when nothing actually changes
	const isSameParent = node.parentId === newParentId
	const isSamePosition = position !== undefined && node.position === position
	if (isSameParent && (position === undefined || isSamePosition)) return node

	// 3. Guard: cannot move to itself
	if (newParentId === nodeId) throw new Error('Cannot move a node to itself')

	// 4. Fetch and validate the new parent
	const newParent =
		newParentId != null
			? await model.findUnique({ where: { id: newParentId } })
			: null
	if (newParentId != null && !newParent) {
		throw new Error(`New parent node ${newParentId} not found`)
	}

	// 5. Guard: cannot move into a descendant
	if (newParent && newParent.path.startsWith(`${node.path}/`)) {
		throw new Error('Cannot move a node into one of its own descendants')
	}

	// 6. TreeNodeEx: close the positional gap left at the old parent
	if (position !== undefined && node.position !== undefined) {
		await shiftSiblingPositions(model, node.parentId, node.position, -1, nodeId)
	}

	// 7. Rewrite paths and depths for every descendant
	const oldPath = node.path
	const newDepth = newParent ? newParent.depth + 1 : 0
	const depthDelta = newDepth - node.depth
	const newPath = newParent ? `${newParent.path}/${nodeId}` : String(nodeId)

	const descendants = await model.findMany({
		where: { path: { startsWith: `${oldPath}/` } },
	})
	for (const desc of descendants) {
		await model.update({
			where: { id: desc.id },
			data: {
				path: newPath + desc.path.slice(oldPath.length),
				depth: desc.depth + depthDelta,
			},
		})
	}

	// 8. TreeNodeEx: make room at the new parent (exclude moving node to avoid
	//    an extra write and any transient unique-constraint conflict)
	const positionData: Record<string, unknown> = {}
	if (position !== undefined) {
		await shiftSiblingPositions(model, newParentId, position, 1, nodeId)
		positionData.position = position
	}

	// 9. Move the node itself
	const movedNode = await model.update({
		where: { id: nodeId },
		data: {
			parentId: newParentId,
			path: newPath,
			depth: newDepth,
			...positionData,
		},
	})

	// 10. Refresh numchild on the old parent
	if (node.parentId != null) {
		const oldParentCount = await model.count({
			where: { parentId: node.parentId },
		})
		await model.update({
			where: { id: node.parentId },
			data: { numchild: oldParentCount },
		})
	}

	// 11. Refresh numchild on the new parent
	if (newParentId != null) {
		const newParentCount = await model.count({
			where: { parentId: newParentId },
		})
		await model.update({
			where: { id: newParentId },
			data: { numchild: newParentCount },
		})
	}

	return movedNode
}

type TreeTableNode<T> = {
	key: string
	data: T
	leaf?: boolean
	children: TreeTableNode<T>[]
}

type BuiltTreeNode<T> = {
	key: string
	label: string
	data: T
	children: BuiltTreeNode<T>[]
}

export function buildTreeSelectDataFromNodes<
	T extends { id: number; parentId: number | null; title: string },
>(nodes: T[]): BuiltTreeNode<T>[] {
	const childrenMap = new Map<number | null, T[]>()
	for (const node of nodes) {
		const key = node.parentId ?? null
		if (!childrenMap.has(key)) {
			childrenMap.set(key, [])
		}
		childrenMap.get(key)!.push(node)
	}

	const buildTree = (parentId: number | null): BuiltTreeNode<T>[] => {
		const children = childrenMap.get(parentId) ?? []
		return children.map(node => ({
			key: String(node.id),
			label: node.title,
			data: node,
			children: buildTree(node.id),
		}))
	}

	return buildTree(null)
}

export async function getTreeNode<T extends TreeNode>(
	model: TreeModel,
	id: number,
): Promise<TreeTableNode<T>> {
	const root = (await model.findUnique({ where: { id } })) as T | null
	if (!root) throw new Error(`Node ${id} not found`)

	const descendants = (await model.findMany({
		where: { path: { startsWith: `${root.path}/` } },
		orderBy: { path: 'asc' },
	})) as T[]
	// descendants.sort((a, b) => a.path.localeCompare(b.path));

	const toNode = (n: T): TreeTableNode<T> => ({
		key: String(n.id),
		data: n,
		children: [],
	})

	const nodeMap = new Map<number, TreeTableNode<T>>()
	nodeMap.set(root.id, toNode(root))

	for (const desc of descendants) {
		nodeMap.set(desc.id, toNode(desc))
		nodeMap.get(desc.parentId!)!.children.push(nodeMap.get(desc.id)!)
	}

	return nodeMap.get(root.id)!
}
