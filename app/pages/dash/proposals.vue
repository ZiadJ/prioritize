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

import vote from '~/components/proposal/Vote.vue'
import { useVueConsole, str, json } from '@/methods/console'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useRoute } from 'vue-router'
import { utils } from '@/methods/utils'
import { useNuxtApp } from '#app'

const route = useRoute()
const toast = useToast()
const confirm = useConfirm()

const requestId = computed(() => {
	const id = Number(route.params.id) ?? 1
	return isNaN(id) ? 1 : id
})

function notify(title: string, content: string, severity: string = 'success') {
	toast.add({
		summary: title ? title + '<br/>' : '',
		life: 3000,
		detail: content,
	})
}

const searchFilters = ref({ global: '' })

/// State
const state = reactive({
	isEditMode: false,
	hasChange: false,
	editorButtons: ['bold', 'italic', 'underline', 'link', 'color', 'background'],
	ratingControlType: ref('vote'),
	count: 0,
})

let treeTableEl: HTMLElement | null = null

onMounted(async () => {
	const { $trpcClient } = useNuxtApp()

	// const requestId = parseInt(route.params.id as string)
	const request = await $trpcClient.requests.byId.query({ id: requestId.value })

	if (request) setRequestNodes(request as unknown as Request)

	setTimeout(() => (state.hasChange = false))

	treeTableEl = document.querySelector('.goals-treetable') as HTMLElement
})

const wiindowHeight = useWindowSize()
const windowScrollHeight = useWindowSize().height
const treeTableHeight = computed<string>(() => {
	if (treeTableEl) {
		const treeTableTop = treeTableEl.getBoundingClientRect().top
		const height =
			(wiindowHeight.height.value - treeTableTop + 15).toFixed() + 'px'
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

const requestNodes = ref<RequestNode[]>([])
const requestNode = ref<RequestNode>()

const jsonData = computed(() => {
	return json(
		{
			data: [
				{
					requestNodes: rootNode.value,
					proposalNodes: columns.value
						.splice(columnsInit.length)
						.map(col => mapColumnToProposal(col)),
				},
			],
		},
		2,
	)
})

function setRequestNodes(request: Request) {
	// requestNodes.value = request.requestNodes
	// const node = requestNodes.find(req => req.id === id)

	// if (node) requestNode.value = node

	//if (requestNode.value) {
	// const children = requestNode.value.children || []
	const treeNodes = utils.tree.buildTree(request.requestNodes ?? [])

	rootNode.value = treeNodes as unknown as TreeNodeEx[]

	const proposals = request.proposals
	if (proposals) {
		const cols = columnsInit.concat(
			proposals.map((p: Proposal) => mapProposalToColumn(p)),
		)
		cols.forEach(col => columns.value.push(col))
	}
	//}
}

let rootNode = useStorage<TreeNodeEx[]>('rootNode', [])

const selectedNode = ref<TreeNodeEx>({ key: '', data: {} })

const rootNodeHistory = useRefHistory(rootNode, {
	deep: true,
	capacity: 15,
})

const columnsInit: ProposalColumn[] = [
	// {
	// 	columnKey: '0',
	// 	header: ' ',
	// 	style: 'width: 1px !important;',
	// 	class: 'button-column',
	// 	dataType: 'button',
	// 	sortable: false,
	// 	frozen: true,
	// 	body: '',
	// },
	// {
	// 	columnKey: '1',
	// 	field: 'title',
	// 	header: 'Standards & Impacts',
	// 	dataType: 'html',
	// 	expander: true,
	// 	style: 'width: 50% !important; min-width: 50% !important',
	// 	class: 'name-column',
	// 	frozen: true,
	// 	body: '',
	// },
	// {
	// 	columnKey: '2',
	// 	field: 'weight',
	// 	header: 'Appeal',
	// 	dataType: 'vote',
	// 	style: 'width: 150px !important',
	// 	class: 'weight-column',
	// 	body: '',
	// 	sortField: {} as ColumnFieldType,
	// },
]

type ColumnFieldType = string | ((item: any) => string) | undefined

const columns = ref<ProposalColumn[]>([])

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

function mapProposalToColumn(p: Proposal): ProposalColumn {
	return {
		field: 'p' + p.id,
		columnKey: 'p' + p.id,
		header: p.title,
		body: p.body,
		dataType: state.ratingControlType,
		class: 'proposal-rating key_' + p.id,
		// headerClass: 'proposal-rating key_' + p.id, // prop class applies to the header already
	}
}

function mapColumnToProposal(p: ProposalColumn): Proposal {
	return {
		id: parseInt((p.columnKey || 'p').substring(1)),
		parentId: 0,
		title: p.header || '',
		body: p.body,
		avgRating: 0,
	} as Proposal
}

const visibleColumns = ref<ProposalColumn[]>(columns.value)

const selectedKeys = ref<TreeTableSelectionKeys>({})

const selectedNodes = ref<TreeNodeEx[]>([])

function onColumnVisibilityToggle(filteredProposals: any) {
	visibleColumns.value = columns.value.filter(col =>
		filteredProposals.includes(col),
	)
	if (visibleColumns.value[0] !== columns.value[0]) {
		visibleColumns.value.unshift(columns.value[2]!)
		visibleColumns.value.unshift(columns.value[1]!)
		visibleColumns.value.unshift(columns.value[0]!)
	}
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
	let parentArray = getParentArray(rootNode.value, node)

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

const addNode = (event: MouseEvent) => {
	if (!selectedNode.value && rootNode.value.length > 0) {
		selectedNode.value = rootNode.value[0]!
	}

	const newKey = (-Date.now()).toString()

	const title = prompt('Add Node', 'Enter a name for the new node')

	const newNode: TreeNodeEx = {
		key: newKey,
		data: {
			title: title || 'New goal item',
			content: 'New content',
		},
	}

	if (!selectedNode.value.children) {
		selectedNode.value.children = [newNode]
	} else {
		selectedNode.value.children.push(newNode)
	}

	toggleNode(selectedNode.value, true, true)

	selectedKeys.value[newKey] = true
}

const expandedKeys = ref<TreeTableExpandedKeys>({})

function toggleNode(
	node: TreeNodeEx,
	expand: boolean | null = null,
	explandChildren: boolean | null = null,
) {
	if (!node) node = selectedNode.value

	if (node.key != null) {
		if (expand == null) expand = !expandedKeys.value[node.key]

		if (!expand) {
			delete expandedKeys.value[node.key]
		} else {
			if (node.children?.length) {
				expandedKeys.value[node.key] = true

				if (explandChildren)
					for (let child of node.children as TreeNodeEx[])
						toggleNode(child, explandChildren, expand)
			}
		}
	}
}

const hoveredProposal = ref<ProposalColumn | undefined>()

const highlightColumn = utils.uiElements.delayedHover(
	(el: HTMLElement) => {
		if (el) {
			let keyClass = [...Array.from(el.classList)].find(c =>
				c.startsWith('key_'),
			)

			const color = document.documentElement.classList.contains('dark')
				? '#ffffff08'
				: '#00000010'
			const styleContent = `
				td.${keyClass} { background: ${color}; transition: background 250ms; }
				th.${keyClass} { background: ${color}; transition: background 250ms; }
			`
			useStyleTag(styleContent,	{	id: 'proposal-column-highlight'})

			const key = 'p' + keyClass?.split('_')[1]
			hoveredProposal.value = columns.value.find(col => col.columnKey === key)
		}
	},
	'.proposal-rating',
	50,
)

const debounceNotify = useDebounceFn((title: any, content: any) => {
	notify(title, json(content))
}, 2000)

function onEditorChanged(e: EditorTextChangeEvent) {
	state.hasChange = true
	debounceNotify(`Text changed for goal`, json(e.delta))
}

function onProposalRateChange(e: RatingChangeEvent | number, args: any) {
	state.hasChange = true
	debounceNotify(
		'Rating changed',
		`${typeof e == 'number' ? e : e.value} for goal ${args.key}`,
	)
}

const goalOperationsMenu = computed(() => {
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
		},
		{
			label: state.isEditMode ? 'View Mode' : 'Edit Mode',
			icon: state.isEditMode ? 'pi pi-key' : 'pi pi-pencil',
			command: () => {
				state.isEditMode = !state.isEditMode
			},
		},
	]
})

function saveData() {
	alert('Saved')
}

function editButtonClicked() {
	if (state.hasChange) {
		saveData()
		state.hasChange = false
	} else {
		state.isEditMode = !state.isEditMode
	}
}

watch(rootNode, e => {
	state.hasChange = true
})
</script>

<template>
	<div>
		<ConfirmPopup></ConfirmPopup>
		<ConfirmDialog></ConfirmDialog>
		<Toast style="opacity: 0.9" />
		<br />
		<!-- <div style="margin: 15px">
			<span style="margin: 10px 40px; position: absolute; font-size: 12px">
				Id: {{ requestId }} Data: {{ jsonData }}
			</span>
			<div style="position: absolute; right: 0; top: -3px"></div>
		</div> -->
		<Toolbar>
			<template #start>
				<div class="col-8 md:col-8 sm:col-5 xs:col-2" style="float: right">
					<div class="p-inputgroup">
						<InputText
							v-model.lazy="searchFilters['global']"
							placeholder="Search"
							size="small"
							style="z-index: 1" />
						<Button
							type="button"
							icon="pi pi-chevron-down"
							class="p-button"
							v-tooltip="'Filter by Expertise'" />
					</div>
				</div>
				<Button
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
					" />
				<div class="p-3">{{ hoveredProposal?.body }}</div>
			</template>

			<template #end>
				<div class="" style="float: right">
					<div class="p-inputgroup">
						<Button type="button" label="Proposals" class="p-button" />
						<Button
							type="button"
							icon="pi pi-plus"
							class="p-button"
							@click="addProposal()"
							v-tooltip="'Add new proposal'" />
						<MultiSelect
							panelClass="goals-multiselect-panel"
							class="goals-multiselect p-button p-component"
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
		<TreeTable
			class="goals-treetable p-treetable p-treetable-sm"
			@mousemove="highlightColumn"
			:value="rootNode"
			:selectionMode="state.isEditMode ? 'checkbox' : 'multiple'"
			v-model:selectionKeys="selectedKeys"
			:expandedKeys="expandedKeys"
			@nodeSelect="onNodeSelect"
			@nodeUnselect="onNodeUnselect"
			:filters="searchFilters"
			filterMode="lenient"
			:resizableColumns="true"
			:showGridlines="false"
			columnResizeMode="expand""
			:scrollable="true"
			sortMode="single"
			removableSort
			responsiveLayout="scroll"
			:scrollHeight="treeTableHeight">
			<Column
				style="width: 30px !important; max-width: 30px !important; min-width: 30px !important; box-sizing: border-box;"
				headerStyle="width: 30px !important; max-width: 30px !important; min-width: 30px !important;"
				class="button-column"
				:sortable="false"
				:frozen="true">
				<template #body="slotProps">
					<Button
						type="button"
						icon="pi pi-ellipsis-v"
						class="p-button"
						style=""></Button>
				</template>
			</Column>
			<Column
				field="title"
				header="Criteria & Impacts"
				expander
				style="min-width: 50%; z-index: 1"
				class="name-column"
				frozen>
				<template #body="slotProps">
					<div
						style="width: 100%; margin: -58px -8px -60px 0; min-height: 45px"
						class="show-on-hover-parent">
						<div v-if="state.isEditMode">
							<div>
								<Editor
									v-model.lazy="slotProps.node.data['title']"
									editorStyle="font-size: 14px;"
									:autoResize="true"
									@text-change="onEditorChanged"
									v-tooltip="slotProps.node.data.content" />
							</div>
						</div>
						<span v-else v-html="slotProps.node.data['title']"> </span>
						<div class="node-count">
							<span
								class="show-on-hover-child"
								style="right: 0px; padding: 5px; cursor: pointer">
							</span>
							<span
								style="padding: 5px"
								v-if="slotProps.node.children?.length"
								@click="toggleNode(slotProps.node, undefined, true)">
								({{ slotProps.node.children?.length }})
							</span>
						</div>
					</div>
				</template>
			</Column>
			<Column
				v-for="(col, index) of visibleColumns"
				:key="col.columnKey"
				:frozen="col.frozen"
				:field="col.field"
				:header="col.header"
				:expander="col.expander"
				:headerClass="col.headerClass"
				:bodyClass="col.bodyClass"
				:class="col.class"
				headerStyle="max-width: 100px"
				:bodyStyle="col.bodyStyle"
				:style="col.style"
				:sortable="col.sortable != undefined ? col.sortable : true"
				:rowEditor="true">
				<template #body="slotProps" v-if="col.dataType == 'star'">
					<Rating
						class="slider"
						v-model.number="slotProps.node.data[col.field + '']"
						:cancel="false"
						@change="onProposalRateChange($event, slotProps.node)"
						style="white-space: pre; transform: scale(0.75)" />
				</template>

				<template #body="slotProps" v-else-if="col.dataType == 'vote'">
					<Knob
						:title="col.body"
						v-model="slotProps.node.data[col.field + '']"
						:step="1"
						:size="50"
						:min="-4"
						:max="4"
						@change="onProposalRateChange($event, slotProps.node)"
						class="knob"
						:class="{ 'null-value': !slotProps.node.data[col.field + ''] }" />
				</template>

				<template #body="slotProps" v-else-if="col.dataType == 'vote1'">
					<vote
						class="center"
						title=""
						:user-vote="slotProps?.node.data[col.field + '']"
						:global-vote="60"
						@change="onProposalRateChange($event, slotProps.node)"
						:class="slotProps.node.data[col.field + '']" />
				</template>

				<template #body="slotProps" v-else-if="col.dataType == 'slider'">
					<Slider
						v-model="slotProps.node.data[col.field + '']"
						:step="1"
						:min="-5"
						:max="5" />
				</template>
			</Column>
			<Column>
			</Column>
		</TreeTable>
		<br />
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
	</div><ClientOnly>aa
	    <div class="card">
        <Editor v-model="jsonData" editorStyle="height: 320px" />
    </div></ClientOnly>
</template>

<style scoped>
.knob,
.slider {
	width: 100%;
	text-align: center;
	margin: -5px 0px -15px 0;
}

.show-on-hover-parent .show-on-hover-child {
	display: none;
}
.show-on-hover-parent:hover .show-on-hover-child {
	display: inline;
}
</style>

<style>
.ql-toolbar {
	display: none;
}
.ql-toolbar.ql-snow + .ql-container.ql-snow {
	border: none;
}
.p-treetable .node-count {
	font-size: 11px;
	position: absolute;
	right: 0;
	top: 50%;
	transform: translateY(-50%);
}
.p-treetable .p-treetable-header {
	padding: 0 !important;
}

.p-treetable.p-treetable-sm .p-treetable-thead > tr > th {
  text-align: center;
 }

.p-treetable .p-treetable-thead button.p-button:first-child {
	margin-right: 18px;
}
.small-button {
	z-index: 10000;
	height: 2rem;
	width: 2rem;
}
.goals-treetable .p-treetable-toggler {
	padding: 0px 22px 0px 22px;
	margin-left: 0rem;
	height: 44px !important;
}
.goals-treetable .p-treetable-tbody td:nth-child(1) button {
  position: absolute;
  width: 23px;
  height: 46px;
  top: 50%;
  transform: translateY(-50%);
}
.goals-treetable .p-treetable-tbody td:nth-child(1) {
	cursor: n-resize;
}
.goals-treetable .p-treetable-tbody th,
.goals-treetable .p-treetable-tbody td {
  left: 0 !important;
}
.goals-multiselect-panel li.p-multiselect-item:nth-child(1),
.goals-multiselect-panel li.p-multiselect-item:nth-child(2),
.goals-multiselect-panel li.p-multiselect-item:nth-child(3) {
	display: none;
}
.goals-multiselect {
	line-height: 0;
	min-width: unset !important;
}
.goals-multiselect .p-multiselect-label-container {
	display: none;
}
.dark .p-button .p-multiselect-trigger span {
	color: black;
}
.p-button .p-multiselect-trigger span {
	color: white;
}
.p-button .p-multiselect-trigger {
	width: 100%;
	height: 100%;
}
td.weight-column {
	border-right: 1px solid #ffffff30;
}
</style>
