<script setup lang="ts">
import type { RequestNode, Proposal } from '~~/prisma/generated/interfaces'
import type { ColumnProps } from 'primevue/column'
import type {
	TreeTableSelectionKeys,
	TreeTableExpandedKeys,
} from 'primevue/treetable'
import {
	unref,
	ref,
	reactive,
	onMounted,
	computed,
	watch,
	type Ref,
	ReactiveFlags,
} from 'vue'
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

// import { useFuse } from '@vueuse/integrations/useFuse'
import type { RatingChangeEvent } from 'primevue/rating'

// import Console from '@/components/Console.vue'
import vote from './Vote.vue'
// import ConsoleView from '@/views/ConsoleView.vue'
import { useVueConsole, str, json } from '@/methods/console'
import { useConfirm } from 'primevue/useconfirm'
import { utils } from '@/methods/utils'

// import { useToast, TYPE } from 'vue-toastification'
import treeUtils from '@/methods/treeutils'

const props = withDefaults(
	defineProps<{
		requestId: number
	}>(),
	{
		requestId: 1,
	},
)

// const { log } = useVueConsole('test', (e) => {
//   if (e == 'r') return str(rootNode.value)

//   const result = str(eval(e))
//   watch(eval(e), (e) => {
//     alert(e)
//     //log(e)
//   })
//   //alert(result.length)
//   return result
// })

// setTimeout(() => {
//   useVueConsole('test2', () => {
//     return 'test2'
//   }).log('test2-log')
// }, 3000)

//watch(useWindowSize().height, (val) => { log(val) })

import { useToast } from 'primevue/usetoast'

const toast = useToast()
const confirm = useConfirm()

function notify(title: string, content: string, severity: string = 'success') {
	//alert(content);
	toast.add({
		summary: title ? title + '<br/>' : '',
		life: 3000,
		detail: content,
	})
}

const searchFilters = ref({ global: '' })

/// State
const st = reactive({
	//show: false,
	isEditMode: false,
	hasChange: false,
	editorButtons: ['bold', 'italic', 'underline', 'link', 'color', 'background'],
	ratingControlType: ref('vote'),
	count: 0,
})

let treeTableEl: HTMLElement | null = null

onMounted(async () => {
	const res = await fetch('src/services/json/requests.json')
	const data = await res.text()
	jsonData.value = data
	//alert(3)
	//if (!rootNode.value.length) {
	//log(data)
	//debugger

	//jsonData.value = data
	//}

	setTimeout(() => (st.hasChange = false))

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
	//expertise?: string[]
	isDirty?: boolean
}

const requestNodes = ref<RequestNode[]>([])
const requestNode = ref<RequestNode>()

const jsonData = computed({
	get: () => {
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
	},
	set: newValue => {
		const parsed = JSON.parse(newValue)
		requestNodes.value = parsed?.data || [] // as RequestNode[]

		const id = props.requestId
		const node = (requestNodes.value as RequestNode[]).find(
			req => req.id === id,
		)

		if (node) requestNode.value = node

		if (requestNode.value) {
			const children = requestNode.value.children || []
			const treeNodes = utils.tree.buildTree(children)

			// Convert ITreeNode[] to TreeNodeEx[]
			rootNode.value = treeNodes as unknown as TreeNodeEx[]

			const proposals = requestNode.value.proposals
			if (proposals) {
				const cols = columnsInit.concat(
					proposals.map((p: Proposal) => mapProposalToColumn(p)),
				)
				cols.forEach(col => columns.value.push(col))
			}
		}
	},
})

let rootNode = useStorage<TreeNodeEx[]>('rootNode', [])

const selectedNode = ref<TreeNodeEx>({ key: '', data: {} })

// <button :disabled="!rootNodeHistory.canUndo" @click="rootNodeHistory.undo()">
const rootNodeHistory = useRefHistory(rootNode, {
	deep: true,
	capacity: 15,
})

const columnsInit: ProposalColumn[] = [
	{
		columnKey: '0',
		header: ' ',
		style: 'width: 1px !important;',
		class: 'button-column',
		dataType: 'button',
		sortable: false,
		frozen: true,
		body: '',
	},
	{
		columnKey: '1',
		field: 'title',
		header: 'Standards & Impacts',
		dataType: 'html',
		expander: true,
		style: 'width: 50% !important; min-width: 50% !important',
		class: 'name-column',
		frozen: true,
		body: '',
	},
	{
		columnKey: '2',
		field: 'weight',
		header: 'Appeal',
		dataType: 'vote', // 'star'
		style: 'width: 150px !important',
		class: 'weight-column',
		body: '',
		sortField: {} as ColumnFieldType,
	},
]

type ColumnFieldType = string | ((item: any) => string) | undefined

//columns.value = '{}'

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
		// selectedColumns.value.push(col)
		// selectedColumns.value = selectedColumns.value.filter(function (elem, index, self) {
		//   return index === self.indexOf(elem)
		// })
	}
}

function mapProposalToColumn(p: Proposal): ProposalColumn {
	return {
		field: 'p' + p.id,
		columnKey: 'p' + p.id,
		header: p.title,
		body: p.body,
		dataType: st.ratingControlType,
		class: 'proposal-rating key_' + p.id,
		headerClass: 'proposal-rating key_' + p.id,
	}
}

function mapColumnToProposal(p: ProposalColumn): Proposal {
	return {
		id: parseInt((p.columnKey || 'p').substring(1)),
		//requests; reqs,
		parentId: 0,
		title: p.header || '',
		body: p.body,
		avgRating: 0,
	} as Proposal
}

const visibleColumns = ref<ProposalColumn[]>(columns.value)

const selectedKeys = ref<TreeTableSelectionKeys>({})

const selectedNodes = ref<TreeNodeEx[]>([])

// A bug is preventing the argument type must be ColumnProps[] as it's supposed to
function onColumnVisibilityToggle(filteredProposals: any) {
	visibleColumns.value = columns.value.filter(col =>
		filteredProposals.includes(col),
	)
	// Make sure that the first three columns are always visible
	if (visibleColumns.value[0] !== columns.value[0]) {
		visibleColumns.value.unshift(columns.value[2]!)
		visibleColumns.value.unshift(columns.value[1]!)
		visibleColumns.value.unshift(columns.value[0]!)
	}
}

function onNodeSelect(node: TreeNodeEx) {
	selectedNode.value = node
	selectedNodes.value.push(node)
	//log(node)
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
		header: 'Delete Confirmation', // for confirm dialog
		target: event.currentTarget as HTMLElement, // for confirm popup
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
	const parent = treeUtils.traverseTreeUntil<TreeNodeEx>(rootNode, child => {
		return child === node
	})?.parent
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

	//selectedKeys.value = {}
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
		// expandedKeys.value = { ...expandedKeys.value }
	}
}

const hoveredProposal = ref({} as ProposalColumn)

const highlightColumn = utils.uiElements.delayedHover(
	(el: HTMLElement) => {
		if (el) {
			let keyClass = [...Array.from(el.classList)].find(c =>
				c.startsWith('key_'),
			)
			const key = 'p' + keyClass?.split('_').slice(-1)[0] // .dataset.key
			const treeColumn = columns.value.find(col => col.columnKey === key)

			hoveredProposal.value = treeColumn || ({} as ProposalColumn)

			const color = document.body.classList.contains('dark')
				? ['#ffffff08', '1.15']
				: ['#00000010', '0.95']
			useStyleTag(
				`td.${keyClass} { background: ${color[0]}; transition: 250ms; }
         th.${keyClass} { filter: brightness(${color[1]}); transition: 250ms; }`,
				{
					id: 'column-highlight',
				},
			)
		}
	},
	'td.proposal-rating',
	50,
)

const debounceNotify = useDebounceFn((title: any, content: any) => {
	notify(title, json(content))
}, 2000)

function onEditorChanged(e: EditorTextChangeEvent) {
	st.hasChange = true
	debounceNotify(`Text changed for goal`, json(e.delta))
}

function onProposalRateChange(e: RatingChangeEvent | number, args: any) {
	st.hasChange = true
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
				st.isEditMode = true
			},
		},
		{
			label: 'View Mode',
			icon: 'pi pi-minus',
			command: () => {
				st.isEditMode = false
			},
		},
		{
			label: st.isEditMode ? 'View Mode' : 'Edit Mode',
			icon: st.isEditMode ? 'pi pi-key' : 'pi pi-pencil',
			command: () => {
				st.isEditMode = !st.isEditMode
			},
		},
		{
			label: st.isEditMode ? 'View Mode' : 'Edit Mode',
			icon: st.isEditMode ? 'pi pi-key' : 'pi pi-pencil',
			command: () => {
				st.isEditMode = !st.isEditMode
			},
		},
	]
})

function saveData() {
	alert('Saved')
}

function editButtonClicked() {
	if (st.hasChange) {
		saveData()
		st.hasChange = false
	} else {
		st.isEditMode = !st.isEditMode
	}
}

watch(rootNode, e => {
	st.hasChange = true
})

function voteChange(e: any) {
	alert
}
</script>

<template>
	<!-- <SpeedDial
    :model="goalOperationsMenu"
    :radius="60"
    direction="right"
    type="semi-circle"
    style="z-index: 10000"
  /> -->
	<ConfirmPopup></ConfirmPopup>
	<ConfirmDialog></ConfirmDialog>
	<Toast style="opacity: 0.9" />
	<!-- <Dialog title="test" content="test"></Dialog> -->
	<br />
	<div style="margin: 15px">
		<span style="margin: 10px 40px; position: absolute; font-size: 12px">
			Id: {{ requestId }} Data: {{ jsonData }}
		</span>
		<div style="position: absolute; right: 0; top: -3px"></div>
	</div>
	<Toolbar>
		<template #start>
			<div class="col-8 md:col-8 sm:col-5 xs:col-2" style="float: right">
				<div class="p-inputgroup">
					<!-- <Button class="p-button p-input-icon-left" disabled>
            <i class="pi pi-search"></i>
          </Button> -->
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

			<!-- <Button label="New" icon="pi pi-plus" class="mr-2" />
      <Button label="Upload" icon="pi pi-upload" class="p-button-success" />
      <i class="pi pi-bars p-toolbar-separator mr-2" /> -->
			<Button
				:label="st.hasChange ? 'Save' : st.isEditMode ? 'Lock' : 'Edit'"
				:icon="
					'pi pi-' +
					(st.hasChange ? 'check' : st.isEditMode ? 'lock' : 'pencil')
				"
				@click="editButtonClicked"
				:class="
					'p-button-' +
					(st.hasChange ? 'success' : st.isEditMode ? '' : 'warning')
				"
				v-tooltip="
					st.hasChange
						? 'Save Changes'
						: st.isEditMode
							? 'Lock Data'
							: 'Edit Data'
				" />
		</template>

		<template #end>
			<!-- <Button icon="pi pi-search" class="mr-2" />
      <Button icon="pi pi-calendar" class="p-button-success mr-2" />
      <Button icon="pi pi-times" class="p-button-danger" /> -->
			<!-- <ToggleButton
        v-model="st.isEditMode"
        onIcon="pi pi-times"
        offIcon="pi pi-check"
        style="height: 43px"
      /> -->

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
						:options="columns"
						@update:modelValue="onColumnVisibilityToggle"
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
		@mouseout="highlightColumn"
		:value="rootNode"
		:selectionMode="st.isEditMode ? 'checkbox' : 'multiple'"
		v-model:selectionKeys="selectedKeys"
		:expandedKeys="expandedKeys"
		@nodeSelect="onNodeSelect"
		@nodeUnselect="onNodeUnselect"
		:filters="searchFilters"
		filterMode="lenient"
		:resizableColumns="true"
		:showGridlines="false"
		columnResizeMode="expand"
		:scrollable="true"
		sortMode="single"
		removableSort
		responsiveLayout="scroll"
		:scrollHeight="treeTableHeight">
		<!--  -->
		<!-- style="height: calc(100vh - 180px)" -->
		<!-- scrollDirection="both" -->
		<template #header style="padding: 0">
			<Splitter style="height: 300px">
				<SplitterPanel
					class="flex align-items-center justify-content-center"
					:size="20"
					:minSize="10">
					Panel 1
				</SplitterPanel>
				<Splitter style="height: 85px">
					<SplitterPanel>
						<Editor
							v-model="selectedNode.data.content"
							editorStyle="height: 80px; font-size: 14px;"
							:autoResize="true" />
						<!-- <template #toolbar v-if="st.treeCheckboxes" v-for="button of st.editorButtons">
              <span class="ql-formats">
                <button class="ql-{{ button }}"></button>
              </span>
          </template>-->
					</SplitterPanel>
					<SplitterPanel>
						<!-- <Textarea v-model="proposalIndex" style="width: 100%; height: 100%" readonly /> -->
						<Editor
							:readonly="true"
							v-model="hoveredProposal.body"
							editorStyle="height: 80px; font-size: 14px;"
							:autoResize="true" />
					</SplitterPanel>
				</Splitter>
			</Splitter>
		</template>
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
			:headerStyle="col.bodyStyle"
			:bodyStyle="col.bodyStyle"
			:style="col.style"
			:sortable="col.sortable != undefined ? col.sortable : true"
			:rowEditor="true">
			<template #header="slotProps" v-if="col.dataType == 'button'">
				<!-- <Button type="button" icon="pi pi-cog" class="p-button"></Button> -->
			</template>

			<template #header="slotProps" v-else-if="col.class == 'name-column'">
				<!-- <SplitButton
          @click="addNode"
          :model="mainSplitButtonItems"
          type="button"
          icon="pi pi-plus"
          class="p-button-warning"
          v-tooltip="'Add new goal'"
          style="
            height: 35px;
            margin: -4px;
            top: 8px;
            left: 8px;
            position: absolute;
          "
        ></SplitButton> -->
			</template>

			<template #body="slotProps" v-if="col.dataType == 'button'">
				<Button
					type="button"
					icon="pi pi-ellipsis-v"
					class="p-button"
					style=""></Button>
				<!-- <SpeedDial
          :model="goalOperationsMenu"
          :radius="60"
          direction="right"
          type="semi-circle"
          button-class="small-button"
        /> -->
			</template>

			<template #body="slotProps" v-if="col.dataType == 'html'">
				<div
					style="width: 100%; margin: -58px -8px -60px 0; min-height: 45px"
					class="show-on-hover-parent">
					<div v-if="st.isEditMode">
						<div>
							<Editor
								v-model.lazy="slotProps.node.data[col.field + '']"
								editorStyle="font-size: 14px;"
								:autoResize="true"
								@text-change="onEditorChanged"
								v-tooltip="slotProps.node.data.content" />
						</div>
					</div>
					<span v-else v-html="slotProps.node.data[col.field + '']"> </span>
					<div class="node-count">
						<span
							class="show-on-hover-child"
							style="right: 0px; padding: 5px; cursor: pointer">
							<!-- @click="addNode" -->

							<!-- deleteNode(slotProps.node) -->
						</span>
						<span
							style="padding: 5px"
							v-if="slotProps.node.children"
							@click="toggleNode(slotProps.node, undefined, true)">
							({{ slotProps.node.children?.length }})
						</span>
					</div>

					<!-- <span
            v-else
            v-html="json(slotProps, -1)"
            style="display: inline-block"
          ></span> -->
				</div>
			</template>

			<template #body="slotProps" v-else-if="col.dataType == 'star'">
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
					@change="voteChange($event)"
					:class="slotProps.node.data[col.field + '']" />
				<!--  :title="slotProps.node.data[col.field]" -->
			</template>

			<template #body="slotProps" v-else-if="col.dataType == 'slider'">
				<Slider
					v-model="slotProps.node.data[col.field + '']"
					:step="1"
					:min="-5"
					:max="5" />
			</template>
		</Column>
	</TreeTable>
	<!-- <InputText type="text" v-model="st.ratingType" ></InputText> -->

	<br />
	<div v-if="st.isEditMode">
		<Textarea
			v-model="jsonData"
			style="
				height: 150px;
				width: 100%;
				margin-top: 200px;
				overflow: scroll;
			"></Textarea>
		<div style="position: relative; height: 200px; margin-top: 200px">
			<!-- <ConsoleView channelNames="test"></ConsoleView> -->
		</div>
	</div>
</template>

<style scoped lang="scss">
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
/*.p-editor-container .p-editor-content .ql-editor {
  background: transparent !important;
}*/
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

.p-treetable-header {
	padding: 0;
	background-color: #111;
}
.p-treetable tr.p-highlight {
	background: #ffffffcc !important;
	color: #111 !important;
	/* background: #ffffff22 !important;
  color: #fff !important; */
}

/** Prevent hover highlight on frozen columns */
.p-treetable-scrollable td.p-frozen-column {
	background: unset !important;
}
.p-treetable .p-sortable-column:not(.p-highlight):hover {
	background: unset !important;
	color: unset !important;
}

.p-treetable tr.p-highlight .ql-editor {
	background: transparent !important;
	color: #181818 !important;
}

.p-treetable tr .ql-editor {
	background: transparent !important;
}

/*.p-treetable tr.p-highlight .p-rating .p-rating-icon {
  color: #2b6893;
}
.p-treetable tr.p-highlight .p-knob-text {
  color: #2b6893;
}*/
:root .p-highlight {
	--text-color-secondary: #111;
}
.p-treetable.p-treetable-sm .p-treetable-thead > tr > th {
	/*background: #2a323df5 !important;*/
	text-align: center;
	display: inline-block;
}

/*.p-treetable .p-treetable-thead > tr > th {
  box-shadow: 10px 5px 0px rgba(0, 0, 0, 0.1);
}

.p-treetable .p-treetable-thead > tr > th:hover {
  background: #323c49 !important;
}*/

.p-treetable .p-treetable-thead button.p-button:first-child {
	margin-right: 18px;
}
.center {
	display: flex;
	justify-content: center;
	align-items: center;
}
/*.button-column > span {
  display: none;
}*/
.knob.null-value text {
	display: none;
}
.highlight {
	background: red !important;
}

.p-sortable-column-icon {
	margin-left: -0.17rem !important;
}
.p-sortable-column-icon::before {
	font-size: 0.55rem;
	float: right;
}
.p-column-title {
	font-size: 15px;
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

/* First column */
.goals-treetable .p-treetable-tbody td:nth-child(1),
.goals-treetable th:nth-child(1) {
	width: 34px !important;
	max-width: 34px !important;
	padding-left: 4px;
	display: block !important;
}
/* Tree menu button */
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
