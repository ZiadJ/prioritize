<script setup lang="ts">
import type {
	RequestNode,
	Proposal,
	Request,
} from '~~/prisma/generated/interfaces'
import type {
	TreeTableSelectionKeys,
	TreeTableExpandedKeys,
} from 'primevue/treetable'
import { ref, reactive, onMounted, computed, type Ref } from 'vue'
import {
	useWindowSize,
	useStyleTag,
} from '@vueuse/core'

import Feedback from '@/components/proposal/Feedback.vue'
import ProposalFormDialog from '@/components/proposal/ProposalFormDialog.vue'
import RequestNodeFormDialog from '@/components/requestNode/RequestNodeFormDialog.vue'
import { useTreeDragAndDrop } from '@/composables/useTreeDragAndDrop'
import { useProposalColumns, type ProposalColumn } from '@/composables/useProposalColumns'
import { useRequestNodes, type TreeNodeEx } from '@/composables/useRequestNodes'

import { json } from '@/methods/console'
import { useRoute } from 'vue-router'
import { utils } from '@/methods/utils'
import { useNuxtApp } from '#app'

const { data: session } = useAuth()
const route = useRoute()

const state = reactive({
	isEditMode: false,
	hasChange: false,
	editorButtons: ['bold', 'italic', 'underline', 'link', 'color', 'background'],
	ratingControlType: ref('vote'),
	count: 0,
})

const searchFilters = ref({ global: '' })

const treeTable = useTemplateRef('treeTable')

const rootNodes = ref<TreeNodeEx[]>([])

const selectedNode = ref<TreeNodeEx>()
const selectedNodes = ref<TreeNodeEx[]>([])

const selectedKeys = ref<TreeTableSelectionKeys>({})
const expandedKeys = ref<TreeTableExpandedKeys>({})

const {
	landingNode,
	landingPosition,
	handleDragStart,
	handleDragOver,
	handleDragLeave,
	handleDrop,
} = useTreeDragAndDrop(rootNodes, expandedKeys)

const { $trpcClient } = useNuxtApp()
const request = await $trpcClient.requests.byId.query({ id: Number(route.params.id) })

const {
	columns,
	visibleColumns,
	formDialogVisible: proposalFormDialogVisible,
	formSaving: proposalFormSaving,
	formData: proposalFormData,
	isEditMode: proposalFormEditMode,
	openCreateForm: openCreateProposalForm,
	addProposal,
	removeProposal,
	renameProposal,
	saveProposalEdit,
	onColumnVisibilityToggle,
} = useProposalColumns(
	Number(route.params.id),
	request?.proposals as Proposal[] ?? [],
)

const {
	menuRef: nodeMenuRef,
	menuItems: nodeMenuItems,
	toggleMenu: toggleNodeMenu,
	formDialogVisible: nodeFormDialogVisible,
	formSaving: nodeFormSaving,
	formEditMode: nodeFormEditMode,
	formData: nodeFormData,
	openCreateForm,
	saveForm: saveNodeForm,
	deleteNode,
	toggleNode,
} = useRequestNodes(rootNodes, selectedKeys, expandedKeys, Number(route.params.id))

function setRequestNodes(request: Request) {
	const treeNodes = utils.tree.buildTree(request.requestNodes ?? [])
	rootNodes.value = treeNodes as TreeNodeEx[]
}

onMounted(async () => {
	if (request) setRequestNodes(request as unknown as Request)
})

const windowHeight = useWindowSize()
const treeTableHeight = computed<string>(() => {
	if (treeTable.value) {
		const treeTableTop = (treeTable.value as any).$el.getBoundingClientRect().top
		const height =
			(windowHeight.height.value - treeTableTop + 15).toFixed() + 'px'
		return height
	} else return '500px'
})

const jsonData = computed(() => {
	return json(
		{
			data: [
				{
					requestNodes: rootNodes.value,
				},
			],
		},
		2,
	)
})

function onNodeSelect(node: TreeNodeEx) {
	selectedNode.value = node
	selectedNodes.value.push(node)
}

function onNodeUnselect(node: any) {
	selectedNodes.value = selectedNodes.value.filter(
		({ key }) => key !== node.key,
	)
}

const hoveredProposal = ref<ProposalColumn | undefined>()
const hoveredRequestNode = ref<RequestNode | undefined>()

const highlightColumnAndShowDescription = utils.uiElements.delayedHover(
	(el: HTMLElement) => {
		if (el) {
			const infoEl = el.querySelector('.hover-info')
			if (infoEl) {
				const requestNodeKeyClass = Array.from(infoEl.classList).find(c => c.startsWith('request_node_key_'))

				if (requestNodeKeyClass) {
					const requestNodeKey = requestNodeKeyClass?.split('_').at(-1)
					const findInTree = (nodes: TreeNodeEx[]): any => {
						for (const n of nodes) {
							if (n.key === requestNodeKey || String(n.data?.id) === requestNodeKey) return n.data
							if (n.children?.length) {
								const found = findInTree(n.children as TreeNodeEx[])
								if (found) return found
							}
						}
					}
					hoveredRequestNode.value = findInTree(rootNodes.value)
						?? request?.requestNodes?.find(node => node.id.toString() === requestNodeKey)
				}

				const proposalKeyClass = Array.from(infoEl.classList).find(c => c.startsWith('proposal_key_'))

				if (proposalKeyClass) {
					const color = document.documentElement.classList.contains('dark')
						? '#ffffff08'
						: '#00000010'
					const styleContent = `
						:is(td, th):has(.${proposalKeyClass}) { background: ${color}; transition: background 250ms; }
					`
					useStyleTag(styleContent, { id: 'proposal-column-highlight' })

					const proposalKey = proposalKeyClass.split('_').at(-1)
					hoveredProposal.value = columns.value.find(col => col.columnKey === proposalKey)
				}
			}
		}
	},
	'td, th',
	25,
)
</script>

<template>
	<div>
		<ConfirmDialog group="nodeDelete"></ConfirmDialog>
		<Menu ref="nodeMenuRef" :model="nodeMenuItems" :popup="true" />
		<Toast style="opacity: 0.9" />
		<ProposalFormDialog
			v-model:visible="proposalFormDialogVisible"
			v-model:form="proposalFormData"
			:saving="proposalFormSaving"
			:editMode="proposalFormEditMode"
			@save="proposalFormEditMode ? saveProposalEdit() : addProposal()" />
		<RequestNodeFormDialog
			v-model:visible="nodeFormDialogVisible"
			v-model:form="nodeFormData"
			:saving="nodeFormSaving"
			:editMode="nodeFormEditMode"
			@save="saveNodeForm" />
		<Panel class="rounded-b-none" :header="request?.title" toggleable collapsed>
			{{ request?.body }}
		</Panel>
		<Toolbar class="mt-0 rounded-t-none">
			<template #start>
				<div class="col-8 md:col-8 sm:col-5 xs:col-2" style="float: right">
					<div class="p-inputgroup">
						<InputText
							v-if="rootNodes.length"
							v-model.lazy="searchFilters['global']"
							placeholder="Search"
							size="small"
							style="z-index: 1" />
						<Button
							v-else
							type="button"
							label="Add request node"
							icon="pi pi-plus"
							severity="info"
							outlined
							@click="openCreateForm()" />
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
					<div 
						v-if="rootNodes.length"
						class="p-inputgroup">
						<Button	
							type="button"
							icon="pi pi-plus"
							class="p-button"
							@click="openCreateProposalForm"
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
			<Panel 
				v-tooltip="'Highlighted request node description'"
				class="w-1/2 rounded-b-none rounded-tr-none" 
				pt:header:class="p-2" 
				pt:content:class="h-[5rem] overflow-y-auto">
				<Transition name="fade" mode="out-in">
					<p :key="hoveredRequestNode?.body">
						{{ hoveredRequestNode?.body }}
					</p>
				</Transition>
			</Panel> 
			<Panel 
				v-tooltip="'Highlighted proposal description'"
				class="w-1/2 rounded-b-none rounded-tl-none" 
				pt:header:class="p-2" 
				pt:content:class="h-[5rem] overflow-y-auto">
				<Transition name="fade" mode="out-in">
					<p :key="hoveredProposal?.body">
						{{ hoveredProposal?.body }}
					</p>
				</Transition>
			</Panel> 
		</div>

		<TreeTable
			ref="treeTable"
			@mousemove="highlightColumnAndShowDescription"
			@mouseout="highlightColumnAndShowDescription"
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
			columnResizeMode="expand"
			:scrollable="true"
			responsiveLayout="scroll"
			:scrollHeight="treeTableHeight">
			<Column field="rating" 
				header="Value" 
				class="w-[40px]" 
				>
				<template #body="{ node }">
					<div 
						:class="'w-full hover-info request_node_key_' + node.data.id">
						<Feedback 
							v-if="!node.children?.length"
							v-model="node.data.feedback"
							:requestNodeId="node.data.id"
							:proposalId="null"
							:userId="session?.user.id!"
							:max="3"
							parentSelector="td" />
					</div>
				</template>
			</Column>
			<Column
				class="relative"
				headerClass="w-0 p-0"
				bodyClass="p-0"
				:sortable="false">
				<template #body="{ node }">
					<div
						:class="
							landingNode?.key === node.key
								? 'tree-drag-over-' + landingPosition
								: ''
						"
						class="absolute !inset-0">
						<Button
							:draggable="true"
							@dragstart="(e) => handleDragStart(e, node)"
							@dragover="(e) => handleDragOver(e, node)"
							@drop="(e) => handleDrop(e, node)"
							@dragleave="handleDragLeave"
							type="button"
							icon="pi pi-ellipsis-v"
							class="absolute !w-[14px] h-[46px] inset-0 m-auto"
							@click="(e) => toggleNodeMenu(e, node)"
						/>
					</div>
				</template>
			</Column>
			<Column
				field="title"
				header="Request Criteria, Benefits & Side-Effects"
				expander
				class="min-w-[45%] z-[1]"
				>
				<template #body="{ node }">
					<div
            :class="
							'hover-info request_node_key_' + node.data.id + ' ' +
              (landingNode?.key === node.key
                ? 'tree-drag-over-' + landingPosition
                : '')
            "
						class="show-on-hover-parent relative w-full">
						<div v-html="node.data.title"
							class="w-full !whitespace-normal"
						></div>
						<div class="absolute right-0 top-1/2 -translate-y-1/2 text-[11px]">
								<span
										class="show-on-hover-child absolute right-0 p-[5px] cursor-pointer">
								</span>
								<span
										class="p-[5px]"
										v-if="node.children?.length"
										@click="toggleNode(node)">
										({{ node.children?.length }})
								</span>
						</div>
					</div>
				</template>
			</Column>

			<Column
				v-for="(col, index) of visibleColumns"
				:key="col.columnKey"
				:field="col.field"
				bodyClass="!p-0"
				headerClass="relative group max-w-[100px] font-light text-sm !whitespace-normal"
				:sortable="false"
				:rowEditor="false">
				<template #header>
					<div 
						class="w-full cursor-pointer"
						:class="'hover-info proposal_key_' + col.columnKey">
						<div class="!whitespace-normal"
							@click="renameProposal(col)"
							v-tooltip="'Click to edit'">
							{{ col.header }}
						</div>
					</div>						
					<span v-if="col.isLoading" class="pi pi-spin pi-spinner text-xs ml-1" />
					<Button
						v-else
						icon="pi pi-times"
						class="delete-proposal-btn absolute top-1 right-1 !w-[1rem] !h-[1rem] opacity-0 group-hover:opacity-100 transition-opacity duration-150"
						severity="danger"
						rounded
						@click.stop="removeProposal(col, $event)"
						v-tooltip.left="'Delete proposal'" />
				</template>
				<template #body="{ node }">
					<div 
						:class="'hover-info request_node_key_' + node.data.id + ' proposal_key_' + col.columnKey"
						class="w-full">
						<Feedback 
							v-if="!node.children?.length"
							v-model="node.data.feedback"
							:requestNodeId="node.data.id"
							:proposalId="col.id!"
							:userId="session?.user.id!"
							:max="3"
							parentSelector="td" />
					</div>
				</template>
			</Column>
			<Column>
			</Column>
		</TreeTable>
		<br />
		<!-- {{ expandedKeys }} -->
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

.requests-multiselect {
	line-height: 0;
}

.delete-proposal-btn :deep(.p-button-icon) {
	font-size: 0.5rem;
}


:deep(.p-treetable-toggler) {
	padding: 0px 22px 0px 22px;
	margin-left: 0rem;
	height: 44px !important;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.001s ease;
}


/*.ql-toolbar {
	display: none;
}
.ql-toolbar.ql-snow + .ql-container.ql-snow {
	border: none;
}*/

:deep(.tree-drag-item) {
  cursor: move;
  border-radius: 6px;
  transition: background-color 250ms ease-in-out;
}

:deep(.tree-drag-over-before::before),
:deep(.tree-drag-over-after::after) {
  content: '';
  position: absolute;
  left: -25%;
  right: -25%;
  height: 2px;
  background-color: gray;
  border-radius: 6px;
}

:deep(.tree-drag-over-before::before) {
  top: 0;
}

:deep(.tree-drag-over-after::after) {
  bottom: 0;
}
</style>
