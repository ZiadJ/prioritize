import type { ObjectExpression } from '@babel/types'
import { traverseNode } from '@vue/compiler-core'

/* Allow for accessing properties of specific type T */
export interface IIndexable<T = any> {
  [key: string]: T
}

export type Tree<T> = T & {
  children?: T[]
}

/* Interfaces used by the arrayToTree method */
export interface ITreeItemUpper {
  Id: number | string
  ParentId?: number | string | null
  [key: string]: any
}

export interface ITreeItem {
  id: number | string
  parentId?: number | string | null
  [key: string]: any
}

export interface ITreeNode {
  key?: string | number
  data?: object | null
  children?: ITreeNode[]
}

export default class treeUtils {
	/* Unflattens an array to a tree */
	static buildTree<T>(items: ITreeItem[] | ITreeItemUpper[]): ITreeNode[] {
		if (!items.length) return []

		// the resulting unflattened tree
		const rootItems: ITreeNode[] = []

		// stores all already processed items with ther ids as key so we can easily look them up
		const lookup: { [id: string]: ITreeNode } = {}

		const isUpper = items.length > 0 && items[0] != null && 'Id' in items[0]

		// idea of this loop:
		// whenever an item has a parent, but the parent is not yet in the lookup object, we store a preliminary parent
		// in the lookup object and fill it with the data of the parent later
		// if an item has no parentId, add it as a root element to rootItems
		for (const item of items) {
			const itemId = isUpper ? item.Id : item.id
			const parentId = isUpper ? item.ParentId : item.parentId

			// look whether item already exists in the lookup table
			if (!Object.prototype.hasOwnProperty.call(lookup, itemId)) {
				// item is not yet there, so add a preliminary item (its data will be added later)
				lookup[itemId] = { key: '', data: null, children: [] }
			}

			// add the current item's data to the item in the lookup table
			lookup[itemId]!.data = item

			const TreeItem = lookup[itemId]!

			if (parentId === null) {
				// is a root item
				rootItems.push(TreeItem)
			} else {
				// has a parent
				// look whether the parent already exists in the lookup table
				if (!Object.prototype.hasOwnProperty.call(lookup, parentId)) {
					// parent is not yet there, so add a preliminary parent (its data will be added later)
					lookup[parentId] = { key: '', data: null, children: [] }
				}

				// add the current item to the parent
				lookup[parentId]!.children!.push(TreeItem)
			}
		}

		return rootItems
	}

	/**
	 * Return a flat array from a hierachical array
	 */
	static flattenTree(
		rootNode: ITreeNode,
		isUpper: boolean,
	): ITreeItem[] | ITreeItemUpper[] {
		const treeItems: ITreeItem[] | ITreeItemUpper[] = []

		this.traverseTreeUntil(rootNode, (child, parent) => {
			if (child.children) {
				for (const node of child.children) {
					const item: any = {
						...node.data,
					}

					if (isUpper) {
						item.Id = !node.key ? -1 : node.key
						item.ParentId = !Array.isArray(parent) ? parent?.key : null
					} else {
						item.id = !node.key ? -1 : node.key
						item.parentId = !Array.isArray(parent) ? parent?.key : null
					}

					treeItems.push(item)
				}
			}
		})

		return treeItems
	}

	static findNodeByKey(node: ITreeNode, key: string): ITreeNode | null {
		if (node.key === key) return node

		if (node.children && node.children.length)
			for (const child of node.children) {
				return this.findNodeByKey(child, key)
			}

		return null
	}

	static traverseTreeUntil<T extends ITreeNode>(
		tree: T | T[],
		task: (
			child: T,
			parent: T | undefined,
			index: number,
			parents: T[],
		) => boolean | void,
		parents: T[] = [],
	): { node: T; parent: T | undefined; index: number; parents: T[] } | null {
		if (Array.isArray(tree)) {
			for (let i = 0; i < tree.length; i++) {
				const parent = parents[parents.length - 1]
				if (task(tree[i]!, parent, i, parents) === true) {
					return {
						node: tree[i]!,
						parent: parent,
						index: i,
						parents: parents,
					}
				} else if (tree[i]!.children?.length) {
					const result = this.traverseTreeUntil(tree[i]!, task, parents)
					if (result) {
						return result
					}
				}
			}
		} else {
			if (tree.children?.length)
				return this.traverseTreeUntil(tree.children as T[], task, [
					...parents,
					tree,
				])
		}
		return null
	}

	static traverseObject(obj: IIndexable<Object | any>, task: () => boolean) {
		for (const child in obj) {
			if (obj[child] !== null) {
				if (typeof obj[child] === 'object')
					this.traverseObject(obj[child], task)
				else if (task.call(child) != false) break
			}
		}
	}

	// static getCyclicJSON(obj: object, tabChar: string = '\t'): string {
	//   const seen: any[] = []
	//   const value = JSON.stringify(
	//     obj,
	//     function (key, val) {
	//       if (val != null && typeof val === 'object') {
	//         if (seen.indexOf(val) >= 0) return
	//         seen.push(val)
	//       }
	//       return val
	//     },
	//     tabChar
	//   )
	//   return value
	// }
}
