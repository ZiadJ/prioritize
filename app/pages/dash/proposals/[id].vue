<script setup lang="ts">
import type {
	RequestNode,
	Proposal,
	Request,
} from '~~/prisma/generated/interfaces'
import type { ColumnProps } from 'primevue/column'
import type {
	TreeTableSelectionKeys,
	TreeTableExpandedKeys,
} from 'primevue/treetable'
import { unref, ref, reactive, onMounted, computed, watch, type Ref } from 'vue'
import type { TreeNode } from 'primevue/treenode'
import type { EditorTextChangeEvent } from 'primevue/editor'
import {
	useRefHistory,
	useWindowSize,
	useStorage,
	useLastChanged,
	refDebounced,
	useDebounceFn,
	refAutoReset,
	createGlobalState,
	useStyleTag,
	type DebounceFilterOptions,
} from '@vueuse/core'
import type { RatingChangeEvent } from 'primevue/rating'

import Vote from '~/components/proposal/Vote.vue'
import { useVueConsole, str, json } from '@/methods/console'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useRoute } from 'vue-router'
import { utils } from '@/methods/utils'
import { useNuxtApp } from '#app'

const route = useRoute()
const toast = useToast()
const confirm = useConfirm()

function notify(title: string, content: string, severity: string = 'success') {
	toast.add({
		summary: title,
		life: 3000,
		detail: content,
	})
}

// State
const state = reactive({
	isEditMode: false,
	hasChange: false,
	editorButtons: ['bold', 'italic', 'underline', 'link', 'color', 'background'],
	ratingControlType: ref('vote'),
	count: 0,
})

const searchFilters = ref({ global: '' })

const treeTable = useTemplateRef('treeTable')

const rootNodes = ref<TreeNodeEx[]>([]) // useStorage<TreeNodeEx[]>('rootNode' + requestId.value, [])
	
const selectedNode = ref<TreeNodeEx>()
const selectedNodes = ref<TreeNodeEx[]>([])

const selectedKeys = ref<TreeTableSelectionKeys>({})

const columns = ref<ProposalColumn[]>([])

const visibleColumns = ref<ProposalColumn[]>(columns.value)

function setRequestNodes(request: Request) {
	const treeNodes = utils.tree.buildTree(request.requestNodes ?? [])
	rootNodes.value = treeNodes as TreeNodeEx[]

	toggleNode(treeNodes[0] as TreeNodeEx, true)
	
	request.proposals?.forEach((p) =>
		columns.value.push(mapProposalToColumn(p))
	)
}

const { $trpcClient } = useNuxtApp()
// const requestId = parseInt(route.params.id as string)
const request = await $trpcClient.requests.byId.query({ id: Number(route.params.id) })
console.log('Fetched request:', request)

onMounted(async () => {
	if (request) setRequestNodes(request as unknown as Request)	
})

const windowHeight = useWindowSize()
const windowScrollHeight = useWindowSize().height
const treeTableHeight = computed<string>(() => {
	if (treeTable.value) {
		const treeTableTop = (treeTable.value as any).$el.getBoundingClientRect().top
		const height =
			(windowHeight.height.value - treeTableTop + 15).toFixed() + 'px'
		if (windowScrollHeight) console.log(height)
		return height
	} else return '500px'
})

interface ProposalColumn extends ColumnProps {
	id?: number
	body: string
	isDirty?: boolean
}

interface TreeNodeEx extends TreeNode {
	id?: number
	index?: number
	children?: TreeNode[]
	isDirty?: boolean
}

//const requestNodes = ref<RequestNode[]>([])
//const requestNode = ref<RequestNode>()

const jsonData = computed(() => {
	return json(
		{
			data: [
				{
					requestNodes: rootNodes.value,
					// proposalNodes: columns.value
					// 	.splice(columnsInit.length)
					// 	.map(col => mapColumnToProposal(col)),
				},
			],
		},
		2,
	)
})

function mapProposalToColumn(p: Proposal): ProposalColumn {
	return {
		field: 'p' + p.id,
		columnKey: p.id.toString(),
		header: p.title,
		body: p.body,
	}
}

// function mapColumnToProposal(p: ProposalColumn): Proposal {
// 	return {
// 		id: parseInt((p.columnKey || 'p').substring(1)),
// 		parentId: 0,
// 		title: p.header || '',
// 		body: p.body,
// 		avgRating: 0,
// 	} as Proposal
// }
// const rootNodeHistory = useRefHistory(rootNode, {
// 	deep: true,
// 	capacity: 15,
// })

// const columnsInit: ProposalColumn[] = [
// 	{
// 		field: 'weight',
// 		header: 'Appeal',
// 	},
// ]


function addProposal(proposal: Proposal | null = null) {
	if (!proposal) {
		proposal = {
			id: -columns.value.length,
			title: prompt('Title for the new proposal', 'New Proposal') || '',
			body: prompt('Description for the proposal', 'New Description') || '',
			isActive: true,
		} as Proposal
	}

	if (proposal && proposal.title) {
		let col: ProposalColumn = mapProposalToColumn(proposal)

		columns.value.push(col)
		visibleColumns.value = columns.value
	}
}

function onColumnVisibilityToggle(filteredProposals: any) {
	visibleColumns.value = columns.value.filter(col =>
		filteredProposals.includes(col),
	)
}

function onNodeSelect(node: TreeNodeEx) {
	selectedNode.value = node
	selectedNodes.value.push(node)
}

function onNodeUnselect(node: any) {
	selectedNodes.value = selectedNodes.value.filter(
		({ key }) => key !== node.key,
	)
}

const deleteNode = (node: TreeNodeEx, event: MouseEvent) => {
	let parentArray = getParentArray(rootNodes.value, node)

	const index1 = parentArray.findIndex((n: TreeNodeEx) => n.key == node.key)

	confirm.require({
		header: 'Delete Confirmation',
		target: event.currentTarget as HTMLElement,
		message: 'Do you want to delete this entry?',
		icon: 'pi pi-info-circle',
		acceptClass: 'p-button-danger',
		accept: () => {
			parentArray.splice(index1, 1)

			toast.add({
				summary: 'Confirmed',
				detail: 'Entry deleted',
				life: 3000,
			})
		},
		reject: () => {
			toast.add({
				summary: 'Rejected',
				detail: 'You have rejected',
				life: 3000,
			})
		},
	})
}

const getParentArray = (
	rootNode: TreeNodeEx[],
	node: TreeNodeEx,
): TreeNodeEx[] => {
	const parent = utils.tree.traverseTreeUntil<TreeNodeEx>(
		rootNode,
		(child: TreeNodeEx) => {
			return child === node
		},
	)?.parent
	return (parent?.children as TreeNodeEx[]) || rootNode
}

const addRequestNode = (node: TreeNodeEx | undefined) => {
	const newKey = (-Date.now()).toString()

	const title = prompt('Add Node', 'Enter a name for the new node')

	const newNode: TreeNodeEx = {
		key: newKey,
		data: {
			title: title || 'New request',
			body: 'New content',
		},
	}

	if (!node) { 
		rootNodes.value.push(newNode)
	}
	else if (!node.children) {
		node.children = [newNode]
	} else {
		node.children.push(newNode)
	}

	selectedKeys.value[newKey] = true

	if (node)
		toggleNode(node, true)

}

const expandedKeys = ref<TreeTableExpandedKeys>({})

function toggleNode(
  node: TreeNodeEx,
  expand: boolean | undefined = undefined,
  expandChildren: boolean | undefined = undefined,
) {
  if (node.key != undefined) {
		if (expand == undefined) expand = !expandedKeys.value[node.key]
		
    if (!expand) {
      delete expandedKeys.value[node.key]
      if (expandChildren)
        for (let child of node.children as TreeNodeEx[])
          toggleNode(child, false, expandChildren)
    } else {
      if (node.children?.length) {
				expandedKeys.value[node.key] = true
				
        if (expandChildren)
          for (let child of node.children as TreeNodeEx[])
            toggleNode(child, expand, expandChildren)
      }
    }
  }
}

const hoveredProposal = ref<ProposalColumn | undefined>()
const hoveredRequestNode = ref<RequestNode | undefined>()

const highlightColumnAndShowDescription = utils.uiElements.delayedHover(
	(el: HTMLElement) => {
		if (el) {
  		let proposalKeyClass = Array.from(el.classList).find(c => c.startsWith('proposal_key_'))
  		let requestNodeKeyClass = Array.from(el.classList).find(c => c.startsWith('request_node_key_'))

			if (proposalKeyClass) {
				const color = document.documentElement.classList.contains('dark')
					? '#ffffff08'
					: '#00000010'
				const styleContent = `
					:is(td, th):has(.${proposalKeyClass}) { background: ${color}; transition: background 250ms; }
				`;
				useStyleTag(styleContent, { id: 'proposal-column-highlight' })

				const proposalKey = proposalKeyClass.split('_').at(-1) 				
				hoveredProposal.value = columns.value.find(col => col.columnKey === proposalKey)
			}

			if (requestNodeKeyClass) {
				const requestNodeKey = requestNodeKeyClass?.split('_').at(-1)
				hoveredRequestNode.value = request?.requestNodes?.find(node => node.id.toString() === requestNodeKey)	
			}
		}
	},
	'.hover-parent',
	100,
)

const debounceNotify = useDebounceFn((title: any, content: any) => {
	notify(title, json(content))
}, 500)

function onEditorChanged(e: EditorTextChangeEvent) {
	debounceNotify(`Text changed for goal`, json(e.delta))
}

function onRatingChange(e: RatingChangeEvent | number, node: TreeNodeEx, col?: ProposalColumn) {
	if (!col) 
		debounceNotify(
			'Rating changed',
			`${typeof e == 'number' ? e : e.value} for request node ${node.data.id}`,
		)
	else
		debounceNotify(
			'Rating changed',
			`${typeof e == 'number' ? e : e.value} for request node ${node.data.id} proposal ${col.columnKey}`,
		)
}

const requestNodeMenu = computed(() => {
	return [
		{
			label: 'Edit Mode',
			icon: 'pi pi-pencil',
			command: () => {
				state.isEditMode = true
			},
		},
		{
			label: 'View Mode',
			icon: 'pi pi-minus',
			command: () => {
				state.isEditMode = false
			},
		},
		{
			label: state.isEditMode ? 'View Mode' : 'Edit Mode',
			icon: state.isEditMode ? 'pi pi-key' : 'pi pi-pencil',
			command: () => {
				state.isEditMode = !state.isEditMode
			},
		}
	]
})
</script>

<template>
	<div>
		<ConfirmPopup></ConfirmPopup>
		<ConfirmDialog></ConfirmDialog>
		<Toast style="opacity: 0.9" />
		<Panel class="rounded-b-none" :header="request?.title" toggleable collapsed>
			{{ request?.body }}
		</Panel>
		<Toolbar class="mt-0 rounded-t-none">
			<template #start>
				<div class="col-8 md:col-8 sm:col-5 xs:col-2" style="float: right">
					<div class="p-inputgroup">
						<InputText
							v-model.lazy="searchFilters['global']"
							placeholder="Search"
							size="small"
							style="z-index: 1" />
						<!-- <Button
							type="button"
							icon="pi pi-chevron-down"
							class="p-button"
							v-tooltip="'Filter by Expertise'" /> -->
					</div>
				</div>
				<!-- <Button
				:label="state.hasChange ? 'Save' : state.isEditMode ? 'Lock' : 'Edit'"
					:icon="
						'pi pi-' +
						(state.hasChange ? 'check' : state.isEditMode ? 'lock' : 'pencil')
					"
					@click="editButtonClicked"
					:class="
						'p-button-' +
						(state.hasChange ? 'success' : state.isEditMode ? '' : 'warning')
					"
					v-tooltip="
						state.hasChange
							? 'Save Changes'
							: state.isEditMode
								? 'Lock Data'
								: 'Edit Data'
					" /> -->
			</template>
			
			<template #end>
				<div class="" style="float: right">
					<div class="p-inputgroup">
						<Button
							type="button"
							icon="pi pi-plus"
							class="p-button"
							@click="addProposal()"
							v-tooltip.left="'Add new proposal'" />
						<MultiSelect
							class="requests-multiselect p-button"
							:modelValue="visibleColumns"
							@update:modelValue="onColumnVisibilityToggle"
							:options="columns"
							optionLabel="header"
							placeholder="Select Columns"
							v-tooltip="'Show/Hide Columns'"
							style="width: 43px" />
					</div>
				</div>
			</template>
		</Toolbar>
		<div class="flex mt-3"> 
			<Panel class="w-1/2 rounded-b-none rounded-tr-none" pt:header:class="p-2">
				{{ hoveredRequestNode?.body }}
			</Panel> 
			<Panel class="w-1/2 rounded-b-none rounded-tl-none" pt:header:class="p-2">
				{{ hoveredProposal?.body }}
			</Panel> 
		</div>

		<TreeTable
			ref="treeTable"
			@mousemove="highlightColumnAndShowDescription"
			:value="rootNodes"
			v-model:selectionKeys="selectedKeys"
			:expandedKeys="expandedKeys"
			@nodeSelect="onNodeSelect"
			@nodeUnselect="onNodeUnselect"
			:filters="searchFilters"
			filterMode="lenient"
			selectionMode="single"
			:resizableColumns="true"
			:showGridlines="false"
			columnResizeMode="expand""
			:scrollable="true"
			sortMode="single"
			removableSort
			responsiveLayout="scroll"
			:scrollHeight="treeTableHeight">
			<Column field="weight" 
				header="Appeal" 
				style="width: 40px" 
				>
				<template #body="slotProps">
					<Knob
						v-model="slotProps.node.data.weight"
						:size="56"
						:min="-3"
						:max="3"
						@change="onRatingChange($event, slotProps.node)"
						class="relative w-full flex justify-center"
						:class="{ 'null-value': !slotProps.node.data.weight }" />
				</template>
			</Column>
			<Column
				style="position: relative; box-sizing: border-box;"
				class="button-column"
				headerClass="w-0"
				:sortable="false">
				<template #body="slotProps">
					<Button
						type="button"
						icon="pi pi-ellipsis-v"
						class="p-button"
						style="position: absolute;
							width: 14px;
							height: 46px;
							left: 50%;
							top: 50%;
							transform: translate(-50%, -50%);"
					/>
				</template>
			</Column>
			<Column
				field="title"
				header="Request Criteria, Benefits & Side-Effects"
				expander
				style="min-width: 45%; z-index: 1"
				>
				<template #body="slotProps">
					<div
						style="margin: -58px -8px -60px 0; min-height: 45px"
						class="show-on-hover-parent relative w-full">
						<div v-if="state.isEditMode">
							<!-- <div>
								<Editor
									v-model.lazy="slotProps.node.data.title"
									editorStyle="font-size: 14px;"
									:autoResize="true"
									@text-change="onEditorChanged"
									v-tooltip="slotProps.node.data.body" />
							</div> -->
						</div>
						<div v-else v-html="slotProps.node.data.title"
							class="w-full whitespace-normal"
							:class="'hover-parent request_node_key_' + slotProps.node.data.id">
						</div>
						<div style="font-size: 11px;
							position: absolute;
							right: 0;
							top: 50%;
							transform: translateY(-50%);">
							<span
								class="show-on-hover-child"
								style="right: 0px; padding: 5px; cursor: pointer">
							</span>
							<span
								style="padding: 5px"
								v-if="slotProps.node.children?.length"
								@click="toggleNode(slotProps.node)">
								({{ slotProps.node.children?.length }})
							</span>
						</div>
					</div>
				</template>
			</Column>

			<Column
				v-for="(col, index) of visibleColumns"
				:key="col.columnKey"
				:field="col.field"
				bodyStyle="padding: 0"
				headerClass="max-w-[100px] whitespace-normal font-light text-sm"
				:sortable="false"
				:rowEditor="false">
				<template #header>	
					<span class="hover-parent" 
						:class="'hover-parent proposal_key_' + col.columnKey">
						{{ col.header }}
					</span>
				</template>
				<template #body="slotProps">
					<div 
						:class="'hover-parent proposal_key_' + col.columnKey + ' request_node_key_' + slotProps.node.data.id"
						class="w-full" 
						style="padding: 12px;">
						<Knob
							:title="col.body"
							v-model="slotProps.node.data[col.field + '']"
							:size="56"
							:min="-3"
							:max="3"
							@change="onRatingChange($event, slotProps.node, col)"
							class="relative w-full flex justify-center"
							:class="{ 'null-value': !slotProps.node.data[col.field + ''] }" />
					</div>
				</template>

					<!-- <template #body="slotProps">
						<Vote
							class="center"
							title=""
							:user-vote="slotProps?.node.data[col.field + '']"
							:global-vote="60"
							@change="onRatingChange($event, slotProps.node, col)"
							:class="slotProps.node.data[col.field + '']" />
					</template> -->
			</Column>
			<Column>
			</Column>
		</TreeTable>
		<br />
		{{ expandedKeys }}
		<div v-if="state.isEditMode">
			<Textarea
				v-model="jsonData"
				style="
					height: 150px;
					width: 100%;
					margin-top: 200px;
					overflow: scroll;
				"></Textarea>
			<div style="position: relative; height: 200px; margin-top: 200px"></div>
		</div>
	</div>
</template>

<style scoped>
.show-on-hover-parent .show-on-hover-child {
	display: none;
}
.show-on-hover-parent:hover .show-on-hover-child {
	display: inline;
}

:deep(.p-treetable-toggler) {
	padding: 0px 22px 0px 22px;
	margin-left: 0rem;
	height: 44px !important;
}

.requests-multiselect {
	line-height: 0;
}

:deep(.null-value) .p-knob-text {
	display: none;
}

/*.ql-toolbar {
	display: none;
}
.ql-toolbar.ql-snow + .ql-container.ql-snow {
	border: none;
}*/
</style>
